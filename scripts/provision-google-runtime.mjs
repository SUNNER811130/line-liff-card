#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import defaultCardSeed from '../src/content/cards/default.seed.json' with { type: 'json' };
import { getGoogleAccessToken, loadOptionalEnvFile } from './lib/google-auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const SECRETS_FILE = path.join(ROOT_DIR, '.env.google.provision.local');
const PRODUCTION_ENV_FILE = path.join(ROOT_DIR, '.env.production');
const LOCAL_ENV_FILE = path.join(ROOT_DIR, '.env.local');
const BACKEND_DIR = path.join(ROOT_DIR, 'gas', 'bound-card-backend');
const TMP_CLASP_DIR = path.join(os.tmpdir(), 'line-liff-card-bound-runtime-clasp');
const UPDATED_BY = `codex-provision-${new Date().toISOString().slice(0, 10)}`;
const RUNTIME_SHEET_NAME = 'cards_runtime';
const DEFAULT_SPREADSHEET_TITLE = 'LIFF Card Runtime Clean';
const DEFAULT_DRIVE_FOLDER_NAME = 'LIFF Card Uploads Clean';
const ADMIN_TTL_SECONDS = '3600';

const randomSecret = (size = 32) =>
  Array.from(crypto.getRandomValues(new Uint8Array(size)), (value) => value.toString(16).padStart(2, '0')).join('');

const formatEnv = (values) =>
  `${Object.entries(values)
    .map(([key, value]) => `${key}=${String(value ?? '')}`)
    .join('\n')}\n`;

const readFileText = async (filePath) => fs.readFile(filePath, 'utf8');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureProvisionSecretsFile() {
  const current = await loadOptionalEnvFile(SECRETS_FILE);
  if (current.ADMIN_WRITE_SECRET && current.ADMIN_SESSION_SECRET && current.ADMIN_SESSION_TTL_SECONDS) {
    return current;
  }

  const next = {
    GOOGLE_CLIENT_AUTH: current.GOOGLE_CLIENT_AUTH || 'clasprc',
    ADMIN_WRITE_SECRET: current.ADMIN_WRITE_SECRET || randomSecret(24),
    ADMIN_SESSION_SECRET: current.ADMIN_SESSION_SECRET || randomSecret(32),
    ADMIN_SESSION_TTL_SECONDS: current.ADMIN_SESSION_TTL_SECONDS || ADMIN_TTL_SECONDS,
  };

  await fs.writeFile(SECRETS_FILE, formatEnv(next), { mode: 0o600 });
  return next;
}

async function googleApiRequest(accessToken, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const details = payload?.error?.message || payload?.error_description || text || `HTTP ${response.status}`;
    throw new Error(`${url}: ${details}`);
  }

  return payload;
}

async function createSpreadsheet(accessToken, title) {
  return googleApiRequest(accessToken, 'https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: RUNTIME_SHEET_NAME } }],
    }),
  });
}

async function updateSheetValues(accessToken, spreadsheetId, range, values) {
  const encodedRange = encodeURIComponent(range);
  return googleApiRequest(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values,
      }),
    },
  );
}

async function createDriveFolder(accessToken, name) {
  return googleApiRequest(accessToken, 'https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
}

async function createBoundScript(accessToken, title, parentId) {
  return googleApiRequest(accessToken, 'https://script.googleapis.com/v1/projects', {
    method: 'POST',
    body: JSON.stringify({
      title,
      parentId,
    }),
  });
}

async function updateScriptContent(accessToken, scriptId) {
  const [codeSource, manifestSource] = await Promise.all([
    readFileText(path.join(BACKEND_DIR, 'Code.gs')),
    readFileText(path.join(BACKEND_DIR, 'appsscript.json')),
  ]);

  return googleApiRequest(accessToken, `https://script.googleapis.com/v1/projects/${scriptId}/content`, {
    method: 'PUT',
    body: JSON.stringify({
      files: [
        {
          name: 'Code',
          type: 'SERVER_JS',
          source: codeSource,
        },
        {
          name: 'appsscript',
          type: 'JSON',
          source: manifestSource,
        },
      ],
    }),
  });
}

async function createVersion(accessToken, scriptId, description) {
  return googleApiRequest(accessToken, `https://script.googleapis.com/v1/projects/${scriptId}/versions`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
}

async function createDeployment(accessToken, scriptId, versionNumber, description) {
  return googleApiRequest(accessToken, `https://script.googleapis.com/v1/projects/${scriptId}/deployments`, {
    method: 'POST',
    body: JSON.stringify({
      versionNumber,
      manifestFileName: 'appsscript',
      description,
    }),
  });
}

async function ensureTempClaspConfig(scriptId) {
  await fs.mkdir(TMP_CLASP_DIR, { recursive: true });
  await fs.writeFile(
    path.join(TMP_CLASP_DIR, '.clasp.json'),
    JSON.stringify(
      {
        scriptId,
        rootDir: path.relative(TMP_CLASP_DIR, BACKEND_DIR),
      },
      null,
      2,
    ),
  );
}

async function runClaspSetup(scriptId, params) {
  await ensureTempClaspConfig(scriptId);

  await new Promise((resolve, reject) => {
    const child = spawn('clasp', ['run', 'setupScriptProperties', '--params', JSON.stringify([params])], {
      cwd: TMP_CLASP_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `clasp run failed with exit code ${code}.`));
    });
  });
}

async function updateEnvFile(filePath, execUrl) {
  const current = await loadOptionalEnvFile(filePath);
  const next = {
    ...current,
    VITE_CARD_API_BASE_URL: execUrl,
  };
  await fs.writeFile(filePath, formatEnv(next));
}

async function main() {
  const accessToken = await getGoogleAccessToken();
  const provisionEnv = await ensureProvisionSecretsFile();
  const spreadsheetTitle = process.env.GOOGLE_RUNTIME_SPREADSHEET_TITLE || DEFAULT_SPREADSHEET_TITLE;
  const driveFolderName = process.env.GOOGLE_RUNTIME_DRIVE_FOLDER_NAME || DEFAULT_DRIVE_FOLDER_NAME;

  const spreadsheet = await createSpreadsheet(accessToken, spreadsheetTitle);
  await updateSheetValues(accessToken, spreadsheet.spreadsheetId, `${RUNTIME_SHEET_NAME}!A1:D2`, [
    ['slug', 'config_json', 'updated_at', 'updated_by'],
    ['default', JSON.stringify(defaultCardSeed), new Date().toISOString(), UPDATED_BY],
  ]);

  const folder = await createDriveFolder(accessToken, driveFolderName);
  const scriptProject = await createBoundScript(accessToken, spreadsheetTitle, spreadsheet.spreadsheetId);
  await updateScriptContent(accessToken, scriptProject.scriptId);

  await sleep(3000);
  await runClaspSetup(scriptProject.scriptId, {
    adminWriteSecret: provisionEnv.ADMIN_WRITE_SECRET,
    adminSessionSecret: provisionEnv.ADMIN_SESSION_SECRET,
    adminSessionTtlSeconds: provisionEnv.ADMIN_SESSION_TTL_SECONDS || ADMIN_TTL_SECONDS,
    driveUploadFolderId: folder.id,
    seedConfig: defaultCardSeed,
    slug: 'default',
    updatedBy: UPDATED_BY,
  });

  const version = await createVersion(accessToken, scriptProject.scriptId, UPDATED_BY);
  const deployment = await createDeployment(accessToken, scriptProject.scriptId, version.versionNumber, UPDATED_BY);
  const execUrl = `https://script.google.com/macros/s/${deployment.deploymentId}/exec`;

  await Promise.all([updateEnvFile(PRODUCTION_ENV_FILE, execUrl), updateEnvFile(LOCAL_ENV_FILE, execUrl)]);

  const result = {
    spreadsheet: {
      title: spreadsheet.properties?.title || spreadsheetTitle,
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetUrl: spreadsheet.spreadsheetUrl,
    },
    driveFolder: {
      name: folder.name || driveFolderName,
      folderId: folder.id,
      folderUrl: `https://drive.google.com/drive/folders/${folder.id}`,
    },
    boundScript: {
      scriptId: scriptProject.scriptId,
    },
    deployment: {
      deploymentId: deployment.deploymentId,
      versionNumber: version.versionNumber,
      execUrl,
    },
    scriptProperties: [
      'ADMIN_WRITE_SECRET',
      'ADMIN_SESSION_SECRET',
      'ADMIN_SESSION_TTL_SECONDS',
      'DRIVE_UPLOAD_FOLDER_ID',
    ],
    updatedBy: UPDATED_BY,
    secretsFile: SECRETS_FILE,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

await main();

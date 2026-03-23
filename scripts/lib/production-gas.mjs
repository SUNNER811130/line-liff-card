import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getGoogleAccessToken, loadOptionalEnvFile } from './google-auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..', '..');
export const BACKEND_DIR = path.join(ROOT_DIR, 'gas', 'bound-card-backend');
export const GOOGLE_ENV_FILE = path.join(ROOT_DIR, '.env.google.provision.local');
export const LOCAL_ENV_FILE = path.join(ROOT_DIR, '.env.local');
export const PRODUCTION_ENV_FILE = path.join(ROOT_DIR, '.env.production');
export const MANIFEST_FILE_NAME = 'appsscript';
export const DEFAULT_RELEASE_LABEL = `codex-gas-release-${new Date().toISOString()}`;

const readFileText = (filePath) => fs.readFile(filePath, 'utf8');

async function loadClaspConfig() {
  const raw = await readFileText(path.join(ROOT_DIR, '.clasp.json'));
  return JSON.parse(raw);
}

export const createReleaseLabel = (prefix = 'codex-gas-release') =>
  `${prefix}-${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`;

export async function loadProductionEnv() {
  const [googleEnv, localEnv, productionEnv] = await Promise.all([
    loadOptionalEnvFile(GOOGLE_ENV_FILE),
    loadOptionalEnvFile(LOCAL_ENV_FILE),
    loadOptionalEnvFile(PRODUCTION_ENV_FILE),
  ]);

  return {
    ...googleEnv,
    ...localEnv,
    ...productionEnv,
  };
}

export function resolveExecUrl(explicitExecUrl, env = {}) {
  const candidate = String(explicitExecUrl || env.VITE_CARD_API_BASE_URL || '').trim();
  if (!candidate) {
    throw new Error('Missing production exec URL. Pass it explicitly or set VITE_CARD_API_BASE_URL.');
  }
  return candidate;
}

export function extractDeploymentId(execUrl) {
  const url = new URL(execUrl);
  const match = url.pathname.match(/\/macros\/s\/([^/]+)\/exec$/);
  if (!match) {
    throw new Error(`Cannot parse deploymentId from exec URL: ${execUrl}`);
  }
  return match[1];
}

export async function getAccessToken() {
  const env = await loadOptionalEnvFile(GOOGLE_ENV_FILE);
  return getGoogleAccessToken({ env });
}

export async function googleApiRequest(accessToken, url, options = {}) {
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? 20000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };
  const response = await fetch(url, {
    ...options,
    signal,
    headers,
    body:
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const detail = payload?.error?.message || payload?.error_description || text || `HTTP ${response.status}`;
    throw new Error(`${url}: ${detail}`);
  }
  return payload;
}

export async function fetchBackendJson(url, init = {}) {
  const timeoutSignal = AbortSignal.timeout(init.timeoutMs ?? 20000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(url, {
    ...init,
    signal,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || payload.message || `Request failed (${response.status}) for ${url}`);
  }
  return payload;
}

export async function fetchHealth(execUrl) {
  const url = new URL(execUrl);
  url.searchParams.set('action', 'health');
  return fetchBackendJson(url.toString());
}

export async function fetchCard(execUrl, slug) {
  const url = new URL(execUrl);
  url.searchParams.set('action', 'getCard');
  url.searchParams.set('slug', slug);
  return fetchBackendJson(url.toString());
}

export async function listCards(execUrl) {
  const url = new URL(execUrl);
  url.searchParams.set('action', 'listCards');
  return fetchBackendJson(url.toString());
}

export async function getProject(accessToken, scriptId) {
  return googleApiRequest(accessToken, `https://script.googleapis.com/v1/projects/${scriptId}`);
}

export async function getProjectContent(accessToken, scriptId) {
  return googleApiRequest(accessToken, `https://script.googleapis.com/v1/projects/${scriptId}/content`);
}

export async function listDeployments(accessToken, scriptId) {
  const payload = await googleApiRequest(accessToken, `https://script.googleapis.com/v1/projects/${scriptId}/deployments`);
  return payload.deployments || [];
}

export async function listVersions(accessToken, scriptId) {
  const payload = await googleApiRequest(accessToken, `https://script.googleapis.com/v1/projects/${scriptId}/versions`);
  return payload.versions || [];
}

export async function updateScriptContent(accessToken, scriptId) {
  const [codeSource, manifestSource] = await Promise.all([
    readFileText(path.join(BACKEND_DIR, 'Code.gs')),
    readFileText(path.join(BACKEND_DIR, 'appsscript.json')),
  ]);

  return googleApiRequest(accessToken, `https://script.googleapis.com/v1/projects/${scriptId}/content`, {
    method: 'PUT',
    body: {
      files: [
        {
          name: 'Code',
          type: 'SERVER_JS',
          source: codeSource,
        },
        {
          name: MANIFEST_FILE_NAME,
          type: 'JSON',
          source: manifestSource,
        },
      ],
    },
  });
}

export async function createVersion(accessToken, scriptId, description = DEFAULT_RELEASE_LABEL) {
  return googleApiRequest(accessToken, `https://script.googleapis.com/v1/projects/${scriptId}/versions`, {
    method: 'POST',
    body: { description },
  });
}

export async function updateDeployment(accessToken, scriptId, deploymentId, versionNumber, description) {
  return googleApiRequest(
    accessToken,
    `https://script.googleapis.com/v1/projects/${scriptId}/deployments/${deploymentId}`,
    {
      method: 'PUT',
      body: {
        deploymentConfig: {
          scriptId,
          versionNumber,
          manifestFileName: MANIFEST_FILE_NAME,
          description,
        },
      },
    },
  );
}

export async function detectProductionTarget(explicitExecUrl) {
  const env = await loadProductionEnv();
  const execUrl = resolveExecUrl(explicitExecUrl, env);
  let health = null;
  let scriptId = '';
  try {
    health = await fetchHealth(execUrl);
    scriptId = String(health.boundScriptId || '').trim();
  } catch (error) {
    const claspConfig = await loadClaspConfig();
    scriptId = String(claspConfig.scriptId || '').trim();
    if (!scriptId) {
      throw error;
    }
  }

  if (!scriptId) {
    throw new Error(`Unable to resolve production scriptId for ${execUrl}`);
  }

  const accessToken = await getAccessToken();
  const [project, deployments, versions, content] = await Promise.all([
    getProject(accessToken, scriptId),
    listDeployments(accessToken, scriptId),
    listVersions(accessToken, scriptId),
    getProjectContent(accessToken, scriptId),
  ]);
  const deploymentId = extractDeploymentId(execUrl);
  const currentDeployment = deployments.find((deployment) => deployment.deploymentId === deploymentId) || null;
  const codeFile = (content.files || []).find((file) => file.name === 'Code');
  const source = String(codeFile?.source || '');

  return {
    env,
    execUrl,
    deploymentId,
    scriptId,
    accessToken,
    health,
    project,
    deployments,
    versions,
    currentDeployment,
    contentFlags: {
      supportsListCards: source.includes("listCards: 'listCards'"),
      supportsPublishSnapshot: source.includes("publishSnapshot: 'publishSnapshot'"),
      supportsUploadImage: source.includes("uploadImage: 'uploadImage'"),
    },
  };
}

export async function runClaspPush(scriptId) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'line-liff-card-prod-gas-'));
  const claspConfigPath = path.join(tempDir, '.clasp.json');
  await fs.writeFile(
    claspConfigPath,
    JSON.stringify(
      {
        scriptId,
        rootDir: BACKEND_DIR,
        scriptExtensions: ['.js', '.gs'],
        htmlExtensions: ['.html'],
        jsonExtensions: ['.json'],
        filePushOrder: [],
        skipSubdirectories: false,
      },
      null,
      2,
    ),
  );

  return new Promise((resolve, reject) => {
    const child = spawn('clasp', ['push', '-f'], {
      cwd: tempDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', async (code) => {
      await fs.rm(tempDir, { recursive: true, force: true });
      if (code === 0) {
        resolve({
          ok: true,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
        return;
      }
      reject(new Error(stderr.trim() || stdout.trim() || `clasp push failed with exit code ${code}.`));
    });
  });
}

export async function runClaspDeploy(scriptId, versionNumber, description, deploymentId = '') {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'line-liff-card-prod-gas-'));
  await fs.writeFile(
    path.join(tempDir, '.clasp.json'),
    JSON.stringify(
      {
        scriptId,
        rootDir: BACKEND_DIR,
        scriptExtensions: ['.js', '.gs'],
        htmlExtensions: ['.html'],
        jsonExtensions: ['.json'],
        filePushOrder: [],
        skipSubdirectories: false,
      },
      null,
      2,
    ),
  );

  const args = ['deploy', '-V', String(versionNumber), '-d', description];
  if (deploymentId) {
    args.push('-i', deploymentId);
  }

  return new Promise((resolve, reject) => {
    const child = spawn('clasp', args, {
      cwd: tempDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', async (code) => {
      await fs.rm(tempDir, { recursive: true, force: true });
      if (code === 0) {
        const match = stdout.match(/Deployed\s+(\S+)\s+@(\d+)/);
        resolve({
          ok: true,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          deploymentId: match?.[1] || deploymentId,
          versionNumber: match?.[2] ? Number(match[2]) : versionNumber,
        });
        return;
      }
      reject(new Error(stderr.trim() || stdout.trim() || `clasp deploy failed with exit code ${code}.`));
    });
  });
}

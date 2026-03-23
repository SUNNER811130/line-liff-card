#!/usr/bin/env node

import { createReleaseLabel, detectProductionTarget } from './lib/production-gas.mjs';
import { spawn } from 'node:child_process';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runCurlJsonOnce = (url, { method = 'GET', headers = {}, body = '' } = {}) =>
  new Promise((resolve, reject) => {
    const args = ['-sS', '-L', '--max-time', '20'];
    if (method !== 'GET') {
      args.push('-X', method);
      args.push('--post301', '--post302', '--post303');
    }
    Object.entries(headers).forEach(([key, value]) => {
      args.push('-H', `${key}: ${value}`);
    });
    if (body) {
      args.push('--data', body);
    }
    args.push(url);

    const child = spawn('curl', args, {
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
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `curl failed with exit code ${code}.`));
        return;
      }
      try {
        const payload = stdout ? JSON.parse(stdout) : {};
        if (payload.ok === false) {
          reject(new Error(payload.error || 'Backend returned ok=false.'));
          return;
        }
        resolve(payload);
      } catch (error) {
        reject(new Error(`Failed to parse backend JSON: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  });

async function runCurlJson(url, options = {}, retries = 4) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await runCurlJsonOnce(url, options);
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

async function main() {
  const [, , execUrlArg] = process.argv;
  const target = await detectProductionTarget(execUrlArg);
  const execUrl = target.execUrl;
  const env = target.env;
  const adminWriteSecret = String(env.ADMIN_WRITE_SECRET || '').trim();
  if (!adminWriteSecret) {
    throw new Error('Missing ADMIN_WRITE_SECRET in .env.google.provision.local.');
  }

  const postJson = async (payload) =>
    runCurlJson(execUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: JSON.stringify(payload),
    });
  const getJson = async (action, slug = '') => {
    const url = new URL(execUrl);
    url.searchParams.set('action', action);
    if (slug) {
      url.searchParams.set('slug', slug);
    }
    return runCurlJson(url.toString());
  };

  const cloneJson = (value) => JSON.parse(JSON.stringify(value));
  const releaseTag = createReleaseLabel('verify');

  const health = target.health ?? (await getJson('health'));
  const originalLive = await getJson('getCard', 'default');
  const session = await postJson({
    action: 'createAdminSession',
    secret: adminWriteSecret,
  });
  const verifySession = await postJson({
    action: 'verifyAdminSession',
    adminSession: session.adminSession,
  });

  const liveBefore = cloneJson(originalLive.config);
  const snapshotBase = cloneJson(liveBefore);
  snapshotBase.content.headline = `${liveBefore.content.headline} [${releaseTag}:snapshot]`;
  snapshotBase.version = {
    kind: 'live',
    liveSlug: 'default',
    sourceSlug: 'default',
  };

  const savedLive = await postJson({
    action: 'saveCard',
    slug: 'default',
    adminSession: session.adminSession,
    updatedBy: 'codex-verify-live-before-snapshot',
    config: snapshotBase,
  });

  const upload = await postJson({
    action: 'uploadImage',
    adminSession: session.adminSession,
    slug: 'default',
    field: 'ogImage',
    fileName: 'codex-verify-pixel.png',
    mimeType: 'image/png',
    base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sZ/H2wAAAAASUVORK5CYII=',
  });

  const snapshotPublished = await postJson({
    action: 'publishSnapshot',
    slug: 'default',
    adminSession: session.adminSession,
    updatedBy: 'codex-verify-snapshot',
    config: savedLive.config,
  });

  const cardsAfterPublish = await getJson('listCards');
  const snapshotListRecord = (cardsAfterPublish.cards || []).find((card) => card.slug === snapshotPublished.slug) || null;
  const snapshotCardBeforeLiveChange = await getJson('getCard', snapshotPublished.slug);

  const liveAfterPublish = cloneJson(savedLive.config);
  liveAfterPublish.content.headline = `${liveBefore.content.headline} [${releaseTag}:live]`;
  liveAfterPublish.version = {
    kind: 'live',
    liveSlug: 'default',
    sourceSlug: 'default',
  };

  const savedLiveAfterSnapshot = await postJson({
    action: 'saveCard',
    slug: 'default',
    adminSession: session.adminSession,
    updatedBy: 'codex-verify-live-after-snapshot',
    config: liveAfterPublish,
  });

  const currentLive = await getJson('getCard', 'default');
  const snapshotCardAfterLiveChange = await getJson('getCard', snapshotPublished.slug);

  await postJson({
    action: 'saveCard',
    slug: 'default',
    adminSession: session.adminSession,
    updatedBy: 'codex-verify-restore-live',
    config: liveBefore,
  });

  const restoredLive = await getJson('getCard', 'default');
  const snapshotPermalink = new URL(`card/${snapshotPublished.slug}/`, env.VITE_SITE_URL).toString();
  const livePermalink = new URL('card/default/', env.VITE_SITE_URL).toString();

  if (snapshotCardBeforeLiveChange.config.content.headline !== snapshotBase.content.headline) {
    throw new Error('Snapshot content mismatch immediately after publish.');
  }

  if (snapshotCardAfterLiveChange.config.content.headline !== snapshotBase.content.headline) {
    throw new Error('Snapshot changed after live/default update.');
  }

  if (currentLive.config.content.headline !== liveAfterPublish.content.headline) {
    throw new Error('Live/default did not update after snapshot publish.');
  }

  if (restoredLive.config.content.headline !== liveBefore.content.headline) {
    throw new Error('Live/default restore failed after verification.');
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        execUrl,
        scriptId: target.scriptId,
        deploymentId: target.deploymentId,
        health: {
          sheetAccessible: health.sheetAccessible === true,
          driveFolderReady: health.driveFolderReady === true,
          sheetName: health.sheetName,
        },
        admin: {
          sessionValid: verifySession.valid === true,
        },
        live: {
          savedBeforeSnapshot: savedLive.slug === 'default',
          savedAfterSnapshot: savedLiveAfterSnapshot.slug === 'default',
          restored: restoredLive.slug === 'default',
        },
        upload: {
          ok: Boolean(upload.fileId && upload.publicUrl),
          fileId: upload.fileId,
        },
        snapshot: {
          published: snapshotPublished.slug,
          versionId: snapshotPublished.versionId,
          listed: Boolean(snapshotListRecord),
          permalink: snapshotPermalink,
          immutableAfterLiveChange:
            snapshotCardBeforeLiveChange.config.content.headline === snapshotCardAfterLiveChange.config.content.headline,
        },
        share: {
          livePermalink,
          snapshotPermalink,
          liveTracksLatest:
            currentLive.config.content.headline === liveAfterPublish.content.headline &&
            restoredLive.config.content.headline === liveBefore.content.headline,
          snapshotFixed:
            snapshotCardAfterLiveChange.config.content.headline === snapshotCardBeforeLiveChange.config.content.headline,
        },
      },
      null,
      2,
    )}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

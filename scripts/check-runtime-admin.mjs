#!/usr/bin/env node

import { loadOptionalEnvFile } from './lib/google-auth.mjs';
import defaultCardSeed from '../src/content/cards/default.seed.json' with { type: 'json' };

const [, , baseUrlArg] = process.argv;
const env = {
  ...(await loadOptionalEnvFile('.env.google.provision.local')),
  ...(await loadOptionalEnvFile('.env.local')),
  ...(await loadOptionalEnvFile('.env.production')),
};

const baseUrl = baseUrlArg || env.VITE_CARD_API_BASE_URL;
if (!baseUrl) {
  throw new Error('Missing exec URL. Pass it as the first argument or set VITE_CARD_API_BASE_URL.');
}

const adminWriteSecret = env.ADMIN_WRITE_SECRET?.trim();
if (!adminWriteSecret) {
  throw new Error('Missing ADMIN_WRITE_SECRET in .env.google.provision.local.');
}

const readJson = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

const requestJson = async (url, init) => {
  const response = await fetch(url, init);
  const payload = await readJson(response);
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }
  return payload;
};

const health = await requestJson(`${baseUrl}?action=health`, { method: 'GET' });
const card = await requestJson(`${baseUrl}?action=getCard&slug=default`, { method: 'GET' });
const session = await requestJson(baseUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'createAdminSession',
    secret: adminWriteSecret,
  }),
});
const verify = await requestJson(baseUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'verifyAdminSession',
    adminSession: session.adminSession,
  }),
});
const save = await requestJson(baseUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'saveCard',
    slug: 'default',
    adminSession: session.adminSession,
    updatedBy: 'codex-admin-check',
    config: defaultCardSeed,
  }),
});
const upload = await requestJson(baseUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'uploadImage',
    adminSession: session.adminSession,
    slug: 'default',
    field: 'photo',
    fileName: 'pixel.png',
    mimeType: 'image/png',
    base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sZ/H2wAAAAASUVORK5CYII=',
  }),
});

process.stdout.write(
  `${JSON.stringify(
    {
      health: {
        sheetAccessible: health.sheetAccessible,
        driveFolderReady: health.driveFolderReady,
        sheetName: health.sheetName,
      },
      getCard: {
        slug: card.slug,
        source: card.source,
      },
      verifyAdminSession: verify.valid,
      saveCard: {
        slug: save.slug,
        updatedBy: save.updatedBy,
      },
      uploadImage: {
        fileId: upload.fileId,
        publicUrl: upload.publicUrl,
      },
    },
    null,
    2,
  )}\n`,
);

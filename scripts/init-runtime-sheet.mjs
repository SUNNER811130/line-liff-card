#!/usr/bin/env node

import { buildInitBackendPayload, parseBackendJson } from './lib/gas-backend.mjs';
import { getDefaultSeedConfig } from './lib/runtime-sheet.mjs';

const args = process.argv.slice(2);

const readFlag = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
};

const hasFlag = (flag) => args.includes(flag);

const baseUrl = readFlag('--base-url') || process.env.VITE_CARD_API_BASE_URL || '';
const writeToken = readFlag('--write-token') || process.env.CARD_ADMIN_WRITE_TOKEN || '';
const updatedBy = readFlag('--updated-by') || process.env.CARD_ADMIN_UPDATED_BY || 'init-runtime-sheet.mjs';
const slug = readFlag('--slug') || 'default';
const force = hasFlag('--force');
const seedDefault = !hasFlag('--no-seed-default');

if (!baseUrl.trim()) {
  console.error('Missing --base-url or VITE_CARD_API_BASE_URL.');
  process.exit(1);
}

if (!writeToken.trim()) {
  console.error('Missing --write-token or CARD_ADMIN_WRITE_TOKEN.');
  process.exit(1);
}

const payload = buildInitBackendPayload({
  writeToken,
  updatedBy,
  slug,
  force,
  seedDefault,
  config: getDefaultSeedConfig(),
});

const response = await fetch(baseUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});

const json = await parseBackendJson(response);

if (!response.ok || json.ok === false) {
  console.error(json.error || `Init backend failed with HTTP ${response.status}.`);
  process.exit(1);
}

console.log(JSON.stringify(json, null, 2));

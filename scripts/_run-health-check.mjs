#!/usr/bin/env node

import { buildGetCardUrl, buildHealthUrl, parseBackendJson } from './lib/gas-backend.mjs';

const [, , baseUrl, slug = 'default'] = process.argv;

if (!baseUrl) {
  console.error('Missing baseUrl argument.');
  process.exit(1);
}

const healthResponse = await fetch(buildHealthUrl(baseUrl));
const healthJson = await parseBackendJson(healthResponse);
if (!healthResponse.ok || healthJson.ok === false) {
  console.error(healthJson.error || `Health check failed with HTTP ${healthResponse.status}.`);
  process.exit(1);
}

console.log(JSON.stringify({ action: 'health', result: healthJson }, null, 2));

const cardResponse = await fetch(buildGetCardUrl(baseUrl, slug));
const cardJson = await parseBackendJson(cardResponse);
if (!cardResponse.ok || cardJson.ok === false) {
  console.error(cardJson.error || `getCard failed with HTTP ${cardResponse.status}.`);
  process.exit(1);
}

console.log(JSON.stringify({ action: 'getCard', result: cardJson }, null, 2));

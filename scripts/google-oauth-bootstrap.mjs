#!/usr/bin/env node

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GOOGLE_CLIENT_AUTH_USER_OAUTH,
  loadOptionalEnvFile,
  loadUserOAuthCredentials,
} from './lib/google-auth.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const SECRETS_FILE = path.join(ROOT_DIR, '.env.google.provision.local');
const CALLBACK_PATH = '/oauth2/callback';
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.deployments',
  'https://www.googleapis.com/auth/spreadsheets',
];

const envFromFile = await loadOptionalEnvFile(SECRETS_FILE);
const mergedEnv = {
  ...envFromFile,
  ...process.env,
};

if (String(mergedEnv.GOOGLE_CLIENT_AUTH ?? '').trim() !== GOOGLE_CLIENT_AUTH_USER_OAUTH) {
  throw new Error(
    `Set GOOGLE_CLIENT_AUTH=${GOOGLE_CLIENT_AUTH_USER_OAUTH} in .env.google.provision.local before running this helper.`,
  );
}

const clientId = String(mergedEnv.GOOGLE_OAUTH_CLIENT_ID ?? '').trim();
const clientSecret = String(mergedEnv.GOOGLE_OAUTH_CLIENT_SECRET ?? '').trim();

if (!clientId || !clientSecret) {
  throw new Error('Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env.google.provision.local.');
}

const state = randomUUID();

const exchangeCodeForTokens = async (code, redirectUri) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || `Token exchange failed (${response.status}).`);
  }

  return payload;
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname !== CALLBACK_PATH) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found.\n');
      return;
    }

    if (url.searchParams.get('state') !== state) {
      throw new Error('OAuth state mismatch.');
    }

    const oauthError = url.searchParams.get('error');
    if (oauthError) {
      throw new Error(`Google OAuth returned error: ${oauthError}`);
    }

    const code = url.searchParams.get('code');
    if (!code) {
      throw new Error('Missing OAuth authorization code.');
    }

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to resolve local OAuth callback port.');
    }

    const redirectUri = `http://127.0.0.1:${address.port}${CALLBACK_PATH}`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const nextEnv = {
      ...envFromFile,
      GOOGLE_CLIENT_AUTH: GOOGLE_CLIENT_AUTH_USER_OAUTH,
      GOOGLE_OAUTH_CLIENT_ID: clientId,
      GOOGLE_OAUTH_CLIENT_SECRET: clientSecret,
      GOOGLE_OAUTH_REFRESH_TOKEN: String(tokens.refresh_token ?? '').trim(),
    };

    loadUserOAuthCredentials(nextEnv);

    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('OAuth bootstrap succeeded. Refresh token is printed in this terminal.\n');

    process.stdout.write('\nAdd or update these values in .env.google.provision.local:\n');
    process.stdout.write(`GOOGLE_CLIENT_AUTH=${GOOGLE_CLIENT_AUTH_USER_OAUTH}\n`);
    process.stdout.write(`GOOGLE_OAUTH_CLIENT_ID=${clientId}\n`);
    process.stdout.write(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}\n`);
    process.stdout.write(`GOOGLE_OAUTH_REFRESH_TOKEN=${nextEnv.GOOGLE_OAUTH_REFRESH_TOKEN}\n`);

    server.close();
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`${error instanceof Error ? error.message : String(error)}\n`);
    server.close();
    process.exitCode = 1;
  }
});

await new Promise((resolve, reject) => {
  server.on('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

const address = server.address();
if (!address || typeof address === 'string') {
  throw new Error('Unable to start local OAuth callback server.');
}

const redirectUri = `http://127.0.0.1:${address.port}${CALLBACK_PATH}`;
const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authorizeUrl.searchParams.set('client_id', clientId);
authorizeUrl.searchParams.set('redirect_uri', redirectUri);
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('access_type', 'offline');
authorizeUrl.searchParams.set('prompt', 'consent');
authorizeUrl.searchParams.set('scope', OAUTH_SCOPES.join(' '));
authorizeUrl.searchParams.set('state', state);

process.stdout.write('Open this URL in your browser, then complete Google OAuth:\n');
process.stdout.write(`${authorizeUrl.toString()}\n\n`);
process.stdout.write(`Authorized redirect URI for this run: ${redirectUri}\n`);
process.stdout.write(
  'Keep this terminal open until Google redirects back to the local callback and the refresh token is printed.\n',
);

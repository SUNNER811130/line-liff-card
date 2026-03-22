import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const CLASP_CREDENTIALS_PATH = path.join(os.homedir(), '.clasprc.json');
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const parseDotEnv = (content) =>
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((result, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        return result;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const value =
        rawValue.startsWith('"') && rawValue.endsWith('"')
          ? rawValue.slice(1, -1)
          : rawValue.startsWith("'") && rawValue.endsWith("'")
            ? rawValue.slice(1, -1)
            : rawValue;
      result[key] = value;
      return result;
    }, {});

export async function loadOptionalEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return parseDotEnv(content);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export async function loadClaspCredentials() {
  const raw = await fs.readFile(CLASP_CREDENTIALS_PATH, 'utf8');
  const data = JSON.parse(raw);
  const tokenSet = data?.tokens?.default;

  if (!tokenSet?.client_id || !tokenSet?.client_secret || !tokenSet?.refresh_token) {
    throw new Error('Missing Google OAuth credentials in ~/.clasprc.json.');
  }

  return {
    clientId: tokenSet.client_id,
    clientSecret: tokenSet.client_secret,
    refreshToken: tokenSet.refresh_token,
    accessToken: tokenSet.access_token,
  };
}

export async function refreshGoogleAccessToken(credentials) {
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: credentials.refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || `Failed to refresh Google access token (${response.status}).`);
  }

  return payload.access_token;
}

export async function getGoogleAccessToken() {
  const credentials = await loadClaspCredentials();
  return refreshGoogleAccessToken(credentials);
}

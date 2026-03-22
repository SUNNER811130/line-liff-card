import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

type GoogleAuthModule = {
  GOOGLE_CLIENT_AUTH_CLASPRC: string;
  GOOGLE_CLIENT_AUTH_USER_OAUTH: string;
  getClaspCredentialsPath: () => string;
  loadGoogleAuthCredentials: (input?: { env?: Record<string, string> }) => Promise<{
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    authSource: string;
  }>;
  loadUserOAuthCredentials: (env?: Record<string, string>) => {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    authSource: string;
  };
};

let googleAuth: GoogleAuthModule;
let tempHomeDir: string;
const originalHome = process.env.HOME;

beforeAll(async () => {
  const googleAuthModulePath = new URL('../../scripts/lib/google-auth.mjs', import.meta.url).pathname;
  googleAuth = (await import(googleAuthModulePath)) as GoogleAuthModule;
});

beforeEach(async () => {
  tempHomeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'line-liff-card-google-auth-'));
  process.env.HOME = tempHomeDir;
});

afterAll(() => {
  process.env.HOME = originalHome;
});

describe('google auth resolution', () => {
  it('prefers explicit user-owned OAuth credentials from env', async () => {
    const credentials = await googleAuth.loadGoogleAuthCredentials({
      env: {
        GOOGLE_CLIENT_AUTH: googleAuth.GOOGLE_CLIENT_AUTH_USER_OAUTH,
        GOOGLE_OAUTH_CLIENT_ID: 'user-client-id',
        GOOGLE_OAUTH_CLIENT_SECRET: 'user-client-secret',
        GOOGLE_OAUTH_REFRESH_TOKEN: 'user-refresh-token',
      },
    });

    expect(credentials).toEqual({
      clientId: 'user-client-id',
      clientSecret: 'user-client-secret',
      refreshToken: 'user-refresh-token',
      authSource: googleAuth.GOOGLE_CLIENT_AUTH_USER_OAUTH,
    });
  });

  it('falls back to ~/.clasprc.json when user-owned OAuth is not selected', async () => {
    await fs.writeFile(
      path.join(tempHomeDir, '.clasprc.json'),
      JSON.stringify({
        tokens: {
          default: {
            client_id: 'clasp-client-id',
            client_secret: 'clasp-client-secret',
            refresh_token: 'clasp-refresh-token',
            access_token: 'clasp-access-token',
          },
        },
      }),
    );

    const credentials = await googleAuth.loadGoogleAuthCredentials({ env: {} });

    expect(credentials).toEqual({
      clientId: 'clasp-client-id',
      clientSecret: 'clasp-client-secret',
      refreshToken: 'clasp-refresh-token',
      accessToken: 'clasp-access-token',
      authSource: googleAuth.getClaspCredentialsPath(),
    });
  });

  it('fails fast when user-owned OAuth mode is selected but required keys are missing', () => {
    expect(() =>
      googleAuth.loadUserOAuthCredentials({
        GOOGLE_CLIENT_AUTH: googleAuth.GOOGLE_CLIENT_AUTH_USER_OAUTH,
        GOOGLE_OAUTH_CLIENT_ID: 'user-client-id',
        GOOGLE_OAUTH_CLIENT_SECRET: '',
        GOOGLE_OAUTH_REFRESH_TOKEN: '',
      }),
    ).toThrow('Missing user-owned Google OAuth env keys');
  });
});

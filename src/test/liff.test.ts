import { beforeEach, describe, expect, it, vi } from 'vitest';

const { liffCoreMock, pluginUseMock } = vi.hoisted(() => ({
  liffCoreMock: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
    isInClient: vi.fn(() => false),
    isLoggedIn: vi.fn(() => true),
    login: vi.fn(),
    isApiAvailable: vi.fn(() => true),
    shareTargetPicker: vi.fn(),
    permanentLink: {
      createUrlBy: vi.fn(async (url: string) => `https://liff.line.me/mock?target=${encodeURIComponent(url)}`),
    },
  },
  pluginUseMock: vi.fn(),
}));

class MockModule {
  install() {
    pluginUseMock();
    return {};
  }
}

vi.mock('@line/liff/core', () => ({
  default: liffCoreMock,
}));

vi.mock('@line/liff/is-in-client', () => ({
  default: MockModule,
}));

vi.mock('@line/liff/is-logged-in', () => ({
  default: MockModule,
}));

vi.mock('@line/liff/login', () => ({
  default: MockModule,
}));

vi.mock('@line/liff/is-api-available', () => ({
  default: MockModule,
}));

vi.mock('@line/liff/share-target-picker', () => ({
  default: MockModule,
}));

vi.mock('@line/liff/permanent-link', () => ({
  default: MockModule,
}));

describe('liff helpers', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/line-liff-card/card/default/');
  });

  it('creates a permanent link when current url is under endpoint', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);

    const { __resetLiffForTests, createPermanentLink } = await import('../lib/liff');
    __resetLiffForTests();

    await expect(createPermanentLink()).resolves.toContain('https://liff.line.me/mock');
    expect(liffCoreMock.use).toHaveBeenCalled();
    expect(liffCoreMock.permanentLink.createUrlBy).toHaveBeenCalledWith(
      `${window.location.origin}/line-liff-card/card/default/`,
    );
  });

  it('throws a clear error when target url is outside endpoint', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);

    const { __resetLiffForTests, createPermanentLink } = await import('../lib/liff');
    __resetLiffForTests();

    await expect(createPermanentLink(`${window.location.origin}/outside-page`)).rejects.toThrow(
      '不在 LIFF Endpoint URL 範圍內',
    );
  });

  it('falls back to LIFF entry url when permanent link creation fails', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    liffCoreMock.permanentLink.createUrlBy.mockRejectedValueOnce(new Error('boom'));

    const { __resetLiffForTests, buildShareTargetUrl } = await import('../lib/liff');
    __resetLiffForTests();

    await expect(buildShareTargetUrl()).resolves.toBe('https://liff.line.me/test-liff-id');
  });

  it('falls back before creating permanent link when page is outside endpoint', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    window.history.replaceState({}, '', '/outside-page');

    const { __resetLiffForTests, buildShareTargetUrl } = await import('../lib/liff');
    __resetLiffForTests();

    await expect(buildShareTargetUrl()).resolves.toBe('https://liff.line.me/test-liff-id');
    expect(liffCoreMock.permanentLink.createUrlBy).not.toHaveBeenCalled();
  });

  it('keeps login redirectUri stable after LIFF redirect params are removed', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    liffCoreMock.isLoggedIn.mockReturnValue(false);
    window.history.replaceState(
      {},
      '',
      '/line-liff-card/card/default/?liff.state=foo&access_token=bar#connect',
    );

    const { __resetLiffForTests, ensureLogin } = await import('../lib/liff');
    __resetLiffForTests();

    await expect(ensureLogin()).resolves.toBe(false);
    expect(liffCoreMock.login).toHaveBeenCalledWith({
      redirectUri: `${window.location.origin}/line-liff-card/card/default/#connect`,
    });
    expect(window.location.search).toBe('');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { liffMock } = vi.hoisted(() => ({
  liffMock: {
    init: vi.fn().mockResolvedValue(undefined),
    isInClient: vi.fn(() => false),
    isLoggedIn: vi.fn(() => true),
    login: vi.fn(),
    isApiAvailable: vi.fn(() => true),
    permanentLink: {
      createUrlBy: vi.fn(async (url: string) => `https://liff.line.me/mock?target=${encodeURIComponent(url)}`),
    },
    shareTargetPicker: vi.fn(),
  },
}));

vi.mock('@line/liff', () => ({
  default: liffMock,
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
    expect(liffMock.permanentLink.createUrlBy).toHaveBeenCalledWith(
      `${window.location.origin}/line-liff-card/card/default/`,
    );
  });

  it('throws a clear error when target url is outside endpoint', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);

    const { __resetLiffForTests, createPermanentLink } = await import('../lib/liff');
    __resetLiffForTests();

    await expect(createPermanentLink(`${window.location.origin}/outside-page`)).rejects.toThrow(
      '目前頁面不在 LIFF Endpoint URL 範圍內',
    );
  });
});

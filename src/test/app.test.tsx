import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { App } from '../App';
import { __resetLiffForTests } from '../lib/liff';
import * as liff from '../lib/liff';
import * as runtime from '../lib/runtime';

const { liffCoreMock } = vi.hoisted(() => ({
  liffCoreMock: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
    isInClient: vi.fn(() => false),
    isLoggedIn: vi.fn(() => true),
    getProfile: vi.fn(async () => ({
      userId: 'u123',
      displayName: 'LINE Test User',
      pictureUrl: 'https://example.test/avatar.jpg',
    })),
    login: vi.fn(),
    isApiAvailable: vi.fn(() => false),
    shareTargetPicker: vi.fn(),
    permanentLink: {
      createUrlBy: vi.fn(async (url: string) => `https://liff.line.me/mock?target=${encodeURIComponent(url)}`),
    },
  },
}));

class MockModule {
  install() {
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

vi.mock('@line/liff/get-profile', () => ({
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

describe('App', () => {
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    window.sessionStorage.clear();
    vi.stubEnv('VITE_LIFF_ID', '');
    vi.stubEnv('VITE_SITE_URL', '');
    liffCoreMock.use.mockReturnThis();
    liffCoreMock.init.mockResolvedValue(undefined);
    liffCoreMock.isInClient.mockReturnValue(false);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.isApiAvailable.mockReturnValue(false);
    navigateSpy = vi.spyOn(runtime, 'navigateToUrl').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    __resetLiffForTests();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    navigateSpy.mockRestore();
  });

  it('renders the formal card on the home page', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('關係護理室')).toBeInTheDocument();
      expect(screen.getByText('蘇彥宇 Sunner')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '分享此電子名片給 LINE 好友' })).toBeInTheDocument();
    });
  });

  it('renders the admin page on admin route', async () => {
    window.history.replaceState({}, '', '/admin/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('電子名片管理')).toBeInTheDocument();
      expect(screen.getByText('身分與主視覺')).toBeInTheDocument();
      expect(screen.getByDisplayValue('關係護理室')).toBeInTheDocument();
    });
  });

  it('renders the formal card for its slug route', async () => {
    window.history.replaceState({}, '', '/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('讓相愛更簡單，讓相處更容易').length).toBeGreaterThan(0);
      expect(screen.getByText('關係教練｜AI 自動化講師')).toBeInTheDocument();
    });
  });

  it('maps the legacy demo slug back to the formal card', async () => {
    window.history.replaceState({}, '', '/card/demo-consultant/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('讓相愛更簡單，讓相處更容易').length).toBeGreaterThan(0);
      expect(screen.queryByText('Demo Consultant Studio')).not.toBeInTheDocument();
    });
  });

  it('shows fallback when slug does not exist', () => {
    window.history.replaceState({}, '', '/card/missing-card/');

    render(<App />);

    expect(screen.getByText('找不到這張電子名片')).toBeInTheDocument();
    expect(screen.getByText(/missing-card/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回首頁' })).toHaveAttribute('href', '/');
  });

  it('shows login hint when user is not logged in inside LIFF', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(false);
    window.history.replaceState({}, '', '/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('請先登入 LINE，之後即可直接分享這張電子名片。')).toBeInTheDocument();
    });
  });

  it('shares through shareTargetPicker when available', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.isApiAvailable.mockReturnValue(true);
    liffCoreMock.shareTargetPicker.mockResolvedValue(true);
    window.history.replaceState({}, '', '/card/default/');

    render(<App />);

    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '分享此電子名片給 LINE 好友' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '分享此電子名片給 LINE 好友' }));

    await waitFor(() => {
      expect(liffCoreMock.shareTargetPicker).toHaveBeenCalled();
      expect(screen.getByText('已開啟 LINE 分享視窗。')).toBeInTheDocument();
    });
  });

  it('redirects to LIFF share intent when inside LINE but shareTargetPicker is unavailable', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.isApiAvailable.mockReturnValue(false);
    window.history.replaceState({}, '', '/card/default/');
    const user = userEvent.setup();
    const shareSpy = vi.spyOn(liff, 'shareCard');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '分享此電子名片給 LINE 好友' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '分享此電子名片給 LINE 好友' }));

    expect(shareSpy).not.toHaveBeenCalled();
    expect(runtime.navigateToUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/liff\.line\.me\/test-liff-id\/card\/default\/\?intent=share&intentId=/),
    );
  });

  it('auto-shares the same formal card after LIFF intent handoff is restored', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.isApiAvailable.mockReturnValue(true);
    liffCoreMock.shareTargetPicker.mockResolvedValue(true);
    window.sessionStorage.setItem('line-liff-card:share-intent:pending', 'intent-123');
    window.history.replaceState({}, '', '/card/default/?intent=share&intentId=intent-123');

    render(<App />);

    await waitFor(() => {
      expect(liffCoreMock.shareTargetPicker).toHaveBeenCalled();
      expect(screen.getByText('已開啟 LINE 分享視窗。')).toBeInTheDocument();
    });

    expect(window.location.search).toBe('');
    expect(window.sessionStorage.getItem('line-liff-card:share-intent:pending')).toBeNull();
  });

  it('uses text-share fallback outside LINE when LIFF handoff is not available', async () => {
    window.history.replaceState({}, '', '/card/default/');
    const user = userEvent.setup();
    const shareSpy = vi.spyOn(liff, 'shareCard');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '分享此電子名片給 LINE 好友' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '分享此電子名片給 LINE 好友' }));

    expect(shareSpy).not.toHaveBeenCalled();
    expect(runtime.navigateToUrl).toHaveBeenCalledWith(expect.stringContaining('https://line.me/R/msg/text/?'));
  });

  it('keeps legacy demo slug sharing the formal default card content', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.isApiAvailable.mockReturnValue(false);
    window.history.replaceState({}, '', '/card/demo-consultant/');
    const user = userEvent.setup();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '分享此電子名片給 LINE 好友' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '分享此電子名片給 LINE 好友' }));

    expect(runtime.navigateToUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/liff\.line\.me\/test-liff-id\/card\/default\/\?intent=share&intentId=/),
    );
  });
});

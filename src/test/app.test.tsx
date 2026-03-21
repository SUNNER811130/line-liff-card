import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { App } from '../App';
import { __resetLiffForTests } from '../lib/liff';
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
    vi.stubEnv('VITE_LIFF_ID', '');
    vi.stubEnv('VITE_SITE_URL', '');
    liffCoreMock.use.mockReturnThis();
    liffCoreMock.init.mockResolvedValue(undefined);
    liffCoreMock.isInClient.mockReturnValue(false);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.getProfile.mockResolvedValue({
      userId: 'u123',
      displayName: 'LINE Test User',
      pictureUrl: 'https://example.test/avatar.jpg',
    });
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

  it('renders the card collection on the home page', () => {
    render(<App />);

    expect(screen.getByText('多名片版本首頁')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /開啟名片/ })).toHaveLength(2);
    expect(screen.getAllByText(/\/card\/default\//).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\/card\/demo-consultant\//).length).toBeGreaterThan(0);
  });

  it('renders the default card for its slug route', async () => {
    window.history.replaceState({}, '', '/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Client Success Office').length).toBeGreaterThan(0);
      expect(screen.getByText('適合顧問、業務、客戶成功與 B2B 溝通的正式展示頁')).toBeInTheDocument();
    });
  });

  it('renders different content for demo-consultant slug', async () => {
    window.history.replaceState({}, '', '/card/demo-consultant/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Demo Consultant Studio').length).toBeGreaterThan(0);
      expect(screen.getByText('以更精緻的留白、排版節奏與品牌感呈現個人服務價值')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '加入顧問窗口' })).toBeInTheDocument();
    });
  });

  it('shows fallback when slug does not exist', () => {
    window.history.replaceState({}, '', '/card/missing-card/');

    render(<App />);

    expect(screen.getByText('找不到這張名片')).toBeInTheDocument();
    expect(screen.getByText(/missing-card/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回名片列表' })).toHaveAttribute('href', '/');
  });

  it('shows LIFF ready state on a card slug route in external mode', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/card/default/`);
    window.history.replaceState({}, '', '/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('LIFF-READY')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: '在 LINE 中開啟名片' }).length).toBeGreaterThan(0);
    });
  });

  it('shows share-ready state for demo-consultant slug', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/card/demo-consultant/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.isApiAvailable.mockReturnValue(true);
    window.history.replaceState({}, '', '/card/demo-consultant/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('SHARE-AVAILABLE')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: '分享好友' }).length).toBeGreaterThan(0);
    });
  });

  it('shows profile personalization when LINE profile is available', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/card/default/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    window.history.replaceState({}, '', '/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('LINE Test User')).toBeInTheDocument();
      expect(screen.getByText('目前登入 LINE 使用者')).toBeInTheDocument();
    });
  });

  it('shows concise profile hint when profile is unavailable', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/card/default/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.getProfile.mockRejectedValueOnce(new Error('forbidden'));
    window.history.replaceState({}, '', '/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/目前無法取得 LINE 個人資料/)).toBeInTheDocument();
    });
  });

  it('shows login hint when user is not logged in', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/card/default/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(false);
    window.history.replaceState({}, '', '/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '請先登入 LINE' })).toBeInTheDocument();
      expect(screen.getByText(/尚未登入 LINE，登入後才會顯示個人化資訊/)).toBeInTheDocument();
    });
  });

  it('opens card-specific LIFF url from the list when running inside LIFF', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/`);
    liffCoreMock.isInClient.mockReturnValue(true);

    render(<App />);

    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByText('Open via LIFF URL')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('link', { name: '開啟名片 Client Success Office' }));

    expect(runtime.navigateToUrl).toHaveBeenCalledWith('https://liff.line.me/test-liff-id/card/default/');
  });

  it('keeps web route hrefs on the list in browser mode', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Open via Web URL')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: '開啟名片 Client Success Office' })).toHaveAttribute('href', '/card/default/');
    expect(screen.getByRole('link', { name: '開啟名片 Demo Consultant Studio' })).toHaveAttribute(
      'href',
      '/card/demo-consultant/',
    );
  });

  it('renders distinct theme classes for both cards', async () => {
    window.history.replaceState({}, '', '/card/default/');
    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(document.querySelector('[data-theme="corporate"]')).not.toBeNull();
    });

    window.history.replaceState({}, '', '/card/demo-consultant/');
    rerender(<App />);

    await waitFor(() => {
      expect(document.querySelector('[data-theme="consultant"]')).not.toBeNull();
    });
  });
});

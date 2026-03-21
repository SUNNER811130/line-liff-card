import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../App';
import { __resetLiffForTests } from '../lib/liff';

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
  });

  afterEach(() => {
    cleanup();
    __resetLiffForTests();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('renders the card collection on the home page', () => {
    render(<App />);

    expect(screen.getByText('多名片版本首頁')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '開啟名片' })).toHaveLength(2);
    expect(screen.getByText('/card/default/')).toBeInTheDocument();
    expect(screen.getByText('/card/demo-consultant/')).toBeInTheDocument();
  });

  it('renders the default card for its slug route', async () => {
    window.history.replaceState({}, '', '/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Client Success Office').length).toBeGreaterThan(0);
      expect(screen.getByText('適合對外展示、分享與導流的商務電子名片預設版型')).toBeInTheDocument();
    });
  });

  it('renders different content for demo-consultant slug', async () => {
    window.history.replaceState({}, '', '/card/demo-consultant/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Demo Consultant Studio').length).toBeGreaterThan(0);
      expect(screen.getByText('面向專案開發、顧問服務與企業合作的展示型電子名片')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '加入 LINE 顧問窗口' })).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: '開啟 LINE 版名片' })).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: '分享好友' })).toBeInTheDocument();
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
});

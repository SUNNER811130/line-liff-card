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
  });

  afterEach(() => {
    cleanup();
    __resetLiffForTests();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('renders three action buttons', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: '加入 LINE / 品牌入口' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '服務介紹' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '預約洽詢' })).toBeInTheDocument();
  });

  it('renders in web-preview mode without LIFF_ID', () => {
    render(<App />);
    expect(screen.getByText('WEB-PREVIEW')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LIFF 尚未設定' })).toBeDisabled();
  });

  it('shows open-in-line action on github pages style external mode', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    window.history.replaceState({}, '', '/line-liff-card/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('LIFF-READY')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '開啟 LINE 版名片' })).toBeInTheDocument();
    });
  });

  it('keeps the main action visible when shareTargetPicker is unavailable', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.isApiAvailable.mockReturnValue(false);
    window.history.replaceState({}, '', '/line-liff-card/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('IN-LIFF')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '目前環境不支援分享' })).toBeDisabled();
    });
  });

  it('shows login action when LIFF is in client but user is not logged in', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(false);
    liffCoreMock.isApiAvailable.mockReturnValue(false);
    window.history.replaceState({}, '', '/line-liff-card/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '請先登入 LINE' })).toBeInTheDocument();
    });
  });

  it('falls back clearly when current url is outside endpoint', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    window.history.replaceState({}, '', '/outside-page');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('WEB-PREVIEW')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '前往正式展示入口' })).toBeInTheDocument();
      expect(screen.getByText(/不在 LIFF Endpoint URL 範圍內/)).toBeInTheDocument();
    });
  });

  it('shows share-ready badge when shareTargetPicker is available', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    liffCoreMock.isInClient.mockReturnValue(true);
    liffCoreMock.isLoggedIn.mockReturnValue(true);
    liffCoreMock.isApiAvailable.mockReturnValue(true);
    window.history.replaceState({}, '', '/line-liff-card/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('SHARE-AVAILABLE')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '分享好友' })).toBeInTheDocument();
    });
  });

  it('protects placeholder links with same-site fallbacks', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: '加入 LINE / 品牌入口' })).toHaveAttribute('href', 'http://localhost:3000/#connect');
    expect(screen.getByRole('link', { name: '服務介紹' })).toHaveAttribute('href', 'http://localhost:3000/#overview');
    expect(screen.getByRole('link', { name: '預約洽詢' })).toHaveAttribute('href', 'http://localhost:3000/#booking');
  });
});

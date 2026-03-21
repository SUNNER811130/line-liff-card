import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../App';
import { __resetLiffForTests } from '../lib/liff';

const { liffMock } = vi.hoisted(() => ({
  liffMock: {
    init: vi.fn().mockResolvedValue(undefined),
    isInClient: vi.fn(() => false),
    isLoggedIn: vi.fn(() => true),
    login: vi.fn(),
    isApiAvailable: vi.fn(() => false),
    permanentLink: {
      createUrlBy: vi.fn(async (url: string) => `https://liff.line.me/mock?target=${encodeURIComponent(url)}`),
    },
    shareTargetPicker: vi.fn(),
  },
}));

vi.mock('@line/liff', () => ({
  default: liffMock,
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

    expect(screen.getByRole('link', { name: '加入 LINE' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '官方網站' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '預約洽詢' })).toBeInTheDocument();
  });

  it('renders in web-preview mode without LIFF_ID', () => {
    vi.stubEnv('VITE_LIFF_ID', '');
    render(<App />);
    expect(screen.getByText('WEB-PREVIEW')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LIFF 尚未設定' })).toBeDisabled();
  });

  it('shows open-in-line action when LIFF is configured outside LINE', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    window.history.replaceState({}, '', '/line-liff-card/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('LIFF-READY')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '請用 LINE 開啟' })).toBeInTheDocument();
    });
  });

  it('keeps the main action visible when shareTargetPicker is unavailable', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubEnv('VITE_SITE_URL', `${window.location.origin}/line-liff-card/`);
    liffMock.isInClient.mockReturnValue(true);
    liffMock.isLoggedIn.mockReturnValue(true);
    liffMock.isApiAvailable.mockReturnValue(false);
    window.history.replaceState({}, '', '/line-liff-card/card/default/');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('IN-LIFF')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '目前環境不支援分享' })).toBeDisabled();
    });
  });
});

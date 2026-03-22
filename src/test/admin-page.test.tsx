import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from '../components/AdminPage';
import { cloneCardConfig } from '../content/cards/draft';
import { defaultCard } from '../content/cards/default';

const createJsonResponse = (payload: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });

describe('AdminPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads official remote data into the current draft', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const remoteConfig = cloneCardConfig(defaultCard);
    remoteConfig.content.fullName = '正式遠端名片';
    remoteConfig.photo.src = 'https://cdn.example.test/official-hero.jpg';
    remoteConfig.seo.ogImage = 'https://cdn.example.test/official-og.jpg';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          ok: true,
          slug: 'default',
          config: remoteConfig,
        }),
      ),
    );

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '載入正式資料' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('正式遠端名片')).toBeInTheDocument();
      expect(screen.getByText('已載入 slug「default」的正式後台資料。')).toBeInTheDocument();
    });
  });

  it('saves the current draft to the official remote backend', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        slug: 'default',
        updatedAt: '2026-03-22T10:00:00.000Z',
        config: defaultCard,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('姓名'));
    await user.type(screen.getByLabelText('姓名'), '新的正式姓名');
    await user.type(screen.getByLabelText('Write Token'), 'token-123');
    await user.click(screen.getByRole('button', { name: '儲存到正式後台' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.test/card-api',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"saveCard"'),
        }),
      );
      expect(screen.getByText('正式後台資料已儲存成功。更新時間：2026-03-22T10:00:00.000Z')).toBeInTheDocument();
    });
  });

  it('shows clear errors when API url or token is missing', async () => {
    render(<AdminPage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '載入正式資料' }));
    expect(screen.getByText('請先輸入正式後台 API Base URL，才能載入正式資料。')).toBeInTheDocument();

    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    cleanup();
    render(<AdminPage />);

    await user.click(screen.getByRole('button', { name: '儲存到正式後台' }));
    expect(screen.getByText('請先輸入 write token，才能儲存正式資料。')).toBeInTheDocument();
  });

  it('keeps local draft note separate from remote save status', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          ok: true,
          slug: 'default',
          config: defaultCard,
        }),
      ),
    );

    render(<AdminPage />);

    expect(
      screen.getByText('本地草稿會自動存到此瀏覽器 localStorage；只有按「儲存到正式後台」才會更新正式電子名片內容。'),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Write Token'), 'token-123');
    await user.click(screen.getByRole('button', { name: '儲存到正式後台' }));

    await waitFor(() => {
      expect(screen.getByText('正式後台資料已儲存成功。')).toBeInTheDocument();
    });

    expect(
      screen.getByText('本地草稿會自動存到此瀏覽器 localStorage；只有按「儲存到正式後台」才會更新正式電子名片內容。'),
    ).toBeInTheDocument();
  });
});

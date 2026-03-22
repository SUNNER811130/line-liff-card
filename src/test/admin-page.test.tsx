import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from '../components/AdminPage';
import { cloneCardConfig, getAdminDraftStorageKey } from '../content/cards/draft';
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
    vi.spyOn(window, 'confirm').mockReturnValue(true);
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
      expect(screen.getByText('API URL 狀態：已載入 env 內的正式後台 URL')).toBeInTheDocument();
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
      expect(screen.getByText('最近成功儲存：2026-03-22T10:00:00.000Z')).toBeInTheDocument();
    });
  });

  it('shows clear errors when API url or token is missing', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', '');
    render(<AdminPage />);

    let user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '載入正式資料' }));
    expect(screen.getByText('請先輸入正式後台 API Base URL，才能載入正式資料。')).toBeInTheDocument();

    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    cleanup();
    render(<AdminPage />);

    user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '儲存到正式後台' }));
    expect(screen.getByText('請先輸入 write token，才能儲存正式資料。')).toBeInTheDocument();
  });

  it('keeps local draft note visible after remote save', async () => {
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

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Write Token'), 'token-123');
    await user.click(screen.getByRole('button', { name: '儲存到正式後台' }));

    await waitFor(() => {
      expect(screen.getByText('正式後台資料已儲存成功。')).toBeInTheDocument();
    });

    expect(screen.getByText('已完成正式儲存；目前畫面與最新正式資料一致。')).toBeInTheDocument();
    expect(screen.getByText(/草稿儲存鍵：line-liff-card\.admin-draft:/)).toBeInTheDocument();
  });

  it('shows token persistence state clearly', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    render(<AdminPage />);

    const user = userEvent.setup();
    expect(screen.getByText('Token 狀態：尚未輸入 write token')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Write Token'), 'token-xyz');
    expect(screen.getByText('Token 狀態：write token 已輸入，但關閉頁面後不會保留')).toBeInTheDocument();

    await user.click(screen.getByLabelText('只在 sessionStorage 暫存 token'));
    expect(screen.getByText('Token 狀態：write token 已輸入，且只暫存在目前 sessionStorage')).toBeInTheDocument();
  });

  it('shows dirty state and clears it after a successful save', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const remoteConfig = cloneCardConfig(defaultCard);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: true,
          slug: 'default',
          config: remoteConfig,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          ok: true,
          slug: 'default',
          updatedAt: '2026-03-22T12:00:00.000Z',
          updatedBy: 'admin@test',
          config: {
            ...remoteConfig,
            content: {
              ...remoteConfig.content,
              fullName: '已儲存姓名',
            },
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '載入正式資料' }));
    await waitFor(() => {
      expect(screen.getByText('目前沒有未儲存變更。')).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText('姓名'));
    await user.type(screen.getByLabelText('姓名'), '已儲存姓名');
    expect(screen.getByText('尚未儲存變更，離開頁面前會提示。')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Write Token'), 'token-123');
    await user.click(screen.getByRole('button', { name: '儲存到正式後台' }));

    await waitFor(() => {
      expect(screen.getByText('目前沒有未儲存變更。')).toBeInTheDocument();
      expect(screen.getByText(/最近成功儲存：2026-03-22T12:00:00.000Z｜儲存者：admin@test/)).toBeInTheDocument();
    });
  });

  it('offers restore or discard when a card-specific local draft exists', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const localDraft = cloneCardConfig(defaultCard);
    localDraft.content.fullName = '本地草稿姓名';
    window.localStorage.setItem(getAdminDraftStorageKey(localDraft.id), JSON.stringify(localDraft));

    const remoteConfig = cloneCardConfig(defaultCard);
    remoteConfig.content.fullName = '正式後台姓名';
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

    expect(screen.getByText('偵測到未送出的瀏覽器草稿')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '套用本地草稿' }));
    expect(screen.getByDisplayValue('本地草稿姓名')).toBeInTheDocument();

    cleanup();
    render(<AdminPage />);
    await user.click(screen.getByRole('button', { name: '放棄草稿並載入正式資料' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('正式後台姓名')).toBeInTheDocument();
    });
    expect(screen.queryByText('偵測到未送出的瀏覽器草稿')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(getAdminDraftStorageKey(localDraft.id))).toContain('正式後台姓名');
  });

  it('confirms before replacing dirty content with a remote reload', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({
          ok: true,
          slug: 'default',
          config: defaultCard,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '載入正式資料' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    await user.type(screen.getByLabelText('姓名'), 'X');
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await user.click(screen.getByRole('button', { name: '重新載入正式資料' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('尚未儲存變更，離開頁面前會提示。')).toBeInTheDocument();
  });
});

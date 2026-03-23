import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from '../components/AdminPage';
import { cloneCardConfig, getAdminDraftStorageKey } from '../content/cards/draft';
import { defaultCard } from '../content/cards/default';

vi.mock('../lib/image-upload', () => ({
  prepareImageUpload: vi.fn(async (file: File) => ({
    fileName: file.name,
    mimeType: file.type || 'image/png',
    base64Data: 'cHJlcGFyZWQ=',
    previewUrl: 'data:image/png;base64,cHJlcGFyZWQ=',
  })),
}));

const createJsonResponse = (payload: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });

const buildFetchMock = (remoteConfig?: typeof defaultCard) =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (init?.method === 'POST') {
      const payload = JSON.parse(String(init.body || '{}')) as { action?: string; config?: unknown };

      if (payload.action === 'createAdminSession') {
        return createJsonResponse({
          ok: true,
          adminSession: 'session-123',
          expiresAt: '2026-03-22T12:00:00.000Z',
        });
      }

      if (payload.action === 'verifyAdminSession') {
        return createJsonResponse({
          ok: true,
          valid: true,
          expiresAt: '2026-03-22T12:00:00.000Z',
        });
      }

      if (payload.action === 'uploadImage') {
        return createJsonResponse({
          ok: true,
          fileId: 'drive-file-123',
          publicUrl: 'https://drive.google.com/thumbnail?id=drive-file-123&sz=w2000',
          viewUrl: 'https://drive.google.com/file/d/drive-file-123/view',
          downloadUrl: 'https://drive.google.com/uc?export=download&id=drive-file-123',
          updatedAt: '2026-03-22T11:00:00.000Z',
          updatedBy: 'admin',
        });
      }

      if (payload.action === 'saveCard') {
        return createJsonResponse({
          ok: true,
          slug: 'default',
          updatedAt: '2026-03-22T10:00:00.000Z',
          updatedBy: 'admin@test',
          config: payload.config,
        });
      }
    }

    if (url.includes('action=getCard')) {
      return createJsonResponse({
        ok: true,
        slug: 'default',
        config: remoteConfig ?? defaultCard,
      });
    }

    return createJsonResponse({ ok: false, error: `Unhandled request: ${url}` }, { status: 500 });
  });

describe('AdminPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('unlocks and auto-loads official remote data', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const remoteConfig = cloneCardConfig(defaultCard);
    remoteConfig.content.fullName = '正式遠端名片';
    vi.stubGlobal('fetch', buildFetchMock(remoteConfig));

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('正式遠端名片')).toBeInTheDocument();
      expect(screen.getByText(/管理員解鎖成功/)).toBeInTheDocument();
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });
  });

  it('uses admin session to save and clears dirty state after success', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const fetchMock = buildFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));
    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText('姓名'));
    await user.type(screen.getByLabelText('姓名'), '新的正式姓名');
    await user.clear(screen.getByLabelText('姓名字級'));
    await user.type(screen.getByLabelText('姓名字級'), '36');
    expect(screen.getByText('尚未儲存變更。重新整理或離開頁面前會提醒。')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Updated By'), 'admin@test');
    await user.click(screen.getByRole('button', { name: '儲存正式名片' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.test/card-api',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
          },
          body: expect.stringContaining('"adminSession":"session-123"'),
        }),
      );
      const saveCall = fetchMock.mock.calls.find(([, init]) => String(init?.body || '').includes('"action":"saveCard"'));
      expect(String(saveCall?.[1]?.body || '')).toContain('"nameFontSize":"36"');
      expect(screen.getByText('目前沒有未儲存變更。')).toBeInTheDocument();
      expect(screen.getByText(/正式名片已儲存。更新時間：2026-03-22T10:00:00.000Z｜更新者：admin@test/)).toBeInTheDocument();
    });
  });

  it('keeps the CMS locked until an admin session exists', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubGlobal('fetch', buildFetchMock());

    render(<AdminPage />);

    expect(screen.getByText('先解鎖，再進入正式內容管理台')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '儲存正式名片' })).not.toBeInTheDocument();
  });

  it('restores an existing session from sessionStorage and auto-loads remote data', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const remoteConfig = cloneCardConfig(defaultCard);
    remoteConfig.content.fullName = 'Session 恢復姓名';
    window.sessionStorage.setItem('line-liff-card.admin-session', 'restored-session');
    window.sessionStorage.setItem('line-liff-card.admin-session-expires-at', '2026-03-22T15:00:00.000Z');
    vi.stubGlobal('fetch', buildFetchMock(remoteConfig));

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Session 恢復姓名')).toBeInTheDocument();
      expect(screen.getByText(/已恢復管理員解鎖/)).toBeInTheDocument();
    });
  });

  it('offers restore or discard when a card-specific local draft exists', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const localDraft = cloneCardConfig(defaultCard);
    localDraft.content.fullName = '本地草稿姓名';
    window.localStorage.setItem(getAdminDraftStorageKey(localDraft.id), JSON.stringify(localDraft));
    window.sessionStorage.setItem('line-liff-card.admin-session', 'restored-session');
    window.sessionStorage.setItem('line-liff-card.admin-session-expires-at', '2026-03-22T15:00:00.000Z');

    const remoteConfig = cloneCardConfig(defaultCard);
    remoteConfig.content.fullName = '正式後台姓名';
    vi.stubGlobal('fetch', buildFetchMock(remoteConfig));

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('偵測到未送出的瀏覽器草稿')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '套用本地草稿' }));
    expect(screen.getByDisplayValue('本地草稿姓名')).toBeInTheDocument();

    cleanup();
    vi.stubGlobal('fetch', buildFetchMock(remoteConfig));
    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByText('偵測到未送出的瀏覽器草稿')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: '放棄草稿並重新載入' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('正式後台姓名')).toBeInTheDocument();
    });
  });

  it('confirms before replacing dirty content with a remote reload', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const fetchMock = buildFetchMock();
    window.sessionStorage.setItem('line-liff-card.admin-session', 'restored-session');
    window.sessionStorage.setItem('line-liff-card.admin-session-expires-at', '2026-03-22T15:00:00.000Z');
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('姓名'), 'X');
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await user.click(screen.getByRole('button', { name: '重新載入正式資料' }));

    expect(screen.getByText('尚未儲存變更。重新整理或離開頁面前會提醒。')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears the current admin session from sessionStorage', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    window.sessionStorage.setItem('line-liff-card.admin-session', 'restored-session');
    window.sessionStorage.setItem('line-liff-card.admin-session-expires-at', '2026-03-22T15:00:00.000Z');
    vi.stubGlobal('fetch', buildFetchMock());

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/已恢復管理員解鎖/)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '清除本次解鎖' }));

    expect(window.sessionStorage.getItem('line-liff-card.admin-session')).toBeNull();
    expect(screen.getByText('已清除本次解鎖。關閉分頁後也會自動失效。')).toBeInTheDocument();
  });

  it('surfaces save failures from the backend', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') {
        const payload = JSON.parse(String(init.body || '{}')) as { action?: string };
        if (payload.action === 'createAdminSession') {
          return createJsonResponse({
            ok: true,
            adminSession: 'session-123',
            expiresAt: '2026-03-22T12:00:00.000Z',
          });
        }

        if (payload.action === 'saveCard') {
          return createJsonResponse({ ok: false, error: '後台儲存失敗。' }, { status: 500 });
        }
      }

      if (url.includes('action=getCard')) {
        return createJsonResponse({ ok: true, slug: 'default', config: defaultCard });
      }

      return createJsonResponse({ ok: false, error: 'Unhandled request' }, { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));
    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Updated By'), 'admin@test');
    await user.click(screen.getByRole('button', { name: '儲存正式名片' }));

    await waitFor(() => {
      expect(screen.getByText('後台儲存失敗。')).toBeInTheDocument();
    });
  });

  it('uploads an image via the GAS Drive flow and writes the public url back to the form', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubGlobal('fetch', buildFetchMock());

    const { container } = render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));
    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '上傳頭像 / 主視覺' }));
    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]'));
    const imageInput = fileInputs[0];
    const file = new File(['image'], 'runtime-hero.png', { type: 'image/png' });
    fireEvent.change(imageInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://drive.google.com/thumbnail?id=drive-file-123&sz=w2000')).toBeInTheDocument();
      expect(screen.getByText(/圖片已上傳到 Google Drive，並同步寫入正式 photo\.src/)).toBeInTheDocument();
      expect(screen.getByText(/建議尺寸：1200 × 900，建議比例：4:3/)).toBeInTheDocument();
      expect(screen.getAllByText(/最近成功儲存：2026-03-22T11:00:00.000Z/).length).toBeGreaterThan(0);
    });
  });

  it('keeps unrelated local edits dirty while marking uploaded image as already synced', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubGlobal('fetch', buildFetchMock());

    const { container } = render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));
    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText('姓名'));
    await user.type(screen.getByLabelText('姓名'), '尚未儲存的新姓名');
    expect(screen.getByText('尚未儲存變更。重新整理或離開頁面前會提醒。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '上傳頭像 / 主視覺' }));
    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]'));
    const imageInput = fileInputs[0];
    const file = new File(['image'], 'runtime-hero.png', { type: 'image/png' });
    fireEvent.change(imageInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://drive.google.com/thumbnail?id=drive-file-123&sz=w2000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('尚未儲存的新姓名')).toBeInTheDocument();
      expect(screen.getByText('尚未儲存變更。重新整理或離開頁面前會提醒。')).toBeInTheDocument();
    });
  });

  it('shows the style settings section with scope badges and editable style fields', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubGlobal('fetch', buildFetchMock());

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));

    await waitFor(() => {
      expect(screen.getByText('樣式設定')).toBeInTheDocument();
      expect(screen.getByLabelText('品牌 / 小標字色')).toBeInTheDocument();
      expect(screen.getAllByText('Flex＋網頁').length).toBeGreaterThan(0);
      expect(screen.getAllByText('僅 Flex').length).toBeGreaterThan(0);
      expect(screen.getAllByText('僅網頁').length).toBeGreaterThan(0);
    });
  });
});

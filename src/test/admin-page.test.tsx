import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from '../components/AdminPage';
import { cloneCardConfig, getAdminDraftStorageKey } from '../content/cards/draft';
import { defaultCard } from '../content/cards/default';

const {
  createCardPermanentLinkForSlugMock,
  shareFlexCardMessageMock,
  initLiffMock,
  isInClientMock,
  isLoggedInMock,
  isShareAvailableMock,
  ensureLoginMock,
  clipboardWriteTextMock,
} = vi.hoisted(() => ({
  createCardPermanentLinkForSlugMock: vi.fn(async (slug: string) => `https://liff.line.me/mock?slug=${encodeURIComponent(slug)}`),
  shareFlexCardMessageMock: vi.fn(async () => true),
  initLiffMock: vi.fn(async () => ({ status: 'ready' as const })),
  isInClientMock: vi.fn(async () => true),
  isLoggedInMock: vi.fn(async () => true),
  isShareAvailableMock: vi.fn(async () => true),
  ensureLoginMock: vi.fn(async () => false),
  clipboardWriteTextMock: vi.fn(async () => undefined),
}));

vi.mock('../lib/share', async () => {
  const actual = await vi.importActual<typeof import('../lib/share')>('../lib/share');
  return {
    ...actual,
    createCardPermanentLinkForSlug: createCardPermanentLinkForSlugMock,
    shareFlexCardMessage: shareFlexCardMessageMock,
  };
});

vi.mock('../lib/liff', async () => {
  const actual = await vi.importActual<typeof import('../lib/liff')>('../lib/liff');
  return {
    ...actual,
    initLiff: initLiffMock,
    isInClient: isInClientMock,
    isLoggedIn: isLoggedInMock,
    isShareAvailable: isShareAvailableMock,
    ensureLogin: ensureLoginMock,
  };
});

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
    const resolvedRemoteConfig = remoteConfig ?? defaultCard;

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

      if (payload.action === 'publishSnapshot') {
        const snapshotConfig = cloneCardConfig((payload.config as typeof defaultCard) ?? resolvedRemoteConfig);
        snapshotConfig.slug = 'default-v-20260322t100000z';
        snapshotConfig.version = {
          kind: 'snapshot',
          versionId: '20260322T100000Z',
          publishedAt: '2026-03-22T10:00:00.000Z',
          liveSlug: 'default',
          sourceSlug: 'default',
        };

        return createJsonResponse({
          ok: true,
          slug: snapshotConfig.slug,
          updatedAt: '2026-03-22T10:00:00.000Z',
          updatedBy: 'admin@test',
          versionId: '20260322T100000Z',
          publishedAt: '2026-03-22T10:00:00.000Z',
          config: snapshotConfig,
        });
      }
    }

    if (url.includes('action=listCards')) {
      return createJsonResponse({
        ok: true,
        cards: [
          {
            slug: 'default',
            isLive: true,
            updatedAt: '2026-03-22T10:00:00.000Z',
            updatedBy: 'admin@test',
          },
        ],
      });
    }

    if (url.includes('action=getCard')) {
      const requestedUrl = new URL(url);
      const slug = requestedUrl.searchParams.get('slug') ?? 'default';
      if (slug !== 'default') {
        const snapshotConfig = cloneCardConfig(resolvedRemoteConfig);
        snapshotConfig.slug = slug;
        snapshotConfig.version = {
          kind: 'snapshot',
          versionId: '20260322T100000Z',
          publishedAt: '2026-03-22T10:00:00.000Z',
          liveSlug: 'default',
          sourceSlug: 'default',
        };
        return createJsonResponse({
          ok: true,
          slug,
          config: snapshotConfig,
        });
      }

      return createJsonResponse({
        ok: true,
        slug: 'default',
        config: resolvedRemoteConfig,
      });
    }

    return createJsonResponse({ ok: false, error: `Unhandled request: ${url}` }, { status: 500 });
  });

describe('AdminPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'open').mockImplementation(() => null);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    });
    createCardPermanentLinkForSlugMock.mockImplementation(
      async (slug: string) => `https://liff.line.me/mock?slug=${encodeURIComponent(slug)}`,
    );
    shareFlexCardMessageMock.mockResolvedValue(true);
    initLiffMock.mockResolvedValue({ status: 'ready' });
    isInClientMock.mockResolvedValue(true);
    isLoggedInMock.mockResolvedValue(true);
    isShareAvailableMock.mockResolvedValue(true);
    ensureLoginMock.mockResolvedValue(false);
    clipboardWriteTextMock.mockResolvedValue(undefined);
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
    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);

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
      const saveCall = fetchMock.mock.calls.find(([, init]) => String(init?.body || '').includes('"action":"publishSnapshot"'));
      expect(String(saveCall?.[1]?.body || '')).toContain('"nameFontSize":"36"');
      expect(screen.getByText('目前沒有未儲存變更。')).toBeInTheDocument();
      expect(screen.getByText('已儲存正式名片，並建立版本「default-v-20260322t100000z」。')).toBeInTheDocument();
      expect(screen.getByText('最近正式版本：default-v-20260322t100000z')).toBeInTheDocument();
    });
  });

  it('writes hero layout controls into the save payload while keeping the preview controls editable', async () => {
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

    await user.selectOptions(screen.getByLabelText('Hero 比例 preset'), '20:13');
    await user.selectOptions(screen.getByLabelText('Hero 顯示模式'), 'contain');
    await user.selectOptions(screen.getByLabelText('Flex Bubble 尺寸'), 'giga');
    fireEvent.change(screen.getByLabelText('圖片縮放'), { target: { value: '135' } });
    fireEvent.change(screen.getByLabelText('圖片焦點水平'), { target: { value: '-20' } });
    fireEvent.change(screen.getByLabelText('圖片焦點垂直'), { target: { value: '40' } });
    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);

    await waitFor(() => {
      const saveCall = fetchMock.mock.calls.find(([, init]) => String(init?.body || '').includes('"action":"publishSnapshot"'));
      const body = String(saveCall?.[1]?.body || '');
      expect(body).toContain('"heroAspectRatio":"20:13"');
      expect(body).toContain('"heroAspectMode":"contain"');
      expect(body).toContain('"flexBubbleSize":"giga"');
      expect(body).toContain('"heroZoom":"135"');
      expect(body).toContain('"heroFocalX":"-20"');
      expect(body).toContain('"heroFocalY":"40"');
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
    expect(fetchMock).toHaveBeenCalledTimes(4);
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

        if (payload.action === 'publishSnapshot') {
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
    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);

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

  it('normalizes preview images for admin cards and falls back share preview to photo.src', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    const remoteConfig = cloneCardConfig(defaultCard);
    remoteConfig.photo.src = 'https://drive.google.com/file/d/drive-photo-123/view?usp=sharing';
    remoteConfig.seo.ogImage = 'https://drive.google.com/file/d/drive-og-456/view?usp=sharing';
    vi.stubGlobal('fetch', buildFetchMock(remoteConfig));

    const { container } = render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));

    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.clear(screen.getByLabelText('OG Image URL'));

    const heroPreview = container.querySelector('.admin-hero-preview-image') as HTMLImageElement | null;
    const flexPreview = container.querySelector('.admin-flex-preview-hero-image') as HTMLImageElement | null;
    const sharePreview = container.querySelector('.admin-image-preview') as HTMLImageElement | null;

    expect(heroPreview?.src).toBe('https://drive.google.com/thumbnail?id=drive-photo-123&sz=w2000');
    expect(flexPreview?.src).toBe('https://drive.google.com/thumbnail?id=drive-photo-123&sz=w2000');
    expect(sharePreview?.src).toBe('https://drive.google.com/thumbnail?id=drive-photo-123&sz=w2000');
    expect(screen.getByText(/預覽來源：photo\.src fallback/)).toBeInTheDocument();
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
      expect(screen.getByLabelText('品牌 / 小標字重')).toBeInTheDocument();
      expect(screen.getAllByText('Flex＋網頁').length).toBeGreaterThan(0);
      expect(screen.getAllByText('僅 Flex').length).toBeGreaterThan(0);
      expect(screen.getAllByText('僅網頁').length).toBeGreaterThan(0);
    });
  });

  it('saves an official card by creating a new immutable version and latest links', async () => {
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

    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);

    await waitFor(() => {
      const publishCall = fetchMock.mock.calls.find(([, init]) => String(init?.body || '').includes('"action":"publishSnapshot"'));
      expect(String(publishCall?.[1]?.body || '')).toContain('"slug":"default"');
      expect(screen.getByText('已儲存正式名片，並建立版本「default-v-20260322t100000z」。')).toBeInTheDocument();
      expect(screen.getByText('最近正式版本：default-v-20260322t100000z')).toBeInTheDocument();
    });
  });

  it('shows latest official actions and keeps them disabled before the first official version exists', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubGlobal('fetch', buildFetchMock());

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));

    await waitFor(() => {
      expect(screen.getByText('最新正式連結')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '直接分享最新正式版本' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '複製最新正式 LIFF 連結' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '複製最新正式網頁連結' })).toBeDisabled();
      expect(screen.getByText('最近正式版本：尚未建立。')).toBeInTheDocument();
    });
  });

  it('copies distinct latest official web and LIFF links after save', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubGlobal('fetch', buildFetchMock());

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));
    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '複製最新正式網頁連結' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: '複製最新正式網頁連結' }));
    await user.click(screen.getByRole('button', { name: '複製最新正式 LIFF 連結' }));
    await user.click(screen.getByRole('button', { name: '複製 LIFF 連結' }));
    await user.click(screen.getByRole('button', { name: '複製網頁連結' }));

    await waitFor(() => {
      expect(screen.getByText('已複製版本 default-v-20260322t100000z 的網頁連結。')).toBeInTheDocument();
    });

    expect(createCardPermanentLinkForSlugMock).toHaveBeenCalledWith('default-v-20260322t100000z');
  });

  it('shares the latest official version and a selected history version with fixed payloads', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubGlobal('fetch', buildFetchMock());

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));
    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '直接分享最新正式版本' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: '直接分享最新正式版本' }));
    await user.click(screen.getByRole('button', { name: '直接分享此版本' }));

    await waitFor(() => {
      expect(shareFlexCardMessageMock).toHaveBeenCalledTimes(2);
    });

    expect(shareFlexCardMessageMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        slug: 'default-v-20260322t100000z',
        version: expect.objectContaining({
          kind: 'snapshot',
        }),
      }),
      'http://localhost:3000/card/default-v-20260322t100000z/',
    );
    expect(shareFlexCardMessageMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        slug: 'default-v-20260322t100000z',
        version: expect.objectContaining({
          kind: 'snapshot',
        }),
      }),
      'http://localhost:3000/card/default-v-20260322t100000z/',
    );
  });

  it('falls back to copying a LIFF link when shareTargetPicker is unavailable', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubGlobal('fetch', buildFetchMock());
    isInClientMock.mockResolvedValue(false);

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));
    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '直接分享最新正式版本' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: '直接分享最新正式版本' }));

    await waitFor(() => {
      expect(createCardPermanentLinkForSlugMock).toHaveBeenCalledWith('default-v-20260322t100000z');
      expect(shareFlexCardMessageMock).not.toHaveBeenCalled();
      expect(screen.getByText(/請在 LINE 中開啟後再傳送 Flex/)).toBeInTheDocument();
    });
  });

  it('loads a history version into the editor without exposing legacy versioning terms in the main UI', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    vi.stubGlobal('fetch', buildFetchMock());

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));
    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '載入到編輯區' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '載入到編輯區' }));

    await waitFor(() => {
      expect(screen.getByText('已把版本「default-v-20260322t100000z」載入編輯區。')).toBeInTheDocument();
      expect(screen.queryByText('切回 live/default')).not.toBeInTheDocument();
      expect(screen.queryByText('發佈為新版本')).not.toBeInTheDocument();
      expect(screen.queryByText(/live\/default 與 snapshot 發佈/)).not.toBeInTheDocument();
    });
  });

  it('creates a new official permalink on every save without overwriting older versions', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');

    let publishCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (init?.method === 'POST') {
        const payload = JSON.parse(String(init.body || '{}')) as { action?: string; config?: typeof defaultCard };

        if (payload.action === 'createAdminSession') {
          return createJsonResponse({
            ok: true,
            adminSession: 'session-123',
            expiresAt: '2026-03-22T12:00:00.000Z',
          });
        }

        if (payload.action === 'publishSnapshot') {
          publishCount += 1;
          const versionId = publishCount === 1 ? '20260322T100000Z' : '20260322T100500Z';
          const publishedAt = publishCount === 1 ? '2026-03-22T10:00:00.000Z' : '2026-03-22T10:05:00.000Z';
          const slug = publishCount === 1 ? 'default-v-20260322t100000z' : 'default-v-20260322t100500z';
          const snapshotConfig = cloneCardConfig((payload.config as typeof defaultCard) ?? defaultCard);
          snapshotConfig.slug = slug;
          snapshotConfig.version = {
            kind: 'snapshot',
            versionId,
            publishedAt,
            liveSlug: 'default',
            sourceSlug: 'default',
          };

          return createJsonResponse({
            ok: true,
            slug,
            updatedAt: publishedAt,
            updatedBy: 'admin@test',
            versionId,
            publishedAt,
            config: snapshotConfig,
          });
        }
      }

      if (url.includes('action=listCards')) {
        const cards: Array<Record<string, unknown>> = [
          {
            slug: 'default',
            isLive: true,
            updatedAt: '2026-03-22T10:05:00.000Z',
            updatedBy: 'admin@test',
          },
        ];

        if (publishCount >= 1) {
          cards.push({
            slug: 'default-v-20260322t100000z',
            isLive: false,
            versionId: '20260322T100000Z',
            publishedAt: '2026-03-22T10:00:00.000Z',
          });
        }
        if (publishCount >= 2) {
          cards.push({
            slug: 'default-v-20260322t100500z',
            isLive: false,
            versionId: '20260322T100500Z',
            publishedAt: '2026-03-22T10:05:00.000Z',
          });
        }

        return createJsonResponse({ ok: true, cards });
      }

      if (url.includes('action=getCard')) {
        const requestedUrl = new URL(url);
        const slug = requestedUrl.searchParams.get('slug') ?? 'default';
        if (slug === 'default-v-20260322t100000z' || slug === 'default-v-20260322t100500z') {
          const snapshotConfig = cloneCardConfig(defaultCard);
          snapshotConfig.slug = slug;
          snapshotConfig.version = {
            kind: 'snapshot',
            versionId: slug === 'default-v-20260322t100000z' ? '20260322T100000Z' : '20260322T100500Z',
            publishedAt: slug === 'default-v-20260322t100000z' ? '2026-03-22T10:00:00.000Z' : '2026-03-22T10:05:00.000Z',
            liveSlug: 'default',
            sourceSlug: 'default',
          };
          return createJsonResponse({ ok: true, slug, config: snapshotConfig });
        }

        return createJsonResponse({
          ok: true,
          slug: 'default',
          config: defaultCard,
        });
      }

      if (url.includes('action=verifyAdminSession')) {
        return createJsonResponse({
          ok: true,
          valid: true,
          expiresAt: '2026-03-22T12:00:00.000Z',
        });
      }

      return createJsonResponse({ ok: false, error: `Unhandled request: ${url}` }, { status: 500 });
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));
    await waitFor(() => {
      expect(screen.getByText('已載入 slug「default」的正式資料。')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);
    await waitFor(() => {
      expect(screen.getByText('最近正式版本：default-v-20260322t100000z')).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: '儲存正式名片' })[0]);
    await waitFor(() => {
      expect(screen.getByText('最近正式版本：default-v-20260322t100500z')).toBeInTheDocument();
      expect(screen.getByText('default-v-20260322t100000z')).toBeInTheDocument();
      expect(screen.getByText('default-v-20260322t100500z')).toBeInTheDocument();
    });
  });

  it('maps preset swatch clicks back to hex input values and warns on invalid hex', async () => {
    vi.stubEnv('VITE_CARD_API_BASE_URL', 'https://example.test/card-api');
    vi.stubGlobal('fetch', buildFetchMock());

    render(<AdminPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('管理員解鎖密碼'), 'secret-123');
    await user.click(screen.getByRole('button', { name: '管理員解鎖' }));

    await waitFor(() => {
      expect(screen.getByText('樣式設定')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '品牌 / 小標字色 設為 金棕' }));
    expect(screen.getByLabelText('品牌 / 小標字色')).toHaveValue('#8e6c46');

    await user.clear(screen.getByLabelText('品牌 / 小標字色'));
    await user.type(screen.getByLabelText('品牌 / 小標字色'), 'oops');
    expect(screen.getByText('請輸入 #RGB 或 #RRGGBB；非法色碼會先以 fallback 顯示。')).toBeInTheDocument();
  });
});

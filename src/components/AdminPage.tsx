import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CardPage } from './CardPage';
import {
  createDefaultCardDraft,
  getAdminDraftStorageKey,
  parseCardConfigJson,
  serializeCardConfig,
} from '../content/cards/draft';
import type { CardActionConfig, CardConfig } from '../content/cards/types';
import { assertCardConfig } from '../content/cards/schema';
import { fetchRemoteCardConfig, getCardApiBaseUrl, saveRemoteCardConfig } from '../lib/card-source';
import { applyBasicSeo } from '../lib/seo';
import { isAllowedLink, isHttpUrl, isRelativeAssetPath, validateCardConfig } from '../lib/card-validation';

const adminTitle = '電子名片管理';
const adminDescription = '編輯電子名片內容、區分本地草稿與正式後台資料，並可載入或儲存正式 CardConfig。';
const ADMIN_TOKEN_SESSION_KEY = 'line-liff-card.admin-write-token';

type StatusTone = 'success' | 'error' | 'info';

type StatusMessage = {
  tone: StatusTone;
  text: string;
};

type DraftRestoreState = {
  key: string;
  config: CardConfig;
} | null;

const uploadImageAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('讀取圖片失敗。'));
    reader.readAsDataURL(file);
  });

const normalizeAction = (action: CardActionConfig, fallbackId: string): CardActionConfig => ({
  id: action.id || fallbackId,
  label: action.label ?? '',
  url: action.url ?? '',
  tone: action.tone ?? 'secondary',
  enabled: action.enabled ?? true,
});

const actionPlaceholderById: Record<string, string> = {
  contact: '#contactUrl',
  services: '#serviceUrl',
};

const fieldDescriptionByLabel: Record<string, string> = {
  姓名: '顯示在卡片主視覺與分享 Flex 標題。',
  職稱: '顯示在姓名下方，幫助對方快速理解你的角色。',
  品牌名稱: '顯示在卡片上方與分享 Flex 品牌列。',
  主標: '顯示在按鈕區上方，通常用來說明主要價值。',
  副標: '顯示在主標下方，補充定位或風格。',
  介紹文字: '顯示於主視覺區塊，適合放服務說明與背景。',
  '正式圖片 URL': '卡片主視覺與 Flex hero image 會使用這個欄位。',
  照片替代文字: '提供無障礙描述，也會作為圖片說明。',
  照片點擊連結: '點擊卡片主圖後導向的位置。',
  'OG Image URL': '社群分享預覽圖，請填可公開存取的圖片網址。',
  分享標題: '非 LINE Flex fallback 分享時會優先使用。',
  分享文字: 'Web Share 或文字分享時會使用。',
  分享按鈕文案: '前台第三顆固定分享按鈕的文字。',
};

const coerceDraft = (draft: CardConfig): CardConfig => {
  return {
    ...draft,
    actions: draft.actions.slice(0, 2).map((action, index) => normalizeAction(action, `action-${index + 1}`)),
    share: {
      ...draft.share,
      buttonLabel: draft.share.buttonLabel?.trim() || '分享此電子名片給 LINE 好友',
    },
  };
};

const normalizeLoadedDraft = (draft: CardConfig): CardConfig => {
  assertCardConfig(draft);
  return coerceDraft(draft);
};

const formatRemoteSaveMessage = (updatedAt?: string, updatedBy?: string): string => {
  const detail = [updatedAt ? `更新時間：${updatedAt}` : '', updatedBy ? `更新者：${updatedBy}` : ''].filter(Boolean).join('｜');
  return detail ? `正式後台資料已儲存成功。${detail}` : '正式後台資料已儲存成功。';
};

const isPlaceholderContent = (value: string): boolean => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return false;
  }

  return (
    trimmed.includes('placeholder') ||
    trimmed.startsWith('#contact') ||
    trimmed.startsWith('#service') ||
    /example\.(com|org|net)/i.test(trimmed)
  );
};

const isImagePreviewable = (value: string): boolean => {
  const trimmed = value.trim();
  return Boolean(trimmed) && (trimmed.startsWith('data:') || trimmed.startsWith('/') || isHttpUrl(trimmed) || isRelativeAssetPath(trimmed));
};

const formatRelativeTimeLabel = (updatedAt?: string, updatedBy?: string): string | null => {
  if (!updatedAt && !updatedBy) {
    return null;
  }

  return [updatedAt ? `最近成功儲存：${updatedAt}` : '', updatedBy ? `儲存者：${updatedBy}` : ''].filter(Boolean).join('｜');
};

const getImageFieldError = (value: string, label: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return `${label} 不能為空。`;
  }

  if (isImagePreviewable(trimmed)) {
    return null;
  }

  return `${label} 格式不正確。`;
};

const getLinkFieldError = (value: string, label: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return isAllowedLink(trimmed) ? null : `${label} 格式不正確。`;
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textareaRows?: number;
  type?: 'text' | 'password';
  hint?: string;
  error?: string | null;
  full?: boolean;
  placeholderFlag?: boolean;
  readOnly?: boolean;
};

function AdminTextField({
  label,
  value,
  onChange,
  placeholder,
  textareaRows,
  type = 'text',
  hint,
  error,
  full = false,
  placeholderFlag = false,
  readOnly = false,
}: FieldProps) {
  return (
    <label className={`admin-field ${full ? 'admin-field-full' : ''}`}>
      <span>
        {label}
        {placeholderFlag ? <strong className="admin-placeholder-flag">測試內容</strong> : null}
      </span>
      <small className="admin-field-description">{hint ?? fieldDescriptionByLabel[label] ?? ''}</small>
      {textareaRows ? (
        <textarea
          aria-label={label}
          rows={textareaRows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      ) : (
        <input
          aria-label={label}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      )}
      {error ? <small className="admin-inline-error">{error}</small> : null}
    </label>
  );
}

export function AdminPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialDraft = createDefaultCardDraft();
  const [draft, setDraft] = useState<CardConfig>(() => initialDraft);
  const [baselineConfig, setBaselineConfig] = useState<CardConfig | null>(null);
  const [draftRestoreState, setDraftRestoreState] = useState<DraftRestoreState>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => getCardApiBaseUrl());
  const [writeToken, setWriteToken] = useState('');
  const [rememberTokenInSession, setRememberTokenInSession] = useState(false);
  const [updatedBy, setUpdatedBy] = useState('');
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [localDraftNote, setLocalDraftNote] = useState<string | null>(
    '本地草稿會自動存到此瀏覽器 localStorage；只有按「儲存到正式後台」才會更新正式電子名片內容。',
  );
  const [remoteStatus, setRemoteStatus] = useState<StatusMessage | null>(
    getCardApiBaseUrl()
      ? {
          tone: 'info',
          text: '已從 env 讀入正式後台 API Base URL。正式資料可載入或儲存到遠端資料來源。',
        }
      : {
          tone: 'info',
          text: '尚未設定正式後台 API Base URL；目前仍可編輯本地草稿與預覽，但不能讀寫正式資料。',
        },
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);
  const [lastSavedBy, setLastSavedBy] = useState<string | undefined>(undefined);

  const draftStorageKey = useMemo(() => getAdminDraftStorageKey(draft.id), [draft.id]);
  const baselineSnapshot = useMemo(() => (baselineConfig ? serializeCardConfig(baselineConfig) : null), [baselineConfig]);
  const draftSnapshot = useMemo(() => serializeCardConfig(draft), [draft]);
  const validationErrors = useMemo(() => validateCardConfig(draft), [draft]);
  const exportJson = draftSnapshot;
  const hasUnsavedChanges = baselineSnapshot !== null && baselineSnapshot !== draftSnapshot;

  const photoFieldError = getImageFieldError(draft.photo.src, '正式圖片 URL');
  const ogImageFieldError = getImageFieldError(draft.seo.ogImage, 'OG Image URL');
  const photoLinkError = getLinkFieldError(draft.photo.link ?? '', '照片點擊連結');
  const shareTextPlaceholder = isPlaceholderContent(draft.share.text ?? '');
  const latestSaveLabel = formatRelativeTimeLabel(lastSavedAt, lastSavedBy);

  const apiUrlStatus = apiBaseUrl.trim()
    ? apiBaseUrl.trim() === getCardApiBaseUrl()
      ? '已載入 env 內的正式後台 URL'
      : '目前使用手動輸入的正式後台 URL'
    : '尚未設定正式後台 URL';
  const tokenStatus = writeToken.trim()
    ? rememberTokenInSession
      ? 'write token 已輸入，且只暫存在目前 sessionStorage'
      : 'write token 已輸入，但關閉頁面後不會保留'
    : '尚未輸入 write token';

  useEffect(() => {
    applyBasicSeo(adminTitle, adminDescription);
  }, []);

  useEffect(() => {
    const sessionToken = window.sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY);
    if (sessionToken) {
      setWriteToken(sessionToken);
      setRememberTokenInSession(true);
    }

    const savedDraft = window.localStorage.getItem(getAdminDraftStorageKey(initialDraft.id));
    if (!savedDraft) {
      return;
    }

    const parsed = parseCardConfigJson(savedDraft);
    if (!parsed.ok) {
      window.localStorage.removeItem(getAdminDraftStorageKey(initialDraft.id));
      return;
    }

    setDraftRestoreState({
      key: getAdminDraftStorageKey(parsed.data.id),
      config: normalizeLoadedDraft(parsed.data),
    });
    setLocalDraftNote('偵測到此卡片尚未送出的本地草稿。你可以套用草稿，或放棄草稿後重新載入正式資料。');
  }, [initialDraft.id]);

  useEffect(() => {
    window.localStorage.setItem(draftStorageKey, exportJson);
  }, [draftStorageKey, exportJson]);

  useEffect(() => {
    if (rememberTokenInSession && writeToken.trim()) {
      window.sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, writeToken);
      return;
    }

    window.sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
  }, [rememberTokenInSession, writeToken]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const patchDraft = (updater: (current: CardConfig) => CardConfig) => {
    setDraft((current) => coerceDraft(updater(current)));
  };

  const updateAction = (index: number, updater: (action: CardActionConfig) => CardActionConfig) => {
    patchDraft((current) => {
      const actions = [...current.actions];
      actions[index] = updater(actions[index] ?? normalizeAction({ id: `action-${index + 1}`, label: '' }, `action-${index + 1}`));
      return {
        ...current,
        actions,
      };
    });
  };

  const applyOfficialConfig = (config: CardConfig, note: string) => {
    const normalized = normalizeLoadedDraft(config);
    setDraft(normalized);
    setBaselineConfig(normalized);
    setDraftRestoreState(null);
    setLocalDraftNote(note);
  };

  const loadRemoteIntoDraft = async (skipDirtyConfirm = false) => {
    if (!apiBaseUrl.trim()) {
      setRemoteStatus({
        tone: 'error',
        text: '請先輸入正式後台 API Base URL，才能載入正式資料。',
      });
      return;
    }

    if (!skipDirtyConfirm && hasUnsavedChanges && !window.confirm('目前有尚未儲存的變更，重新載入正式資料會覆蓋本地內容。要繼續嗎？')) {
      return;
    }

    setRemoteStatus({
      tone: 'info',
      text: '正在載入正式後台資料...',
    });

    try {
      const remoteConfig = await fetchRemoteCardConfig(draft.slug, {
        baseUrl: apiBaseUrl,
      });
      applyOfficialConfig(remoteConfig, '已用正式後台資料覆蓋目前本地草稿；若再修改，仍要按儲存才會更新正式內容。');
      setRemoteStatus({
        tone: 'success',
        text: `已載入 slug「${remoteConfig.slug}」的正式後台資料。`,
      });
    } catch (error) {
      setRemoteStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : '載入正式後台資料失敗。',
      });
    }
  };

  const handleImport = () => {
    const parsed = parseCardConfigJson(importText);
    if (!parsed.ok) {
      setImportFeedback(parsed.error);
      return;
    }

    setDraft(normalizeLoadedDraft(parsed.data));
    setImportFeedback('JSON 已套用到目前本地草稿。若要更新正式資料，仍需另外儲存到正式後台。');
  };

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setExportFeedback('目前本地草稿 JSON 已複製到剪貼簿。');
    } catch {
      setExportFeedback('目前瀏覽器不支援直接複製，請使用下方 JSON 區塊手動保存。');
    }
  };

  const handleReset = () => {
    if (hasUnsavedChanges && !window.confirm('重設會覆蓋目前未儲存內容。要繼續嗎？')) {
      return;
    }

    const nextDraft = createDefaultCardDraft();
    setDraft(nextDraft);
    setImportText('');
    setImportFeedback('已重設回 bundled 預設內容，並覆蓋目前本地草稿。');
    setExportFeedback(null);
    setLocalDraftNote('本地草稿已重設回 bundled 預設內容。這不會修改正式後台資料。');
    window.localStorage.setItem(getAdminDraftStorageKey(nextDraft.id), serializeCardConfig(nextDraft));
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setImportText(text);
    const parsed = parseCardConfigJson(text);
    if (!parsed.ok) {
      setImportFeedback(parsed.error);
      return;
    }

    setDraft(normalizeLoadedDraft(parsed.data));
    setImportFeedback('已從 JSON 檔案匯入並套用到本地草稿。');
    event.target.value = '';
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const imageDataUrl = await uploadImageAsDataUrl(file);
      patchDraft((current) => ({
        ...current,
        photo: {
          ...current.photo,
          src: imageDataUrl,
          alt: file.name || current.photo.alt,
        },
      }));
      setLocalDraftNote('已套用本機圖片預覽。這只是本地草稿預覽，不代表圖片已上傳；正式生效仍以圖片 URL 欄位為準。');
    } catch (error) {
      setLocalDraftNote(error instanceof Error ? error.message : '圖片預覽失敗。');
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveRemote = async () => {
    if (!apiBaseUrl.trim()) {
      setRemoteStatus({
        tone: 'error',
        text: '請先輸入正式後台 API Base URL，才能儲存正式資料。',
      });
      return;
    }

    if (!writeToken.trim()) {
      setRemoteStatus({
        tone: 'error',
        text: '請先輸入 write token，才能儲存正式資料。',
      });
      return;
    }

    if (validationErrors.length > 0) {
      setRemoteStatus({
        tone: 'error',
        text: '目前本地草稿仍有欄位錯誤，請先修正後再儲存到正式後台。',
      });
      return;
    }

    setRemoteStatus({
      tone: 'info',
      text: '正在儲存到正式後台...',
    });

    try {
      const result = await saveRemoteCardConfig(draft.slug, draft, {
        baseUrl: apiBaseUrl,
        writeToken,
        updatedBy,
      });
      applyOfficialConfig(result.config, '已完成正式儲存；目前畫面與最新正式資料一致。');
      setLastSavedAt(result.updatedAt);
      setLastSavedBy(result.updatedBy);
      setRemoteStatus({
        tone: 'success',
        text: formatRemoteSaveMessage(result.updatedAt, result.updatedBy),
      });
    } catch (error) {
      setRemoteStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : '儲存正式後台資料失敗。',
      });
    }
  };

  const handleApplyStoredDraft = () => {
    if (!draftRestoreState) {
      return;
    }

    setDraft(draftRestoreState.config);
    setDraftRestoreState(null);
    setLocalDraftNote('已套用瀏覽器中的本地草稿。這份內容尚未送出到正式後台。');
  };

  const handleDiscardStoredDraft = async () => {
    if (!draftRestoreState) {
      return;
    }

    window.localStorage.removeItem(draftRestoreState.key);
    setDraftRestoreState(null);
    setLocalDraftNote('已放棄本地草稿，接著會重新載入正式資料。');
    await loadRemoteIntoDraft(true);
  };

  return (
    <main className="page-shell admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Card Admin</p>
          <h1 className="admin-title">電子名片管理</h1>
          <p className="admin-copy">這一版已分成兩層：本地草稿用來編輯與預覽，正式後台資料則透過 API + token 讀寫遠端資料來源。</p>
        </div>
        <div className="admin-note-card">
          <p className="section-label">本地草稿</p>
          <p className="support-copy">{localDraftNote}</p>
          <p className="support-copy">{`草稿儲存鍵：${draftStorageKey}`}</p>
          <p className={`support-copy ${hasUnsavedChanges ? 'admin-dirty-copy' : ''}`}>
            {hasUnsavedChanges ? '尚未儲存變更，離開頁面前會提示。' : '目前沒有未儲存變更。'}
          </p>
          {latestSaveLabel ? <p className="support-copy">{latestSaveLabel}</p> : null}
          <p className="support-copy">欄位結構說明已整理在 docs/runtime-config-reference.md。</p>
        </div>
      </section>

      {draftRestoreState ? (
        <section className="admin-panel admin-restore-banner">
          <div className="admin-section-heading">
            <p className="section-label">本地草稿提示</p>
            <h2 className="admin-panel-title">偵測到未送出的瀏覽器草稿</h2>
          </div>
          <p className="support-copy">這份草稿會覆蓋目前畫面，但尚未送出正式後台。你可以先套用檢查，或直接丟棄並重新載入正式資料。</p>
          <div className="admin-inline-actions">
            <button type="button" className="action-button action-button-secondary" onClick={handleApplyStoredDraft}>
              套用本地草稿
            </button>
            <button type="button" className="action-button action-button-primary" onClick={() => void handleDiscardStoredDraft()}>
              放棄草稿並載入正式資料
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-layout">
        <div className="admin-form-column">
          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">正式後台</p>
              <h2 className="admin-panel-title">Remote Data Source</h2>
            </div>
            <div className="admin-field-grid">
              <AdminTextField
                label="API Base URL"
                value={apiBaseUrl}
                onChange={setApiBaseUrl}
                placeholder="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
                hint="前台卡片、/admin/、LINE 分享 Flex 都應該對同一個正式 exec URL。"
                full
              />
              <AdminTextField
                label="Write Token"
                value={writeToken}
                onChange={setWriteToken}
                placeholder="由 Apps Script Script Properties 管理"
                hint="前端不會內建真正 write secret；只在你儲存時送出。"
                type="password"
              />
              <AdminTextField
                label="Updated By"
                value={updatedBy}
                onChange={setUpdatedBy}
                placeholder="例如 admin@sunner.tw"
                hint="會寫入正式資料 updatedBy，方便追蹤最後修改者。"
              />
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={rememberTokenInSession}
                  onChange={(event) => setRememberTokenInSession(event.target.checked)}
                />
                <span>只在 sessionStorage 暫存 token</span>
              </label>
              <p className="support-copy admin-field-hint">{`API URL 狀態：${apiUrlStatus}`}</p>
              <p className="support-copy admin-field-hint">{`Token 狀態：${tokenStatus}`}</p>
            </div>
            <div className="admin-inline-actions admin-inline-actions-3">
              <button type="button" className="action-button action-button-secondary" onClick={() => void loadRemoteIntoDraft()}>
                載入正式資料
              </button>
              <button type="button" className="action-button action-button-secondary" onClick={() => void loadRemoteIntoDraft()}>
                重新載入正式資料
              </button>
              <button type="button" className="action-button action-button-primary" onClick={() => void handleSaveRemote()}>
                儲存到正式後台
              </button>
            </div>
            {remoteStatus ? (
              <p className={`feedback-message ${remoteStatus.tone === 'error' ? 'is-error' : remoteStatus.tone === 'success' ? 'is-success' : ''}`}>
                {remoteStatus.text}
              </p>
            ) : null}
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">基本資料</p>
              <h2 className="admin-panel-title">身分與主視覺</h2>
            </div>
            <div className="admin-field-grid">
              <AdminTextField
                label="姓名"
                value={draft.content.fullName}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, fullName: value } }))}
              />
              <AdminTextField
                label="職稱"
                value={draft.content.title}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, title: value } }))}
              />
              <AdminTextField
                label="品牌名稱"
                value={draft.content.brandName}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, brandName: value } }))}
              />
              <AdminTextField
                label="分享面板標題"
                value={draft.content.sharePanelTitle}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, sharePanelTitle: value } }))}
                hint="顯示在前台分享說明區塊標題。"
              />
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">品牌文案</p>
              <h2 className="admin-panel-title">主標、副標與介紹</h2>
            </div>
            <div className="admin-field-grid">
              <AdminTextField
                label="主標"
                value={draft.content.headline}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, headline: value } }))}
                full
              />
              <AdminTextField
                label="副標"
                value={draft.content.subheadline}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, subheadline: value } }))}
                full
              />
              <AdminTextField
                label="介紹文字"
                value={draft.content.intro}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, intro: value } }))}
                textareaRows={5}
                full
              />
              <AdminTextField
                label="亮點標題"
                value={draft.content.highlightsTitle}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, highlightsTitle: value } }))}
                hint="顯示在前台 highlight 區塊標題。"
              />
              <AdminTextField
                label="亮點內容"
                value={draft.content.highlights.join('\n')}
                onChange={(value) =>
                  patchDraft((current) => ({
                    ...current,
                    content: {
                      ...current.content,
                      highlights: value
                        .split('\n')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                hint="每行一個亮點，會同步顯示在前台與分享文案上下文。"
                textareaRows={4}
                full
              />
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">圖片資產</p>
              <h2 className="admin-panel-title">主視覺與分享預覽圖</h2>
            </div>
            <div className="admin-field-grid">
              <AdminTextField
                label="正式圖片 URL"
                value={draft.photo.src}
                onChange={(value) => patchDraft((current) => ({ ...current, photo: { ...current.photo, src: value } }))}
                error={photoFieldError}
                placeholderFlag={isPlaceholderContent(draft.photo.src)}
                full
              />
              <AdminTextField
                label="照片替代文字"
                value={draft.photo.alt}
                onChange={(value) => patchDraft((current) => ({ ...current, photo: { ...current.photo, alt: value } }))}
              />
              <AdminTextField
                label="照片點擊連結"
                value={draft.photo.link ?? ''}
                onChange={(value) => patchDraft((current) => ({ ...current, photo: { ...current.photo, link: value } }))}
                error={photoLinkError}
              />
              <AdminTextField
                label="OG Image URL"
                value={draft.seo.ogImage}
                onChange={(value) => patchDraft((current) => ({ ...current, seo: { ...current.seo, ogImage: value } }))}
                error={ogImageFieldError}
                placeholderFlag={isPlaceholderContent(draft.seo.ogImage)}
                full
              />
            </div>
            <div className="admin-inline-actions admin-inline-actions-3">
              <button type="button" className="action-button action-button-secondary" onClick={() => fileInputRef.current?.click()}>
                選擇本機圖片預覽
              </button>
              {draft.photo.link?.trim() && !photoLinkError ? (
                <a className="action-button action-button-secondary" href={draft.photo.link} target="_blank" rel="noreferrer">
                  測試圖片連結
                </a>
              ) : (
                <span className="admin-inline-placeholder">圖片連結可用時會顯示測試按鈕</span>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="admin-hidden-input" onChange={handleImageSelect} />
            </div>
            <div className="admin-image-preview-grid">
              <div className="admin-image-preview-card">
                <p className="section-label">主視覺預覽</p>
                {isImagePreviewable(draft.photo.src) ? <img src={draft.photo.src} alt={draft.photo.alt} className="admin-image-preview" /> : <p className="support-copy">請填入可預覽的圖片網址。</p>}
              </div>
              <div className="admin-image-preview-card">
                <p className="section-label">分享圖預覽</p>
                {isImagePreviewable(draft.seo.ogImage) ? <img src={draft.seo.ogImage} alt={draft.seo.ogTitle || draft.photo.alt} className="admin-image-preview" /> : <p className="support-copy">請填入可公開讀取的 OG Image URL。</p>}
              </div>
            </div>
            <p className="support-copy admin-field-hint">本機選圖只更新預覽中的本地草稿；真正正式頁與 Flex hero image 仍以「正式圖片 URL」和 `OG Image URL` 為準。</p>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">按鈕設定</p>
              <h2 className="admin-panel-title">前兩顆一般按鈕</h2>
            </div>
            <div className="admin-field-grid">
              {draft.actions.map((action, index) => {
                const actionUrlError = getLinkFieldError(action.url ?? '', `按鈕 ${index + 1} 連結`);
                return (
                  <div key={action.id} className="admin-action-card">
                    <label className="admin-toggle">
                      <input type="checkbox" checked={action.enabled ?? true} onChange={(event) => updateAction(index, (current) => ({ ...current, enabled: event.target.checked }))} />
                      <span>{`顯示按鈕 ${index + 1}`}</span>
                    </label>
                    <AdminTextField
                      label="按鈕文案"
                      value={action.label}
                      onChange={(value) => updateAction(index, (current) => ({ ...current, label: value }))}
                      hint="顯示在前台 action 區與 Flex footer。"
                      placeholderFlag={isPlaceholderContent(action.label)}
                    />
                    <AdminTextField
                      label="按鈕連結"
                      value={action.url ?? ''}
                      onChange={(value) => updateAction(index, (current) => ({ ...current, url: value }))}
                      placeholder={actionPlaceholderById[action.id] ?? '#customUrl'}
                      hint="支援 https、mailto、tel、/path 與 #anchor。"
                      error={actionUrlError}
                      placeholderFlag={isPlaceholderContent(action.url ?? '')}
                    />
                    <label className="admin-field">
                      <span>按鈕樣式</span>
                      <small className="admin-field-description">控制前台按鈕外觀，主按鈕通常放主要 CTA。</small>
                <select
                  aria-label="按鈕樣式"
                  value={action.tone ?? 'secondary'}
                  onChange={(event) => updateAction(index, (current) => ({ ...current, tone: event.target.value as CardActionConfig['tone'] }))}
                >
                        <option value="primary">主要</option>
                        <option value="secondary">次要</option>
                      </select>
                    </label>
                    {action.url?.trim() && !actionUrlError && (action.url.startsWith('http://') || action.url.startsWith('https://')) ? (
                      <a className="action-button action-button-secondary" href={action.url} target="_blank" rel="noreferrer">
                        {`測試按鈕 ${index + 1} 連結`}
                      </a>
                    ) : (
                      <span className="admin-inline-placeholder">填入合法 http/https 連結後可直接開新分頁測試。</span>
                    )}
                  </div>
                );
              })}
              <AdminTextField
                label="按鈕區標題"
                value={draft.content.actionsTitle}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, actionsTitle: value } }))}
                hint="顯示在前台行動按鈕區的標題。"
                full
              />
              <AdminTextField
                label="按鈕區說明"
                value={draft.content.actionsDescription}
                onChange={(value) => patchDraft((current) => ({ ...current, content: { ...current.content, actionsDescription: value } }))}
                hint="顯示在按鈕區標題下，適合補充 CTA 說明。"
                textareaRows={3}
                full
              />
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">分享設定</p>
              <h2 className="admin-panel-title">分享文案與 fallback</h2>
            </div>
            <div className="admin-field-grid">
              <AdminTextField
                label="分享標題"
                value={draft.share.title ?? ''}
                onChange={(value) => patchDraft((current) => ({ ...current, share: { ...current.share, title: value } }))}
              />
              <AdminTextField
                label="分享按鈕文案"
                value={draft.share.buttonLabel ?? '分享此電子名片給 LINE 好友'}
                onChange={(value) =>
                  patchDraft((current) => ({
                    ...current,
                    share: {
                      ...current.share,
                      buttonLabel: value,
                    },
                  }))
                }
              />
              <AdminTextField
                label="分享文字"
                value={draft.share.text ?? ''}
                onChange={(value) => patchDraft((current) => ({ ...current, share: { ...current.share, text: value } }))}
                textareaRows={4}
                hint="Web Share 或非 LINE Flex fallback 時會使用。"
                placeholderFlag={shareTextPlaceholder}
                full
              />
              <p className="support-copy admin-field-hint admin-field-full">
                前兩顆是可編輯的一般按鈕，第三顆固定是系統分享按鈕；分享流程與 slug canonicalization 不會因 admin 編輯而被破壞。
              </p>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">匯入匯出</p>
              <h2 className="admin-panel-title">JSON 草稿管理</h2>
            </div>
            <div className="admin-inline-actions admin-inline-actions-3">
              <button type="button" className="action-button action-button-primary" onClick={() => void handleExport()}>
                複製目前 JSON
              </button>
              <button
                type="button"
                className="action-button action-button-secondary"
                onClick={() => {
                  const blob = new Blob([exportJson], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${draft.slug || 'card-config'}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                下載 JSON
              </button>
              <button type="button" className="action-button action-button-secondary" onClick={handleReset}>
                重設回預設值
              </button>
              <label className="action-button action-button-secondary admin-file-button">
                載入 JSON 檔案
                <input type="file" accept="application/json" className="admin-hidden-input" onChange={(event) => void handleImportFile(event)} />
              </label>
            </div>
            {exportFeedback ? <p className="feedback-message is-success">{exportFeedback}</p> : null}
            {importFeedback ? <p className={`feedback-message ${importFeedback.includes('已') ? 'is-success' : 'is-error'}`}>{importFeedback}</p> : null}
            <AdminTextField
              label="貼上 JSON 後套用到本地草稿"
              value={importText}
              onChange={setImportText}
              placeholder="將匯出的 card config JSON 貼在這裡"
              textareaRows={12}
              hint="這只會改變本地草稿，不會直接寫進正式後台。"
              full
            />
            <div className="admin-inline-actions">
              <button type="button" className="action-button action-button-primary" onClick={handleImport}>
                套用 JSON
              </button>
            </div>
            <AdminTextField
              label="目前本地草稿 JSON"
              value={exportJson}
              onChange={() => undefined}
              textareaRows={12}
              hint="方便你快速比對 runtime config 實際內容。"
              readOnly
              full
            />
          </section>
        </div>

        <aside className="admin-preview-column">
          <section className="admin-panel admin-panel-sticky">
            <div className="admin-section-heading">
              <p className="section-label">即時預覽</p>
              <h2 className="admin-panel-title">正式名片預覽</h2>
            </div>
            {validationErrors.length > 0 ? (
              <div className="admin-validation">
                <p className="section-label">請先修正</p>
                <ul className="admin-validation-list">
                  {validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="support-copy">目前本地草稿可通過 schema / validator，預覽與正式卡頁共用同一套 CardPage / view-model。</p>
            )}
          </section>
          <CardPage config={draft} previewMode embedded />
        </aside>
      </section>
    </main>
  );
}

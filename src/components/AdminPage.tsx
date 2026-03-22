import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CardPage } from './CardPage';
import {
  createDefaultCardDraft,
  parseCardConfigJson,
  serializeCardConfig,
  ADMIN_DRAFT_STORAGE_KEY,
} from '../content/cards/draft';
import type { CardActionConfig, CardConfig } from '../content/cards/types';
import { assertCardConfig } from '../content/cards/schema';
import { fetchRemoteCardConfig, getCardApiBaseUrl, saveRemoteCardConfig } from '../lib/card-source';
import { applyBasicSeo } from '../lib/seo';
import { validateCardConfig } from '../lib/card-validation';

const adminTitle = '電子名片管理';
const adminDescription = '編輯電子名片內容、區分本地草稿與正式後台資料，並可載入或儲存正式 CardConfig。';
const ADMIN_TOKEN_SESSION_KEY = 'line-liff-card.admin-write-token';

type StatusTone = 'success' | 'error' | 'info';

type StatusMessage = {
  tone: StatusTone;
  text: string;
};

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

const formatRemoteSaveMessage = (updatedAt?: string): string =>
  updatedAt ? `正式後台資料已儲存成功。更新時間：${updatedAt}` : '正式後台資料已儲存成功。';

export function AdminPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<CardConfig>(() => createDefaultCardDraft());
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

  useEffect(() => {
    applyBasicSeo(adminTitle, adminDescription);
  }, []);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(ADMIN_DRAFT_STORAGE_KEY);
    if (savedDraft) {
      const parsed = parseCardConfigJson(savedDraft);
      if (parsed.ok) {
        setDraft(normalizeLoadedDraft(parsed.data));
        setLocalDraftNote('已載入此瀏覽器先前暫存的本地草稿。這份資料不一定等於正式後台內容。');
      } else {
        window.localStorage.removeItem(ADMIN_DRAFT_STORAGE_KEY);
      }
    }

    const sessionToken = window.sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY);
    if (sessionToken) {
      setWriteToken(sessionToken);
      setRememberTokenInSession(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_DRAFT_STORAGE_KEY, serializeCardConfig(draft));
  }, [draft]);

  useEffect(() => {
    if (rememberTokenInSession && writeToken.trim()) {
      window.sessionStorage.setItem(ADMIN_TOKEN_SESSION_KEY, writeToken);
      return;
    }

    window.sessionStorage.removeItem(ADMIN_TOKEN_SESSION_KEY);
  }, [rememberTokenInSession, writeToken]);

  const validationErrors = useMemo(() => validateCardConfig(draft), [draft]);
  const exportJson = useMemo(() => serializeCardConfig(draft), [draft]);

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
    const nextDraft = createDefaultCardDraft();
    setDraft(nextDraft);
    setImportText('');
    setImportFeedback('已重設回 bundled 預設內容，並覆蓋目前本地草稿。');
    setExportFeedback(null);
    setLocalDraftNote('本地草稿已重設回 bundled 預設內容。這不會修改正式後台資料。');
    window.localStorage.setItem(ADMIN_DRAFT_STORAGE_KEY, serializeCardConfig(nextDraft));
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

  const handleLoadRemote = async () => {
    if (!apiBaseUrl.trim()) {
      setRemoteStatus({
        tone: 'error',
        text: '請先輸入正式後台 API Base URL，才能載入正式資料。',
      });
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
      setDraft(normalizeLoadedDraft(remoteConfig));
      setLocalDraftNote('已用正式後台資料覆蓋目前本地草稿；若再修改，仍要按儲存才會更新正式內容。');
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
      setDraft(normalizeLoadedDraft(result.config));
      setRemoteStatus({
        tone: 'success',
        text: formatRemoteSaveMessage(result.updatedAt),
      });
    } catch (error) {
      setRemoteStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : '儲存正式後台資料失敗。',
      });
    }
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
        </div>
      </section>

      <section className="admin-layout">
        <div className="admin-form-column">
          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">正式後台</p>
              <h2 className="admin-panel-title">Remote Data Source</h2>
            </div>
            <div className="admin-field-grid">
              <label className="admin-field admin-field-full">
                <span>API Base URL</span>
                <input
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  placeholder="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
                />
              </label>
              <label className="admin-field">
                <span>Write Token</span>
                <input
                  type="password"
                  value={writeToken}
                  onChange={(event) => setWriteToken(event.target.value)}
                  placeholder="由 Apps Script Script Properties 管理"
                />
              </label>
              <label className="admin-field">
                <span>Updated By</span>
                <input
                  value={updatedBy}
                  onChange={(event) => setUpdatedBy(event.target.value)}
                  placeholder="例如 admin@sunner.tw"
                />
              </label>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={rememberTokenInSession}
                  onChange={(event) => setRememberTokenInSession(event.target.checked)}
                />
                <span>只在 sessionStorage 暫存 token</span>
              </label>
              <p className="support-copy admin-field-hint">
                前端不會內建真正 write secret。若勾選，上述 token 只會暫存於目前分頁 sessionStorage。
              </p>
            </div>
            <div className="admin-inline-actions">
              <button type="button" className="action-button action-button-secondary" onClick={handleLoadRemote}>
                載入正式資料
              </button>
              <button type="button" className="action-button action-button-primary" onClick={handleSaveRemote}>
                儲存到正式後台
              </button>
            </div>
            {remoteStatus ? <p className={`feedback-message ${remoteStatus.tone === 'error' ? 'is-error' : remoteStatus.tone === 'success' ? 'is-success' : ''}`}>{remoteStatus.text}</p> : null}
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">基本資料</p>
              <h2 className="admin-panel-title">身分與主視覺</h2>
            </div>
            <div className="admin-field-grid">
              <label className="admin-field">
                <span>姓名</span>
                <input value={draft.content.fullName} onChange={(event) => patchDraft((current) => ({ ...current, content: { ...current.content, fullName: event.target.value } }))} />
              </label>
              <label className="admin-field">
                <span>職稱</span>
                <input value={draft.content.title} onChange={(event) => patchDraft((current) => ({ ...current, content: { ...current.content, title: event.target.value } }))} />
              </label>
              <label className="admin-field">
                <span>品牌名稱</span>
                <input value={draft.content.brandName} onChange={(event) => patchDraft((current) => ({ ...current, content: { ...current.content, brandName: event.target.value } }))} />
              </label>
              <label className="admin-field admin-field-full">
                <span>正式圖片 URL</span>
                <input value={draft.photo.src} onChange={(event) => patchDraft((current) => ({ ...current, photo: { ...current.photo, src: event.target.value } }))} />
              </label>
              <label className="admin-field">
                <span>照片替代文字</span>
                <input value={draft.photo.alt} onChange={(event) => patchDraft((current) => ({ ...current, photo: { ...current.photo, alt: event.target.value } }))} />
              </label>
              <label className="admin-field">
                <span>照片點擊連結</span>
                <input value={draft.photo.link ?? ''} onChange={(event) => patchDraft((current) => ({ ...current, photo: { ...current.photo, link: event.target.value } }))} />
              </label>
              <label className="admin-field admin-field-full">
                <span>OG Image URL</span>
                <input value={draft.seo.ogImage} onChange={(event) => patchDraft((current) => ({ ...current, seo: { ...current.seo, ogImage: event.target.value } }))} />
              </label>
            </div>
            <div className="admin-inline-actions">
              <button type="button" className="action-button action-button-secondary" onClick={() => fileInputRef.current?.click()}>
                選擇本機圖片預覽
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="admin-hidden-input" onChange={handleImageSelect} />
            </div>
            <p className="support-copy admin-field-hint">本機選圖只更新預覽中的本地草稿；真正正式頁與 Flex hero image 仍以「正式圖片 URL」和 `OG Image URL` 為準。</p>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">文案內容</p>
              <h2 className="admin-panel-title">主標、副標與介紹</h2>
            </div>
            <div className="admin-field-grid">
              <label className="admin-field admin-field-full">
                <span>主標</span>
                <input value={draft.content.headline} onChange={(event) => patchDraft((current) => ({ ...current, content: { ...current.content, headline: event.target.value } }))} />
              </label>
              <label className="admin-field admin-field-full">
                <span>副標</span>
                <input value={draft.content.subheadline} onChange={(event) => patchDraft((current) => ({ ...current, content: { ...current.content, subheadline: event.target.value } }))} />
              </label>
              <label className="admin-field admin-field-full">
                <span>介紹文字</span>
                <textarea rows={5} value={draft.content.intro} onChange={(event) => patchDraft((current) => ({ ...current, content: { ...current.content, intro: event.target.value } }))} />
              </label>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">按鈕設定</p>
              <h2 className="admin-panel-title">前兩顆一般按鈕與分享規則</h2>
            </div>
            <div className="admin-field-grid">
              {draft.actions.map((action, index) => (
                <div key={action.id} className="admin-action-card">
                  <label className="admin-toggle">
                    <input type="checkbox" checked={action.enabled ?? true} onChange={(event) => updateAction(index, (current) => ({ ...current, enabled: event.target.checked }))} />
                    <span>{`顯示按鈕 ${index + 1}`}</span>
                  </label>
                  <label className="admin-field">
                    <span>按鈕文案</span>
                    <input value={action.label} onChange={(event) => updateAction(index, (current) => ({ ...current, label: event.target.value }))} />
                  </label>
                  <label className="admin-field">
                    <span>按鈕連結</span>
                    <input
                      value={action.url ?? ''}
                      placeholder={actionPlaceholderById[action.id] ?? '#customUrl'}
                      onChange={(event) => updateAction(index, (current) => ({ ...current, url: event.target.value }))}
                    />
                  </label>
                  <label className="admin-field">
                    <span>按鈕樣式</span>
                    <select value={action.tone ?? 'secondary'} onChange={(event) => updateAction(index, (current) => ({ ...current, tone: event.target.value as CardActionConfig['tone'] }))}>
                      <option value="primary">主要</option>
                      <option value="secondary">次要</option>
                    </select>
                  </label>
                </div>
              ))}
              <label className="admin-field admin-field-full">
                <span>分享按鈕文案</span>
                <input
                  value={draft.share.buttonLabel ?? '分享此電子名片給 LINE 好友'}
                  onChange={(event) =>
                    patchDraft((current) => ({
                      ...current,
                      share: {
                        ...current.share,
                        buttonLabel: event.target.value,
                      },
                    }))
                  }
                />
              </label>
              <p className="support-copy admin-field-hint">
                前兩顆是可編輯的一般按鈕，第三顆固定是系統分享按鈕；分享流程與 legacy slug canonicalization 不會因 admin 編輯而被破壞。
              </p>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">匯入匯出</p>
              <h2 className="admin-panel-title">JSON 草稿管理</h2>
            </div>
            <div className="admin-inline-actions">
              <button type="button" className="action-button action-button-primary" onClick={handleExport}>
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
                <input type="file" accept="application/json" className="admin-hidden-input" onChange={handleImportFile} />
              </label>
            </div>
            {exportFeedback ? <p className="feedback-message is-success">{exportFeedback}</p> : null}
            {importFeedback ? <p className={`feedback-message ${importFeedback.includes('已') ? 'is-success' : 'is-error'}`}>{importFeedback}</p> : null}
            <label className="admin-field admin-field-full">
              <span>貼上 JSON 後套用到本地草稿</span>
              <textarea rows={12} value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="將匯出的 card config JSON 貼在這裡" />
            </label>
            <div className="admin-inline-actions">
              <button type="button" className="action-button action-button-primary" onClick={handleImport}>
                套用 JSON
              </button>
            </div>
            <label className="admin-field admin-field-full">
              <span>目前本地草稿 JSON</span>
              <textarea rows={12} value={exportJson} readOnly />
            </label>
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

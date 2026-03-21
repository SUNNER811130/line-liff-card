import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CardPage } from './CardPage';
import { createDefaultCardDraft, parseCardConfigJson, serializeCardConfig, ADMIN_DRAFT_STORAGE_KEY } from '../content/cards/draft';
import type { CardActionConfig, CardConfig } from '../content/cards/types';
import { assertCardConfig } from '../content/cards/schema';
import { applyBasicSeo } from '../lib/seo';
import { validateCardConfig } from '../lib/card-validation';

const adminTitle = '電子名片管理';
const adminDescription = '編輯電子名片內容、即時預覽，並以 JSON 匯入或匯出設定。';

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

const normalizeDraft = (draft: CardConfig): CardConfig => {
  assertCardConfig(draft);
  return {
    ...draft,
    actions: draft.actions.slice(0, 2).map((action, index) => normalizeAction(action, `action-${index + 1}`)),
    share: {
      ...draft.share,
      buttonLabel: draft.share.buttonLabel?.trim() || '分享此電子名片給 LINE 好友',
    },
  };
};

export function AdminPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<CardConfig>(() => createDefaultCardDraft());
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [localDraftNote, setLocalDraftNote] = useState<string | null>('此頁僅提供瀏覽器本地暫存，不會直接寫回 GitHub Pages 或 repo。');

  useEffect(() => {
    applyBasicSeo(adminTitle, adminDescription);
  }, []);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(ADMIN_DRAFT_STORAGE_KEY);
    if (!savedDraft) {
      return;
    }

    const parsed = parseCardConfigJson(savedDraft);
    if (!parsed.ok) {
      window.localStorage.removeItem(ADMIN_DRAFT_STORAGE_KEY);
      return;
    }

    setDraft(normalizeDraft(parsed.data));
    setLocalDraftNote('已載入此瀏覽器先前暫存的草稿。這不是正式後台存檔。');
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_DRAFT_STORAGE_KEY, serializeCardConfig(draft));
  }, [draft]);

  const validationErrors = useMemo(() => validateCardConfig(draft), [draft]);
  const exportJson = useMemo(() => serializeCardConfig(draft), [draft]);

  const patchDraft = (updater: (current: CardConfig) => CardConfig) => {
    setDraft((current) => normalizeDraft(updater(current)));
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

    setDraft(normalizeDraft(parsed.data));
    setImportFeedback('JSON 已套用到目前編輯狀態。若要保留，請自行匯出保存。');
  };

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setExportFeedback('目前設定 JSON 已複製到剪貼簿。');
    } catch {
      setExportFeedback('目前瀏覽器不支援直接複製，請使用下方 JSON 區塊手動保存。');
    }
  };

  const handleReset = () => {
    const nextDraft = createDefaultCardDraft();
    setDraft(nextDraft);
    setImportText('');
    setImportFeedback('已重設回預設內容。');
    setExportFeedback(null);
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

    setDraft(normalizeDraft(parsed.data));
    setImportFeedback('已從 JSON 檔案匯入並套用。');
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
      setLocalDraftNote('已套用本機圖片預覽。圖片只存在此瀏覽器草稿，未上傳到任何伺服器。');
    } catch (error) {
      setLocalDraftNote(error instanceof Error ? error.message : '圖片預覽失敗。');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <main className="page-shell admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Card Admin</p>
          <h1 className="admin-title">電子名片管理</h1>
          <p className="admin-copy">編輯內容、確認預覽、匯出 JSON 保存。這一版是管理頁 MVP，不是正式持久化 CMS。</p>
        </div>
        <div className="admin-note-card">
          <p className="section-label">使用說明</p>
          <p className="support-copy">{localDraftNote}</p>
        </div>
      </section>

      <section className="admin-layout">
        <div className="admin-form-column">
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
              <label className="admin-field">
                <span>照片網址</span>
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
            </div>
            <div className="admin-inline-actions">
              <button type="button" className="action-button action-button-secondary" onClick={() => fileInputRef.current?.click()}>
                選擇本機圖片預覽
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="admin-hidden-input" onChange={handleImageSelect} />
            </div>
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
              <label className="admin-field admin-field-full">
                <span>亮點標題</span>
                <input value={draft.content.highlightsTitle} onChange={(event) => patchDraft((current) => ({ ...current, content: { ...current.content, highlightsTitle: event.target.value } }))} />
              </label>
              {draft.content.highlights.map((item, index) => (
                <label key={`highlight-${index}`} className="admin-field admin-field-full">
                  <span>{`亮點 ${index + 1}`}</span>
                  <input
                    value={item}
                    onChange={(event) =>
                      patchDraft((current) => ({
                        ...current,
                        content: {
                          ...current.content,
                          highlights: current.content.highlights.map((highlight, highlightIndex) =>
                            highlightIndex === index ? event.target.value : highlight,
                          ),
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">按鈕設定</p>
              <h2 className="admin-panel-title">一般按鈕與分享規則</h2>
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
                前兩顆是可編輯的一般按鈕，第三顆固定是系統分享按鈕；這裡只能調整文案，不能移除分享功能。
              </p>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-section-heading">
              <p className="section-label">版型主題</p>
              <h2 className="admin-panel-title">模組與外觀</h2>
            </div>
            <div className="admin-field-grid">
              <label className="admin-field">
                <span>主題</span>
                <select value={draft.appearance.theme} onChange={(event) => patchDraft((current) => ({ ...current, appearance: { ...current.appearance, theme: event.target.value as CardConfig['appearance']['theme'] } }))}>
                  <option value="executive">Executive</option>
                </select>
              </label>
              <label className="admin-field">
                <span>版型</span>
                <select value={draft.appearance.layout} onChange={(event) => patchDraft((current) => ({ ...current, appearance: { ...current.appearance, layout: event.target.value as CardConfig['appearance']['layout'] } }))}>
                  <option value="profile-right">Profile Right</option>
                </select>
              </label>
              <label className="admin-toggle">
                <input type="checkbox" checked={draft.modules.showHighlights} onChange={(event) => patchDraft((current) => ({ ...current, modules: { ...current.modules, showHighlights: event.target.checked } }))} />
                <span>顯示專業簡介</span>
              </label>
              <label className="admin-toggle">
                <input type="checkbox" checked={draft.modules.showSharePanel} onChange={(event) => patchDraft((current) => ({ ...current, modules: { ...current.modules, showSharePanel: event.target.checked } }))} />
                <span>顯示分享說明區</span>
              </label>
              <label className="admin-toggle">
                <input type="checkbox" checked={draft.modules.showQrCode} onChange={(event) => patchDraft((current) => ({ ...current, modules: { ...current.modules, showQrCode: event.target.checked } }))} />
                <span>顯示 QR Code</span>
              </label>
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
              <button type="button" className="action-button action-button-secondary" onClick={() => {
                const blob = new Blob([exportJson], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${draft.slug || 'card-config'}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}>
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
              <span>貼上 JSON 後套用</span>
              <textarea rows={12} value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="將匯出的 card config JSON 貼在這裡" />
            </label>
            <div className="admin-inline-actions">
              <button type="button" className="action-button action-button-primary" onClick={handleImport}>
                套用 JSON
              </button>
            </div>
            <label className="admin-field admin-field-full">
              <span>目前可保存設定</span>
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
              <p className="support-copy">目前欄位格式可用，匯出的 JSON 可作為後續正式設定來源。</p>
            )}
          </section>
          <CardPage config={draft} previewMode embedded />
        </aside>
      </section>
    </main>
  );
}

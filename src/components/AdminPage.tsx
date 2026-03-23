import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { CardPage } from './CardPage';
import {
  ADMIN_DESCRIPTION,
  ADMIN_SESSION_EXPIRES_AT_STORAGE_KEY,
  ADMIN_SESSION_STORAGE_KEY,
  ADMIN_TITLE,
  ADMIN_UPDATED_BY_STORAGE_KEY,
  applyUploadedImageToDraft,
  type AssetFieldKey,
  type AssetUploadState,
  coerceDraft,
  type DraftRestoreState,
  formatSaveMessage,
  formatSessionLabel,
  getImageFieldError,
  getLinkFieldError,
  isImagePreviewable,
  normalizeAction,
  normalizeLoadedDraft,
  parseStringList,
  serializeStringList,
  type StatusMessage,
  toReadableBoolean,
} from './admin-page-helpers';
import {
  cloneCardConfig,
  createDefaultCardDraft,
  getAdminDraftStorageKey,
  parseCardConfigJson,
  serializeCardConfig,
} from '../content/cards/draft';
import type { CardActionConfig, CardActionTone, CardConfig } from '../content/cards/types';
import {
  createAdminSession,
  fetchRemoteCardConfig,
  getCardApiBaseUrl,
  saveRemoteCardConfig,
  uploadRuntimeImage,
  verifyAdminSession,
} from '../lib/card-source';
import { prepareImageUpload } from '../lib/image-upload';
import { applyBasicSeo } from '../lib/seo';
import { isAllowedLink, isHttpUrl, validateCardConfig } from '../lib/card-validation';
import {
  ADMIN_FIELD_GROUPS,
  ADMIN_FIELD_GROUPS_BY_KEY,
  CARD_RUNTIME_FIELDS_BY_GROUP,
  type AdminFieldGroupKey,
  type AdminFieldRegistryItem,
  type FieldVisibilityScope,
} from '../lib/card-field-registry';

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText: string;
  badgeLabel: string;
  textareaRows?: number;
  type?: 'text' | 'password';
  error?: string | null;
  full?: boolean;
  readOnly?: boolean;
  trailing?: ReactNode;
};

const visibilityScopeLabel: Record<FieldVisibilityScope, string> = {
  both: 'Flex / 網頁',
  web: '網頁',
  flex: 'Flex',
  system: '系統',
};

const actionToneOptions: CardActionTone[] = ['primary', 'secondary'];

const openExternalUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Formal admin CMS for the single runtime card config. Keep unlock/save/upload
 * flow, field keys, and preview behavior aligned with the production runtime.
 */
function AdminTextField({
  label,
  value,
  onChange,
  placeholder,
  helpText,
  badgeLabel,
  textareaRows,
  type = 'text',
  error,
  full = false,
  readOnly = false,
  trailing,
}: FieldProps) {
  return (
    <label className={`admin-field ${full ? 'admin-field-full' : ''}`}>
      <span>
        <span>{label}</span>
        <span className="admin-visibility-badge">{badgeLabel}</span>
      </span>
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
      {trailing}
      {error ? <small className="admin-inline-error">{error}</small> : null}
      <small className="admin-field-description">{helpText}</small>
    </label>
  );
}

function AdminToggleField({
  label,
  checked,
  onChange,
  helpText,
  badgeLabel,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helpText: string;
  badgeLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="admin-field admin-toggle-field">
      <span>
        <span>{label}</span>
        <span className="admin-visibility-badge">{badgeLabel}</span>
      </span>
      <label className="admin-toggle" aria-label={label}>
        <input aria-label={label} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
        <span>{checked ? '啟用' : '停用'}</span>
      </label>
      <small className="admin-field-description">{helpText}</small>
    </div>
  );
}

function AdminSelectField({
  label,
  value,
  onChange,
  helpText,
  badgeLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText: string;
  badgeLabel: string;
  options: string[];
}) {
  return (
    <label className="admin-field">
      <span>
        <span>{label}</span>
        <span className="admin-visibility-badge">{badgeLabel}</span>
      </span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <small className="admin-field-description">{helpText}</small>
    </label>
  );
}

function StatusBanner({ status }: { status: StatusMessage | AssetUploadState | null }) {
  if (!status) {
    return null;
  }

  return (
    <p
      className={`feedback-message ${
        status.tone === 'error' ? 'is-error' : status.tone === 'success' ? 'is-success' : ''
      }`}
    >
      {status.text}
    </p>
  );
}

export function AdminPage() {
  const apiBaseUrl = getCardApiBaseUrl();
  const initialDraft = createDefaultCardDraft();
  const photoUploadInputRef = useRef<HTMLInputElement | null>(null);
  const ogUploadInputRef = useRef<HTMLInputElement | null>(null);
  const hasRestoredSessionRef = useRef(false);
  const hasExistingLocalDraftRef = useRef(false);
  const draftStorageKey = useMemo(() => getAdminDraftStorageKey(initialDraft.id), [initialDraft.id]);
  const [draft, setDraft] = useState<CardConfig>(() => initialDraft);
  const [baselineConfig, setBaselineConfig] = useState<CardConfig>(() => initialDraft);
  const [draftRestoreState, setDraftRestoreState] = useState<DraftRestoreState>(null);
  const [unlockSecret, setUnlockSecret] = useState('');
  const [adminSession, setAdminSession] = useState('');
  const [sessionExpiresAt, setSessionExpiresAt] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [localDraftNote, setLocalDraftNote] = useState(
    '本地草稿會自動保留在這個瀏覽器；只有按「儲存正式名片」才會更新正式 runtime config。',
  );
  const [remoteStatus, setRemoteStatus] = useState<StatusMessage | null>(
    apiBaseUrl
      ? {
          tone: 'info',
          text: '正式 exec URL 已從 runtime config 帶入。解鎖後即可直接載入、儲存與上傳圖片。',
        }
      : {
          tone: 'error',
          text: '目前沒有設定正式 exec URL。請先在前端環境設定 `VITE_CARD_API_BASE_URL`。',
        },
  );
  const [unlockStatus, setUnlockStatus] = useState<StatusMessage | null>({
    tone: 'info',
    text: '尚未解鎖。請先完成一次管理員解鎖，之後本分頁可直接編輯與上傳圖片。',
  });
  const [assetUploadStatus, setAssetUploadStatus] = useState<AssetUploadState>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);
  const [lastSavedBy, setLastSavedBy] = useState<string | undefined>(undefined);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);

  const draftSnapshot = useMemo(() => serializeCardConfig(draft), [draft]);
  const baselineSnapshot = useMemo(() => serializeCardConfig(baselineConfig), [baselineConfig]);
  const validationErrors = useMemo(() => validateCardConfig(draft), [draft]);
  const hasUnsavedChanges = baselineSnapshot !== draftSnapshot;
  const isUnlocked = Boolean(adminSession);
  const photoFieldError = getImageFieldError(draft.photo.src, '正式圖片 URL');
  const ogImageFieldError = getImageFieldError(draft.seo.ogImage, 'OG Image URL');
  const photoLinkError = getLinkFieldError(draft.photo.link ?? '', '照片點擊連結');
  const firstActionLinkError = getLinkFieldError(draft.actions[0]?.url ?? '', '第一按鈕連結');
  const secondActionLinkError = getLinkFieldError(draft.actions[1]?.url ?? '', '第二按鈕連結');
  const latestSaveLabel = [lastSavedAt ? `最近成功儲存：${lastSavedAt}` : '', lastSavedBy ? `儲存者：${lastSavedBy}` : '']
    .filter(Boolean)
    .join('｜');

  useEffect(() => {
    applyBasicSeo(ADMIN_TITLE, ADMIN_DESCRIPTION);
  }, []);

  useEffect(() => {
    const rememberedUpdatedBy = window.localStorage.getItem(ADMIN_UPDATED_BY_STORAGE_KEY);
    if (rememberedUpdatedBy) {
      setUpdatedBy(rememberedUpdatedBy);
    }

    const savedDraft = window.localStorage.getItem(draftStorageKey);
    if (!savedDraft) {
      return;
    }

    hasExistingLocalDraftRef.current = true;
    const parsed = parseCardConfigJson(savedDraft);
    if (!parsed.ok) {
      window.localStorage.removeItem(draftStorageKey);
      hasExistingLocalDraftRef.current = false;
      return;
    }

    setDraftRestoreState({
      key: draftStorageKey,
      config: normalizeLoadedDraft(parsed.data),
    });
    setLocalDraftNote('偵測到未送出的本地草稿。解鎖後可套用、放棄，或重新載入正式資料。');
  }, [draftStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(draftStorageKey, draftSnapshot);
  }, [draftSnapshot, draftStorageKey]);

  useEffect(() => {
    if (updatedBy.trim()) {
      window.localStorage.setItem(ADMIN_UPDATED_BY_STORAGE_KEY, updatedBy.trim());
      return;
    }

    window.localStorage.removeItem(ADMIN_UPDATED_BY_STORAGE_KEY);
  }, [updatedBy]);

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

  const clearAdminSession = () => {
    setAdminSession('');
    setSessionExpiresAt('');
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(ADMIN_SESSION_EXPIRES_AT_STORAGE_KEY);
  };

  const handleProtectedActionError = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    if (/admin session|session|解鎖/i.test(message)) {
      clearAdminSession();
      setUnlockStatus({
        tone: 'error',
        text: '管理員 session 已失效，請重新解鎖後再試。',
      });
    }

    return message;
  };

  const applyOfficialConfig = (config: CardConfig, note: string) => {
    const normalized = normalizeLoadedDraft(config);
    setDraft(normalized);
    setBaselineConfig(cloneCardConfig(normalized));
    setDraftRestoreState(null);
    setLocalDraftNote(note);
  };

  const patchDraft = (updater: (current: CardConfig) => CardConfig) => {
    setDraft((current) => coerceDraft(updater(current)));
  };

  const updateAction = (index: number, updater: (action: CardActionConfig) => CardActionConfig) => {
    patchDraft((current) => {
      const actions = [...current.actions];
      actions[index] = updater(
        actions[index] ?? normalizeAction({ id: index === 0 ? 'contact' : 'services', label: '' }, index === 0 ? 'contact' : 'services'),
      );
      return {
        ...current,
        actions,
      };
    });
  };

  const updateActionTone = (index: number, tone: string) => {
    updateAction(index, (action) => ({
      ...action,
      tone: tone === 'primary' ? 'primary' : 'secondary',
    }));
  };

  const getFieldError = (fieldKey: string): string | null => {
    switch (fieldKey) {
      case 'photo.src':
        return photoFieldError;
      case 'photo.link':
        return photoLinkError;
      case 'seo.ogImage':
        return ogImageFieldError;
      case 'actions.0.url':
        return firstActionLinkError;
      case 'actions.1.url':
        return secondActionLinkError;
      default:
        return null;
    }
  };

  const renderTextField = (
    field: AdminFieldRegistryItem,
    value: string,
    onChange: (value: string) => void,
    options: {
      trailing?: ReactNode;
      readOnly?: boolean;
      textareaRows?: number;
    } = {},
  ) => (
    <AdminTextField
      key={field.key}
      label={field.label}
      value={value}
      onChange={onChange}
      placeholder={field.placeholder}
      helpText={field.helpText}
      badgeLabel={visibilityScopeLabel[field.visibilityScope]}
      textareaRows={options.textareaRows ?? field.textareaRows}
      error={getFieldError(field.key)}
      full={field.full}
      readOnly={options.readOnly ?? !field.isEditable}
      trailing={options.trailing}
    />
  );

  const renderField = (field: AdminFieldRegistryItem): ReactNode => {
    switch (field.key) {
      case 'content.fullName':
        return renderTextField(field, draft.content.fullName, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, fullName: value } })),
        );
      case 'content.title':
        return renderTextField(field, draft.content.title, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, title: value } })),
        );
      case 'content.brandName':
        return renderTextField(field, draft.content.brandName, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, brandName: value } })),
        );
      case 'content.headline':
        return renderTextField(field, draft.content.headline, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, headline: value } })),
        );
      case 'content.subheadline':
        return renderTextField(field, draft.content.subheadline, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, subheadline: value } })),
        );
      case 'content.intro':
        return renderTextField(field, draft.content.intro, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, intro: value } })),
        );
      case 'content.highlightsTitle':
        return renderTextField(field, draft.content.highlightsTitle, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, highlightsTitle: value } })),
        );
      case 'content.highlights':
        return renderTextField(
          field,
          serializeStringList(draft.content.highlights),
          (value) =>
            patchDraft((current) => ({ ...current, content: { ...current.content, highlights: parseStringList(value) } })),
          { textareaRows: field.textareaRows },
        );
      case 'content.actionsTitle':
        return renderTextField(field, draft.content.actionsTitle, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, actionsTitle: value } })),
        );
      case 'content.actionsDescription':
        return renderTextField(field, draft.content.actionsDescription, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, actionsDescription: value } })),
        );
      case 'content.sharePanelTitle':
        return renderTextField(field, draft.content.sharePanelTitle, (value) =>
          patchDraft((current) => ({ ...current, content: { ...current.content, sharePanelTitle: value } })),
        );
      case 'modules.showHighlights':
        return (
          <AdminToggleField
            key={field.key}
            label={field.label}
            checked={draft.modules.showHighlights}
            onChange={(checked) => patchDraft((current) => ({ ...current, modules: { ...current.modules, showHighlights: checked } }))}
            helpText={field.helpText}
            badgeLabel={visibilityScopeLabel[field.visibilityScope]}
          />
        );
      case 'modules.showSharePanel':
        return (
          <AdminToggleField
            key={field.key}
            label={field.label}
            checked={draft.modules.showSharePanel}
            onChange={(checked) => patchDraft((current) => ({ ...current, modules: { ...current.modules, showSharePanel: checked } }))}
            helpText={field.helpText}
            badgeLabel={visibilityScopeLabel[field.visibilityScope]}
          />
        );
      case 'modules.showQrCode':
        return (
          <AdminToggleField
            key={field.key}
            label={field.label}
            checked={draft.modules.showQrCode}
            onChange={(checked) => patchDraft((current) => ({ ...current, modules: { ...current.modules, showQrCode: checked } }))}
            helpText={field.helpText}
            badgeLabel={visibilityScopeLabel[field.visibilityScope]}
          />
        );
      case 'photo.src':
        return renderTextField(
          field,
          draft.photo.src,
          (value) => patchDraft((current) => ({ ...current, photo: { ...current.photo, src: value } })),
          {
            trailing: (
              <div className="admin-inline-actions admin-inline-actions-3">
                <button type="button" className="action-button action-button-secondary" onClick={() => handleAssetUploadClick('photo')}>
                  上傳頭像 / 主視覺
                </button>
                <button type="button" className="action-button action-button-secondary" disabled={!isHttpUrl(draft.photo.src)} onClick={() => openExternalUrl(draft.photo.src)}>
                  開新分頁測試
                </button>
              </div>
            ),
          },
        );
      case 'photo.alt':
        return renderTextField(field, draft.photo.alt, (value) =>
          patchDraft((current) => ({ ...current, photo: { ...current.photo, alt: value } })),
        );
      case 'photo.link':
        return renderTextField(field, draft.photo.link ?? '', (value) =>
          patchDraft((current) => ({ ...current, photo: { ...current.photo, link: value } })),
        );
      case 'actions.0.label':
        return renderTextField(field, draft.actions[0]?.label ?? '', (value) => updateAction(0, (action) => ({ ...action, label: value })));
      case 'actions.0.url':
        return renderTextField(field, draft.actions[0]?.url ?? '', (value) => updateAction(0, (action) => ({ ...action, url: value })), {
          trailing: (
            <div className="admin-inline-actions">
              <button type="button" className="action-button action-button-secondary" disabled={!isAllowedLink(draft.actions[0]?.url ?? '')} onClick={() => openExternalUrl(draft.actions[0]?.url ?? '')}>
                測試第一按鈕
              </button>
            </div>
          ),
        });
      case 'actions.0.tone':
        return (
          <AdminSelectField
            key={field.key}
            label={field.label}
            value={draft.actions[0]?.tone ?? 'secondary'}
            onChange={(value) => updateActionTone(0, value)}
            helpText={field.helpText}
            badgeLabel={visibilityScopeLabel[field.visibilityScope]}
            options={actionToneOptions}
          />
        );
      case 'actions.0.enabled':
        return (
          <AdminToggleField
            key={field.key}
            label={field.label}
            checked={draft.actions[0]?.enabled !== false}
            onChange={(checked) => updateAction(0, (action) => ({ ...action, enabled: checked }))}
            helpText={field.helpText}
            badgeLabel={visibilityScopeLabel[field.visibilityScope]}
          />
        );
      case 'actions.1.label':
        return renderTextField(field, draft.actions[1]?.label ?? '', (value) => updateAction(1, (action) => ({ ...action, label: value })));
      case 'actions.1.url':
        return renderTextField(field, draft.actions[1]?.url ?? '', (value) => updateAction(1, (action) => ({ ...action, url: value })), {
          trailing: (
            <div className="admin-inline-actions">
              <button type="button" className="action-button action-button-secondary" disabled={!isAllowedLink(draft.actions[1]?.url ?? '')} onClick={() => openExternalUrl(draft.actions[1]?.url ?? '')}>
                測試第二按鈕
              </button>
            </div>
          ),
        });
      case 'actions.1.tone':
        return (
          <AdminSelectField
            key={field.key}
            label={field.label}
            value={draft.actions[1]?.tone ?? 'secondary'}
            onChange={(value) => updateActionTone(1, value)}
            helpText={field.helpText}
            badgeLabel={visibilityScopeLabel[field.visibilityScope]}
            options={actionToneOptions}
          />
        );
      case 'actions.1.enabled':
        return (
          <AdminToggleField
            key={field.key}
            label={field.label}
            checked={draft.actions[1]?.enabled !== false}
            onChange={(checked) => updateAction(1, (action) => ({ ...action, enabled: checked }))}
            helpText={field.helpText}
            badgeLabel={visibilityScopeLabel[field.visibilityScope]}
          />
        );
      case 'share.buttonLabel':
        return renderTextField(field, draft.share.buttonLabel ?? '', (value) =>
          patchDraft((current) => ({ ...current, share: { ...current.share, buttonLabel: value } })),
        );
      case 'share.title':
        return renderTextField(field, draft.share.title ?? '', (value) =>
          patchDraft((current) => ({ ...current, share: { ...current.share, title: value } })),
        );
      case 'share.text':
        return renderTextField(field, draft.share.text ?? '', (value) =>
          patchDraft((current) => ({ ...current, share: { ...current.share, text: value } })),
        );
      case 'seo.title':
        return renderTextField(field, draft.seo.title, (value) =>
          patchDraft((current) => ({ ...current, seo: { ...current.seo, title: value } })),
        );
      case 'seo.description':
        return renderTextField(field, draft.seo.description, (value) =>
          patchDraft((current) => ({ ...current, seo: { ...current.seo, description: value } })),
        );
      case 'seo.ogTitle':
        return renderTextField(field, draft.seo.ogTitle, (value) =>
          patchDraft((current) => ({ ...current, seo: { ...current.seo, ogTitle: value } })),
        );
      case 'seo.ogDescription':
        return renderTextField(field, draft.seo.ogDescription, (value) =>
          patchDraft((current) => ({ ...current, seo: { ...current.seo, ogDescription: value } })),
        );
      case 'seo.ogImage':
        return renderTextField(
          field,
          draft.seo.ogImage,
          (value) => patchDraft((current) => ({ ...current, seo: { ...current.seo, ogImage: value } })),
          {
            trailing: (
              <div className="admin-inline-actions admin-inline-actions-3">
                <button type="button" className="action-button action-button-secondary" onClick={() => handleAssetUploadClick('ogImage')}>
                  上傳分享圖
                </button>
                <button type="button" className="action-button action-button-secondary" disabled={!isHttpUrl(draft.seo.ogImage)} onClick={() => openExternalUrl(draft.seo.ogImage)}>
                  開新分頁測試
                </button>
              </div>
            ),
          },
        );
      case 'slug':
        return renderTextField(field, draft.slug, () => undefined, { readOnly: true });
      case 'id':
        return renderTextField(field, draft.id, () => undefined, { readOnly: true });
      case 'isPrimary':
        return renderTextField(field, toReadableBoolean(draft.isPrimary), () => undefined, { readOnly: true });
      case 'legacySlugs':
        return renderTextField(field, serializeStringList(draft.legacySlugs), () => undefined, {
          readOnly: true,
          textareaRows: 3,
        });
      case 'appearance.theme':
        return renderTextField(field, draft.appearance.theme, () => undefined, { readOnly: true });
      case 'appearance.layout':
        return renderTextField(field, draft.appearance.layout, () => undefined, { readOnly: true });
      case 'actions.0.id':
        return renderTextField(field, draft.actions[0]?.id ?? '', () => undefined, { readOnly: true });
      case 'actions.1.id':
        return renderTextField(field, draft.actions[1]?.id ?? '', () => undefined, { readOnly: true });
      default:
        return null;
    }
  };

  const renderFieldGroup = (groupKey: AdminFieldGroupKey) => {
    const fields = CARD_RUNTIME_FIELDS_BY_GROUP[groupKey];
    const group = ADMIN_FIELD_GROUPS_BY_KEY[groupKey];
    if (!fields.length) {
      return null;
    }

    return (
      <section key={group.key} className="admin-panel">
        <div className="admin-section-heading">
          <p className="section-label">欄位分組</p>
          <h2 className="admin-panel-title">{group.label}</h2>
          <p className="support-copy">{group.description}</p>
        </div>
        <div className="admin-field-grid">{fields.map((field) => renderField(field))}</div>
        {groupKey === 'assets' ? (
          <>
            <input ref={photoUploadInputRef} type="file" accept="image/*" className="admin-hidden-input" onChange={(event) => void handleAssetUpload('photo', event)} />
            <input ref={ogUploadInputRef} type="file" accept="image/*" className="admin-hidden-input" onChange={(event) => void handleAssetUpload('ogImage', event)} />
            <div className="admin-image-preview-grid">
              <div className="admin-image-preview-card">
                <p className="section-label">主視覺預覽</p>
                {isImagePreviewable(draft.photo.src) ? <img src={draft.photo.src} alt={draft.photo.alt} className="admin-image-preview" /> : <p className="support-copy">請提供可公開存取的正式圖片 URL。</p>}
              </div>
              <div className="admin-image-preview-card">
                <p className="section-label">分享圖預覽</p>
                {isImagePreviewable(draft.seo.ogImage) ? <img src={draft.seo.ogImage} alt={draft.seo.ogTitle || draft.photo.alt} className="admin-image-preview" /> : <p className="support-copy">請提供可公開存取的 OG Image URL。</p>}
              </div>
            </div>
            <StatusBanner status={assetUploadStatus} />
          </>
        ) : null}
      </section>
    );
  };

  async function loadRemoteIntoDraft(skipDirtyConfirm = false, sessionToken = adminSession) {
    if (!apiBaseUrl.trim()) {
      setRemoteStatus({
        tone: 'error',
        text: '目前沒有正式 exec URL，請先設定 `VITE_CARD_API_BASE_URL`。',
      });
      return;
    }

    if (!sessionToken.trim()) {
      setRemoteStatus({
        tone: 'error',
        text: '請先完成管理員解鎖，再載入正式資料。',
      });
      return;
    }

    if (!skipDirtyConfirm && hasUnsavedChanges && !window.confirm('目前有尚未儲存的變更，重新載入正式資料會覆蓋本地草稿。要繼續嗎？')) {
      return;
    }

    setRemoteStatus({
      tone: 'info',
      text: '正在載入正式 runtime config...',
    });

    try {
      const remoteConfig = await fetchRemoteCardConfig(draft.slug, {
        baseUrl: apiBaseUrl,
      });
      applyOfficialConfig(remoteConfig, '已載入正式 runtime config。接下來的修改仍只存在本地草稿，直到你按下儲存。');
      setLastSavedAt(undefined);
      setLastSavedBy(undefined);
      setRemoteStatus({
        tone: 'success',
        text: `已載入 slug「${remoteConfig.slug}」的正式資料。`,
      });
    } catch (error) {
      setRemoteStatus({
        tone: 'error',
        text: handleProtectedActionError(error, '載入正式資料失敗。'),
      });
    }
  }

  useEffect(() => {
    if (hasRestoredSessionRef.current || !apiBaseUrl.trim()) {
      return;
    }

    hasRestoredSessionRef.current = true;
    const savedSession = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    const savedExpiresAt = window.sessionStorage.getItem(ADMIN_SESSION_EXPIRES_AT_STORAGE_KEY) ?? '';
    if (!savedSession) {
      return;
    }

    setUnlockStatus({
      tone: 'info',
      text: '正在恢復本分頁的管理員 session...',
    });

    void verifyAdminSession(savedSession, { baseUrl: apiBaseUrl })
      .then((result) => {
        if (!result.valid) {
          throw new Error('目前管理員 session 已失效，請重新解鎖。');
        }

        setAdminSession(savedSession);
        setSessionExpiresAt(result.expiresAt ?? savedExpiresAt);
        setUnlockStatus({
          tone: 'success',
          text: `已恢復管理員解鎖。${formatSessionLabel(result.expiresAt ?? savedExpiresAt)}`,
        });

        if (!hasExistingLocalDraftRef.current && !draftRestoreState) {
          void loadRemoteIntoDraft(true, savedSession);
        }
      })
      .catch((error) => {
        clearAdminSession();
        setUnlockStatus({
          tone: 'error',
          text: error instanceof Error ? error.message : '恢復管理員解鎖失敗，請重新解鎖。',
        });
      });
  // Session restore only needs to react to env URL and initial local draft state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, draftRestoreState]);

  const handleUnlock = async () => {
    if (!apiBaseUrl.trim()) {
      setUnlockStatus({
        tone: 'error',
        text: '目前沒有正式 exec URL。請先在前端環境設定 `VITE_CARD_API_BASE_URL`。',
      });
      return;
    }

    setUnlockStatus({
      tone: 'info',
      text: '正在驗證管理員身分...',
    });

    try {
      const result = await createAdminSession(unlockSecret, {
        baseUrl: apiBaseUrl,
      });
      setAdminSession(result.adminSession);
      setSessionExpiresAt(result.expiresAt);
      window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, result.adminSession);
      window.sessionStorage.setItem(ADMIN_SESSION_EXPIRES_AT_STORAGE_KEY, result.expiresAt);
      setUnlockSecret('');
      setUnlockStatus({
        tone: 'success',
        text: `管理員解鎖成功。${formatSessionLabel(result.expiresAt)}`,
      });
      await loadRemoteIntoDraft(true, result.adminSession);
    } catch (error) {
      clearAdminSession();
      setUnlockStatus({
        tone: 'error',
        text: error instanceof Error ? error.message : '管理員解鎖失敗。',
      });
    }
  };

  const handleClearUnlock = () => {
    clearAdminSession();
    setUnlockStatus({
      tone: 'info',
      text: '已清除本次解鎖。關閉分頁後也會自動失效。',
    });
  };

  const handleSaveRemote = async () => {
    if (!adminSession.trim()) {
      setRemoteStatus({
        tone: 'error',
        text: '請先完成管理員解鎖，才能儲存正式名片。',
      });
      return;
    }

    if (validationErrors.length > 0) {
      setRemoteStatus({
        tone: 'error',
        text: '目前欄位仍有錯誤，請先修正後再儲存正式名片。',
      });
      return;
    }

    setRemoteStatus({
      tone: 'info',
      text: '正在儲存正式 runtime config...',
    });

    try {
      const result = await saveRemoteCardConfig(draft.slug, draft, {
        baseUrl: apiBaseUrl,
        adminSession,
        updatedBy,
      });
      applyOfficialConfig(result.config, '已完成正式儲存。畫面上的內容就是目前正式名片版本。');
      setLastSavedAt(result.updatedAt);
      setLastSavedBy(result.updatedBy);
      setRemoteStatus({
        tone: 'success',
        text: formatSaveMessage(result.updatedAt, result.updatedBy),
      });
    } catch (error) {
      setRemoteStatus({
        tone: 'error',
        text: handleProtectedActionError(error, '儲存正式名片失敗。'),
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
    setImportFeedback('已將 JSON 套用到本地草稿。若要進入正式名片，仍需按下儲存。');
  };

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(draftSnapshot);
      setExportFeedback('目前本地草稿 JSON 已複製到剪貼簿。');
    } catch {
      setExportFeedback('目前瀏覽器不支援直接複製，請使用下方 JSON 區塊手動保存。');
    }
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
      event.target.value = '';
      return;
    }

    setDraft(normalizeLoadedDraft(parsed.data));
    setImportFeedback('已從 JSON 檔案匯入並套用到本地草稿。');
    event.target.value = '';
  };

  const handleApplyStoredDraft = () => {
    if (!draftRestoreState) {
      return;
    }

    setDraft(cloneCardConfig(draftRestoreState.config));
    setDraftRestoreState(null);
    setLocalDraftNote('已套用瀏覽器中的本地草稿。這份內容尚未送出到正式後台。');
  };

  const handleDiscardStoredDraft = async () => {
    if (!draftRestoreState) {
      return;
    }

    window.localStorage.removeItem(draftRestoreState.key);
    setDraftRestoreState(null);
    setLocalDraftNote('已放棄本地草稿。接著會重新載入正式資料。');
    if (adminSession.trim()) {
      await loadRemoteIntoDraft(true);
    }
  };

  const handleReset = () => {
    if (hasUnsavedChanges && !window.confirm('重設會覆蓋目前未儲存內容。要繼續嗎？')) {
      return;
    }

    const nextDraft = createDefaultCardDraft();
    setDraft(nextDraft);
    setImportText('');
    setImportFeedback('已重設回 bundled 預設內容。這不會修改正式名片。');
    setExportFeedback(null);
    setLocalDraftNote('本地草稿已重設回 bundled 預設內容。若要寫回正式資料，仍需按下儲存。');
  };

  const handleAssetUploadClick = (field: AssetFieldKey) => {
    if (!adminSession.trim()) {
      setAssetUploadStatus({
        activeField: field,
        tone: 'error',
        text: '請先完成管理員解鎖，才能上傳正式圖片。',
      });
      setUnlockStatus({
        tone: 'error',
        text: '圖片上傳需要有效的管理員 session，請先重新解鎖。',
      });
      return;
    }

    if (field === 'photo') {
      photoUploadInputRef.current?.click();
      return;
    }

    ogUploadInputRef.current?.click();
  };

  const handleAssetUpload = async (field: AssetFieldKey, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setAssetUploadStatus({
      activeField: field,
      tone: 'info',
      text: '正在壓縮圖片並上傳到 Google Drive...',
    });

    try {
      const prepared = await prepareImageUpload(file);
      const uploaded = await uploadRuntimeImage({
        slug: draft.slug,
        field,
        adminSession,
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        base64Data: prepared.base64Data,
        baseUrl: apiBaseUrl,
      });

      patchDraft((current) => applyUploadedImageToDraft(current, field, uploaded.publicUrl, file.name));
      setBaselineConfig((current) => applyUploadedImageToDraft(current, field, uploaded.publicUrl, file.name));
      setDraftRestoreState(null);
      setLocalDraftNote('圖片已同步寫入正式 runtime config；其他欄位若有變更，仍需按下儲存才會正式生效。');
      setLastSavedAt(uploaded.updatedAt);
      setLastSavedBy(uploaded.updatedBy);
      setAssetUploadStatus({
        activeField: field,
        tone: 'success',
        text: `圖片已上傳到 Google Drive，並同步寫入正式 ${field === 'photo' ? 'photo.src' : 'seo.ogImage'}。`,
      });
    } catch (error) {
      setAssetUploadStatus({
        activeField: field,
        tone: 'error',
        text: handleProtectedActionError(error, '圖片上傳失敗。'),
      });
    }
  };

  return (
    <main className="page-shell admin-shell">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1 className="admin-title">正式電子名片後台</h1>
          <p className="admin-copy">
            這裡是正式 runtime config 管理台。解鎖後即可直接編輯文字、按鈕、分享文案與圖片資產，儲存後會同步影響前台卡片與 LINE 分享 Flex。
          </p>
        </div>
        <div className="admin-note-card">
          <p className="section-label">營運狀態</p>
          <p className={`support-copy ${hasUnsavedChanges ? 'admin-dirty-copy' : ''}`}>
            {hasUnsavedChanges ? '尚未儲存變更。重新整理或離開頁面前會提醒。' : '目前沒有未儲存變更。'}
          </p>
          <p className="support-copy">{localDraftNote}</p>
          <p className="support-copy">{latestSaveLabel || '本分頁尚未完成正式儲存。'}</p>
          <p className="support-copy">{isUnlocked ? formatSessionLabel(sessionExpiresAt) : '尚未解鎖。'}</p>
          <p className="support-copy">{apiBaseUrl ? `正式 exec URL 已設定。` : '正式 exec URL 尚未設定。'}</p>
        </div>
      </section>

      <section className="admin-panel admin-panel-spacious">
        <div className="admin-section-heading">
          <p className="section-label">管理員解鎖</p>
          <h2 className="admin-panel-title">一次解鎖，本分頁有效</h2>
        </div>
        <div className="admin-unlock-layout">
          <AdminTextField
            label="管理員解鎖密碼"
            value={unlockSecret}
            onChange={setUnlockSecret}
            type="password"
            placeholder="輸入 ADMIN_WRITE_SECRET"
            helpText="前端不保存真正 secret；送出後只保留短期 admin session 到 sessionStorage。"
            badgeLabel="系統"
          />
          <div className="admin-inline-actions">
            <button type="button" className="action-button action-button-primary" onClick={() => void handleUnlock()}>
              管理員解鎖
            </button>
            <button type="button" className="action-button action-button-secondary" onClick={handleClearUnlock}>
              清除本次解鎖
            </button>
          </div>
        </div>
        <StatusBanner status={unlockStatus} />
      </section>

      {!isUnlocked ? (
        <section className="admin-panel admin-panel-spacious">
          <div className="admin-section-heading">
            <p className="section-label">待解鎖</p>
            <h2 className="admin-panel-title">先解鎖，再進入正式內容管理台</h2>
          </div>
          <p className="support-copy">
            `/admin/` 現在只作為正式後台使用，不再提供手動 exec URL、舊 backend、或 Cloudinary 工程設定入口。
          </p>
          {draftRestoreState ? (
            <p className="support-copy">本瀏覽器有未送出的本地草稿；解鎖後可選擇套用或放棄。</p>
          ) : null}
          <StatusBanner status={remoteStatus} />
        </section>
      ) : null}

      {isUnlocked ? (
        <>
          {draftRestoreState ? (
            <section className="admin-panel admin-restore-banner">
              <div className="admin-section-heading">
                <p className="section-label">本地草稿提示</p>
                <h2 className="admin-panel-title">偵測到未送出的瀏覽器草稿</h2>
              </div>
              <p className="support-copy">這份草稿尚未覆蓋正式資料。你可以先套用檢查，或丟棄後重新載入正式 runtime config。</p>
              <div className="admin-inline-actions">
                <button type="button" className="action-button action-button-secondary" onClick={handleApplyStoredDraft}>
                  套用本地草稿
                </button>
                <button type="button" className="action-button action-button-primary" onClick={() => void handleDiscardStoredDraft()}>
                  放棄草稿並重新載入
                </button>
              </div>
            </section>
          ) : null}

          <section className="admin-layout">
            <div className="admin-form-column">
              {ADMIN_FIELD_GROUPS.filter((group) => group.key !== 'system').map((group) => renderFieldGroup(group.key))}

              <section className="admin-panel">
                <details className="admin-system-details" open={ADMIN_FIELD_GROUPS_BY_KEY.system.defaultOpen}>
                  <summary className="admin-details-summary">系統欄位與保留設定</summary>
                  <div className="admin-details-body">
                    <p className="support-copy">{ADMIN_FIELD_GROUPS_BY_KEY.system.description}</p>
                    <div className="admin-field-grid">{CARD_RUNTIME_FIELDS_BY_GROUP.system.map((field) => renderField(field))}</div>
                  </div>
                </details>
              </section>

              <section className="admin-panel">
                <div className="admin-section-heading">
                  <p className="section-label">系統資訊</p>
                  <h2 className="admin-panel-title">儲存、重載與 session 狀態</h2>
                </div>
                <div className="admin-field-grid">
                  <AdminTextField label="Updated By" value={updatedBy} onChange={setUpdatedBy} placeholder="例如 admin@sunner.tw" helpText="saveCard request 會把這個欄位送到 `updatedBy`，方便追蹤最後修改者。" badgeLabel="系統" />
                  <AdminTextField label="更新時間" value={lastSavedAt ?? ''} onChange={() => undefined} helpText="最後一次成功儲存後，後台回傳的 `updatedAt` 會顯示在這裡。" badgeLabel="系統" readOnly />
                  <div className="admin-info-card">
                    <p className="section-label">解鎖狀態</p>
                    <p className="support-copy">{isUnlocked ? '目前已解鎖，可儲存與上傳圖片。' : '尚未解鎖，儲存與圖片上傳會被擋下。'}</p>
                    <p className="support-copy">{sessionExpiresAt ? `Session 到期：${sessionExpiresAt}` : '本分頁沒有有效 session。'}</p>
                  </div>
                  <div className="admin-info-card">
                    <p className="section-label">最後寫入</p>
                    <p className="support-copy">{latestSaveLabel || '尚未在本分頁成功儲存。'}</p>
                    <p className="support-copy">{`正式 slug：${draft.slug}`}</p>
                  </div>
                </div>
                <div className="admin-inline-actions admin-inline-actions-3">
                  <button type="button" className="action-button action-button-secondary" onClick={() => void loadRemoteIntoDraft()}>
                    重新載入正式資料
                  </button>
                  <button type="button" className="action-button action-button-secondary" onClick={handleReset}>
                    重設成本地預設
                  </button>
                  <button type="button" className="action-button action-button-primary" onClick={() => void handleSaveRemote()}>
                    儲存正式名片
                  </button>
                </div>
                <StatusBanner status={remoteStatus} />
              </section>

              <section className="admin-panel">
                <div className="admin-section-heading">
                  <p className="section-label">進階設定</p>
                  <h2 className="admin-panel-title">草稿工具與 JSON 匯入匯出</h2>
                </div>
                <details open={advancedSettingsOpen} onToggle={(event) => setAdvancedSettingsOpen((event.target as HTMLDetailsElement).open)}>
                  <summary className="admin-details-summary">展開草稿工具</summary>
                  <div className="admin-details-body">
                    <div className="admin-inline-actions admin-inline-actions-3">
                      <button type="button" className="action-button action-button-secondary" onClick={handleExport}>
                        複製 JSON 草稿
                      </button>
                      <button type="button" className="action-button action-button-secondary" onClick={handleImport}>
                        套用 JSON 草稿
                      </button>
                      <label className="action-button action-button-secondary admin-file-button">
                        匯入 JSON 檔
                        <input type="file" accept="application/json" className="admin-hidden-input" onChange={(event) => void handleImportFile(event)} />
                      </label>
                    </div>
                    {importFeedback ? <p className="feedback-message">{importFeedback}</p> : null}
                    {exportFeedback ? <p className="feedback-message">{exportFeedback}</p> : null}
                    <AdminTextField
                      label="JSON 草稿"
                      value={importText}
                      onChange={setImportText}
                      textareaRows={10}
                      helpText="方便比對與手動貼上 runtime config。"
                      badgeLabel="系統"
                      full
                    />
                  </div>
                </details>
              </section>
            </div>

            <aside className="admin-preview-column">
              <section className="admin-panel admin-panel-sticky">
                <div className="admin-section-heading">
                  <p className="section-label">正式預覽</p>
                  <h2 className="admin-panel-title">目前草稿渲染結果</h2>
                </div>
                {validationErrors.length > 0 ? (
                  <div className="admin-validation">
                    <p className="support-copy">以下欄位仍需修正，否則不能儲存正式名片：</p>
                    <ul className="admin-validation-list">
                      {validationErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <CardPage config={draft} previewMode embedded />
              </section>
            </aside>
          </section>
        </>
      ) : null}
    </main>
  );
}

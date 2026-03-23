import { assertCardConfig } from '../content/cards/schema';
import type { CardActionConfig, CardConfig, CardStylesConfig } from '../content/cards/types';
import { isAllowedLink, isHttpUrl, isRelativeAssetPath } from '../lib/card-validation';
import { CARD_STYLE_REGISTRY } from '../lib/card-style-registry';

/**
 * Pure helpers for AdminPage state shaping. Keep runtime keys, save payload
 * shape, and field semantics unchanged.
 */
export const ADMIN_TITLE = '正式電子名片後台';
export const ADMIN_DESCRIPTION = '管理正式 runtime config、圖片資產、分享文案與按鈕設定。';
export const ADMIN_SESSION_STORAGE_KEY = 'line-liff-card.admin-session';
export const ADMIN_SESSION_EXPIRES_AT_STORAGE_KEY = 'line-liff-card.admin-session-expires-at';
export const ADMIN_UPDATED_BY_STORAGE_KEY = 'line-liff-card.admin-updated-by';

export type StatusTone = 'success' | 'error' | 'info';
export type AssetFieldKey = 'photo' | 'ogImage';

export type StatusMessage = {
  tone: StatusTone;
  text: string;
};

export type DraftRestoreState = {
  key: string;
  config: CardConfig;
} | null;

export type AssetUploadState = {
  activeField: AssetFieldKey | null;
  text: string;
  tone: StatusTone;
} | null;

export const serializeStringList = (value: string[]): string => value.join('\n');

export const parseStringList = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

export const toReadableBoolean = (value: boolean): string => (value ? 'true' : 'false');

export const formatSaveMessage = (updatedAt?: string, updatedBy?: string): string => {
  const detail = [updatedAt ? `更新時間：${updatedAt}` : '', updatedBy ? `更新者：${updatedBy}` : '']
    .filter(Boolean)
    .join('｜');
  return detail ? `正式名片已儲存。${detail}` : '正式名片已儲存。';
};

export const normalizeAction = (action: CardActionConfig, fallbackId: string): CardActionConfig => ({
  id: action.id || fallbackId,
  label: action.label ?? '',
  url: action.url ?? '',
  tone: action.tone ?? 'secondary',
  enabled: action.enabled ?? true,
});

const normalizeStyles = (styles: CardStylesConfig | undefined): CardStylesConfig =>
  Object.fromEntries(
    CARD_STYLE_REGISTRY.map((field) => [field.key, styles?.[field.key] ?? '']),
  ) as CardStylesConfig;

export const coerceDraft = (draft: CardConfig): CardConfig => ({
  ...draft,
  styles: normalizeStyles(draft.styles),
  actions: draft.actions.slice(0, 2).map((action, index) =>
    normalizeAction(action, index === 0 ? 'contact' : 'services'),
  ),
  share: {
    ...draft.share,
    buttonLabel: draft.share.buttonLabel?.trim() || '分享此電子名片給 LINE 好友',
  },
});

export const normalizeLoadedDraft = (draft: CardConfig): CardConfig => {
  assertCardConfig(draft);
  return coerceDraft(draft);
};

export const isImagePreviewable = (value: string): boolean => {
  const trimmed = value.trim();
  return Boolean(trimmed) && (trimmed.startsWith('data:') || trimmed.startsWith('/') || isHttpUrl(trimmed) || isRelativeAssetPath(trimmed));
};

export const getImageFieldError = (value: string, label: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return `${label} 不能為空。`;
  }

  return isImagePreviewable(trimmed) ? null : `${label} 格式不正確。`;
};

export const getLinkFieldError = (value: string, label: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return isAllowedLink(trimmed) ? null : `${label} 格式不正確。`;
};

export const formatSessionLabel = (expiresAt?: string): string =>
  expiresAt ? `已解鎖，本次 session 到期時間：${expiresAt}` : '已解鎖，本次 session 有效。';

export const applyUploadedImageToDraft = (
  draft: CardConfig,
  field: AssetFieldKey,
  publicUrl: string,
  fileName: string,
): CardConfig =>
  field === 'photo'
    ? {
        ...draft,
        photo: {
          ...draft.photo,
          src: publicUrl,
          alt: draft.photo.alt || fileName,
        },
      }
    : {
        ...draft,
        seo: {
          ...draft.seo,
          ogImage: publicUrl,
        },
      };

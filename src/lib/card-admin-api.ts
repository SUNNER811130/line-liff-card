import type { CardConfig } from '../content/cards/types';

/**
 * Backend envelope and request helpers for the bound Apps Script Web App.
 * Keep request body shape, content-type, and response field fallbacks stable.
 */
type CardApiDataEnvelope = {
  config?: unknown;
  card?: unknown;
  cards?: unknown;
};

export type CardRecordSummary = {
  slug: string;
  isLive: boolean;
  versionId?: string;
  publishedAt?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type CardApiSuccessEnvelope = {
  ok: true;
  action?: string;
  slug?: string;
  cards?: unknown;
  updatedAt?: string;
  updatedBy?: string;
  valid?: boolean;
  expiresAt?: string;
  adminSession?: string;
  fileId?: string;
  publicUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  mimeType?: string;
  source?: string;
  config?: unknown;
  card?: unknown;
  data?: CardApiDataEnvelope;
  status?: Record<string, unknown>;
  versionId?: string;
  publishedAt?: string;
};

export type CardApiErrorEnvelope = {
  ok?: false;
  action?: string;
  error?: string;
  message?: string;
};

export type CardApiEnvelope = CardApiSuccessEnvelope | CardApiErrorEnvelope;

export type SaveCardRequest = {
  action: 'saveCard';
  slug: string;
  config: CardConfig;
  adminSession: string;
  updatedBy?: string;
};

export type PublishSnapshotRequest = {
  action: 'publishSnapshot';
  slug: string;
  config: CardConfig;
  adminSession: string;
  updatedBy?: string;
};

export type CreateAdminSessionRequest = {
  action: 'createAdminSession';
  secret: string;
};

export type VerifyAdminSessionRequest = {
  action: 'verifyAdminSession';
  adminSession: string;
};

export type UploadImageRequest = {
  action: 'uploadImage';
  adminSession: string;
  slug: string;
  field: string;
  fileName: string;
  mimeType: string;
  base64Data: string;
};

export const extractCardsFromEnvelope = (payload: CardApiEnvelope): unknown =>
  'cards' in payload && payload.cards !== undefined
    ? payload.cards
    : 'data' in payload
      ? payload.data?.cards
      : undefined;

export const createCardApiPostInit = (payload: Record<string, unknown>): RequestInit => ({
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain;charset=UTF-8',
  },
  body: JSON.stringify(payload),
});

export const resolveCardApiBaseUrl = (baseUrl?: string): string => baseUrl?.trim() ?? '';

export const buildCardApiUrl = (baseUrl: string, params: Record<string, string>): string => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
};

export const extractConfigFromEnvelope = (payload: CardApiEnvelope): unknown =>
  'config' in payload && payload.config !== undefined
    ? payload.config
    : 'card' in payload && payload.card !== undefined
      ? payload.card
      : 'data' in payload && payload.data?.config !== undefined
        ? payload.data.config
        : 'data' in payload
          ? payload.data?.card
          : undefined;

export const readCardApiJsonResponse = async (response: Response): Promise<CardApiEnvelope> => {
  const text = await response.text();
  if (!text) {
    throw new Error('後台沒有回傳 JSON 內容。');
  }

  try {
    return JSON.parse(text) as CardApiEnvelope;
  } catch {
    throw new Error('後台回傳的內容不是有效 JSON。');
  }
};

export const getCardApiErrorMessage = (payload: CardApiEnvelope, fallback: string): string => {
  if ('error' in payload && payload.error) {
    return payload.error;
  }

  if ('message' in payload && payload.message) {
    return payload.message;
  }

  return fallback;
};

export const requireCardApiBaseUrl = (baseUrl?: string): string => {
  const normalizedBaseUrl = resolveCardApiBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    throw new Error('未設定正式後台 exec URL。');
  }

  return normalizedBaseUrl;
};

export const requireAdminSessionToken = (adminSession: string): string => {
  const trimmedSession = adminSession.trim();
  if (!trimmedSession) {
    throw new Error('請先完成管理員解鎖。');
  }

  return trimmedSession;
};

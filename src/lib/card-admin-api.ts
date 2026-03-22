import type { CardConfig } from '../content/cards/types';

type CardApiDataEnvelope = {
  config?: unknown;
  card?: unknown;
};

export type CardApiSuccessEnvelope = {
  ok: true;
  action?: string;
  slug?: string;
  updatedAt?: string;
  updatedBy?: string;
  valid?: boolean;
  expiresAt?: string;
  adminSession?: string;
  cloudName?: string;
  apiKey?: string;
  folder?: string;
  signature?: string;
  publicId?: string;
  uploadUrl?: string;
  timestamp?: number;
  source?: string;
  config?: unknown;
  card?: unknown;
  data?: CardApiDataEnvelope;
  initialized?: boolean;
  seededDefault?: boolean;
  replacedExisting?: boolean;
  scriptPropertiesUpdated?: boolean;
  status?: Record<string, unknown>;
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
  writeToken?: string;
  adminSession?: string;
  updatedBy?: string;
};

export type InitBackendRequest = {
  action: 'initBackend';
  writeToken: string;
  updatedBy?: string;
  config?: CardConfig;
  slug?: string;
  force?: boolean;
  seedDefault?: boolean;
};

export type CreateAdminSessionRequest = {
  action: 'createAdminSession';
  secret: string;
};

export type VerifyAdminSessionRequest = {
  action: 'verifyAdminSession';
  adminSession: string;
};

export type SignUploadRequest = {
  action: 'signUpload';
  adminSession: string;
  slug: string;
  field: string;
  fileName?: string;
};

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

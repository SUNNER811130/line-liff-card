import { assertCardConfig } from '../content/cards/schema';
import type { CardConfig } from '../content/cards/types';
import { defaultCardSlug, getBundledCardBySlug, primaryCard } from '../content/cards';
import {
  buildCardApiUrl,
  createCardApiPostInit,
  type CreateAdminSessionRequest,
  extractCardsFromEnvelope,
  extractConfigFromEnvelope,
  type CardRecordSummary,
  getCardApiErrorMessage,
  type PublishSnapshotRequest,
  requireAdminSessionToken,
  requireCardApiBaseUrl,
  readCardApiJsonResponse,
  type SaveCardRequest,
  type UploadImageRequest,
  type VerifyAdminSessionRequest,
} from './card-admin-api';
import { getCanonicalCardSlug } from './routes';

type FetchLike = typeof fetch;

export type RuntimeCardResult = {
  config: CardConfig;
  source: 'remote' | 'bundled';
  message?: string;
};

export type SaveRuntimeCardResult = {
  config: CardConfig;
  slug: string;
  updatedAt?: string;
  updatedBy?: string;
  versionId?: string;
  publishedAt?: string;
};

export type AdminSessionResult = {
  adminSession: string;
  expiresAt: string;
};

export type VerifyAdminSessionResult = {
  valid: boolean;
  expiresAt?: string;
};

export type UploadedImageResult = {
  fileId: string;
  publicUrl: string;
  viewUrl?: string;
  downloadUrl?: string;
  mimeType?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export class CardNotFoundError extends Error {
  constructor(slug: string) {
    super(`找不到 slug「${slug}」對應的正式卡片。`);
    this.name = 'CardNotFoundError';
  }
}

const DEFAULT_FETCH: FetchLike = (...args) => fetch(...args);

/**
 * Runtime data adapter shared by `/card/default/` and `/admin/`. Preserve the
 * existing GAS exec URL contract, fallback behavior, and CardConfig shape.
 */
export const getCardApiBaseUrl = (): string => import.meta.env.VITE_CARD_API_BASE_URL?.trim() ?? '';

const validateRemoteConfig = (config: unknown, expectedSlug: string): CardConfig => {
  assertCardConfig(config);

  if (config.slug !== expectedSlug) {
    throw new Error(`遠端卡片 slug 不一致，預期 ${expectedSlug}，實際為 ${config.slug}。`);
  }

  return config;
};

const isCardNotFoundError = (error: unknown): boolean =>
  error instanceof Error && /Card not found|找不到.+正式卡片/.test(error.message);
export const getBundledRuntimeCard = (slug: string): CardConfig | undefined =>
  getBundledCardBySlug(getCanonicalCardSlug(slug));

export const getBundledPrimaryCard = (): CardConfig => primaryCard;

export async function fetchRemoteCardConfig(
  slug: string,
  options: {
    baseUrl?: string;
    fetchImpl?: FetchLike;
    signal?: AbortSignal;
  } = {},
): Promise<CardConfig> {
  const expectedSlug = getCanonicalCardSlug(slug || defaultCardSlug);
  const baseUrl = requireCardApiBaseUrl(options.baseUrl ?? getCardApiBaseUrl());

  const response = await (options.fetchImpl ?? DEFAULT_FETCH)(buildCardApiUrl(baseUrl, { action: 'getCard', slug: expectedSlug }), {
    method: 'GET',
    cache: 'no-store',
    signal: options.signal,
  });
  const payload = await readCardApiJsonResponse(response);

  if (!response.ok || payload.ok === false) {
    const message = getCardApiErrorMessage(payload, `載入正式資料失敗（${response.status}）。`);
    if (/Card not found/i.test(message)) {
      throw new CardNotFoundError(expectedSlug);
    }

    throw new Error(message);
  }

  const remoteConfig = extractConfigFromEnvelope(payload);
  if (remoteConfig === undefined) {
    throw new Error('後台回傳成功，但缺少 config。');
  }

  return validateRemoteConfig(remoteConfig, expectedSlug);
}

export async function loadRuntimeCard(
  slug: string,
  options: {
    baseUrl?: string;
    fetchImpl?: FetchLike;
    signal?: AbortSignal;
  } = {},
): Promise<RuntimeCardResult> {
  const bundled = getBundledRuntimeCard(slug);
  if (!bundled && !(options.baseUrl ?? getCardApiBaseUrl()).trim()) {
    throw new CardNotFoundError(slug);
  }

  try {
    const remoteConfig = await fetchRemoteCardConfig(slug, options);
    return {
      config: remoteConfig,
      source: 'remote',
      message: '已載入正式後台資料。',
    };
  } catch (error) {
    if (!bundled) {
      if (isCardNotFoundError(error)) {
        throw error;
      }

      throw new Error(error instanceof Error ? error.message : `載入 slug「${slug}」失敗。`);
    }

    return {
      config: bundled,
      source: 'bundled',
      message: error instanceof Error ? error.message : '遠端正式資料不可用，已改用 bundled config。',
    };
  }
}

export async function saveRemoteCardConfig(
  slug: string,
  config: CardConfig,
  options: {
    baseUrl?: string;
    adminSession: string;
    updatedBy?: string;
    fetchImpl?: FetchLike;
  },
): Promise<SaveRuntimeCardResult> {
  const expectedSlug = getCanonicalCardSlug(slug || config.slug || defaultCardSlug);
  const baseUrl = requireCardApiBaseUrl(options.baseUrl ?? getCardApiBaseUrl());
  const adminSession = requireAdminSessionToken(options.adminSession);

  const validatedConfig = validateRemoteConfig(config, expectedSlug);
  const requestBody: SaveCardRequest = {
    action: 'saveCard',
    slug: expectedSlug,
    config: validatedConfig,
    updatedBy: options.updatedBy?.trim() ?? '',
    adminSession,
  };
  const response = await (options.fetchImpl ?? DEFAULT_FETCH)(baseUrl, createCardApiPostInit(requestBody));
  const payload = await readCardApiJsonResponse(response);

  if (!response.ok || payload.ok === false) {
    throw new Error(getCardApiErrorMessage(payload, `儲存正式資料失敗（${response.status}）。`));
  }

  const responseConfig = extractConfigFromEnvelope(payload) ?? validatedConfig;
  return {
    config: validateRemoteConfig(responseConfig, expectedSlug),
    slug: expectedSlug,
    updatedAt: 'updatedAt' in payload ? payload.updatedAt : undefined,
    updatedBy: 'updatedBy' in payload ? payload.updatedBy : undefined,
    versionId: 'versionId' in payload ? payload.versionId : undefined,
    publishedAt: 'publishedAt' in payload ? payload.publishedAt : undefined,
  };
}

export async function publishSnapshotCard(
  slug: string,
  config: CardConfig,
  options: {
    baseUrl?: string;
    adminSession: string;
    updatedBy?: string;
    fetchImpl?: FetchLike;
  },
): Promise<SaveRuntimeCardResult> {
  const expectedSlug = getCanonicalCardSlug(slug || config.slug || defaultCardSlug);
  const baseUrl = requireCardApiBaseUrl(options.baseUrl ?? getCardApiBaseUrl());
  const adminSession = requireAdminSessionToken(options.adminSession);
  const validatedConfig = validateRemoteConfig(config, expectedSlug);
  const requestBody: PublishSnapshotRequest = {
    action: 'publishSnapshot',
    slug: expectedSlug,
    config: validatedConfig,
    updatedBy: options.updatedBy?.trim() ?? '',
    adminSession,
  };
  const response = await (options.fetchImpl ?? DEFAULT_FETCH)(baseUrl, createCardApiPostInit(requestBody));
  const payload = await readCardApiJsonResponse(response);

  if (!response.ok || payload.ok === false) {
    throw new Error(getCardApiErrorMessage(payload, `發佈快照失敗（${response.status}）。`));
  }

  const responseConfig = extractConfigFromEnvelope(payload);
  if (responseConfig === undefined) {
    throw new Error('後台沒有回傳快照 config。');
  }

  const snapshotSlug = 'slug' in payload && typeof payload.slug === 'string' && payload.slug ? payload.slug : expectedSlug;
  return {
    config: validateRemoteConfig(responseConfig, snapshotSlug),
    slug: snapshotSlug,
    updatedAt: 'updatedAt' in payload ? payload.updatedAt : undefined,
    updatedBy: 'updatedBy' in payload ? payload.updatedBy : undefined,
    versionId: 'versionId' in payload ? payload.versionId : undefined,
    publishedAt: 'publishedAt' in payload ? payload.publishedAt : undefined,
  };
}

export async function createAdminSession(
  secret: string,
  options: {
    baseUrl?: string;
    fetchImpl?: FetchLike;
  } = {},
): Promise<AdminSessionResult> {
  const baseUrl = requireCardApiBaseUrl(options.baseUrl ?? getCardApiBaseUrl());

  const trimmedSecret = secret.trim();
  if (!trimmedSecret) {
    throw new Error('請輸入管理員解鎖密碼。');
  }

  const requestBody: CreateAdminSessionRequest = {
    action: 'createAdminSession',
    secret: trimmedSecret,
  };
  const response = await (options.fetchImpl ?? DEFAULT_FETCH)(baseUrl, createCardApiPostInit(requestBody));
  const payload = await readCardApiJsonResponse(response);

  if (!response.ok || payload.ok === false) {
    throw new Error(getCardApiErrorMessage(payload, `管理員解鎖失敗（${response.status}）。`));
  }

  if (!('adminSession' in payload) || typeof payload.adminSession !== 'string' || !payload.adminSession) {
    throw new Error('後台沒有回傳有效的管理員 session。');
  }

  if (!('expiresAt' in payload) || typeof payload.expiresAt !== 'string' || !payload.expiresAt) {
    throw new Error('後台沒有回傳 session 到期時間。');
  }

  return {
    adminSession: payload.adminSession,
    expiresAt: payload.expiresAt,
  };
}

export async function verifyAdminSession(
  adminSession: string,
  options: {
    baseUrl?: string;
    fetchImpl?: FetchLike;
  } = {},
): Promise<VerifyAdminSessionResult> {
  const baseUrl = requireCardApiBaseUrl(options.baseUrl ?? getCardApiBaseUrl());

  const trimmedSession = adminSession.trim();
  if (!trimmedSession) {
    return { valid: false };
  }

  const requestBody: VerifyAdminSessionRequest = {
    action: 'verifyAdminSession',
    adminSession: trimmedSession,
  };
  const response = await (options.fetchImpl ?? DEFAULT_FETCH)(baseUrl, createCardApiPostInit(requestBody));
  const payload = await readCardApiJsonResponse(response);

  if (!response.ok || payload.ok === false) {
    return { valid: false };
  }

  return {
    valid: 'valid' in payload ? payload.valid === true : true,
    expiresAt: 'expiresAt' in payload && typeof payload.expiresAt === 'string' ? payload.expiresAt : undefined,
  };
}

export async function uploadRuntimeImage(
  options: {
    slug: string;
    field: string;
    adminSession: string;
    fileName: string;
    mimeType: string;
    base64Data: string;
    baseUrl?: string;
    fetchImpl?: FetchLike;
  },
): Promise<UploadedImageResult> {
  const baseUrl = requireCardApiBaseUrl(options.baseUrl ?? getCardApiBaseUrl());
  const trimmedSession = requireAdminSessionToken(options.adminSession);

  const requestBody: UploadImageRequest = {
    action: 'uploadImage',
    adminSession: trimmedSession,
    slug: getCanonicalCardSlug(options.slug || defaultCardSlug),
    field: options.field.trim(),
    fileName: options.fileName.trim(),
    mimeType: options.mimeType.trim(),
    base64Data: options.base64Data.trim(),
  };
  const response = await (options.fetchImpl ?? DEFAULT_FETCH)(baseUrl, createCardApiPostInit(requestBody));
  const payload = await readCardApiJsonResponse(response);

  if (!response.ok || payload.ok === false) {
    throw new Error(getCardApiErrorMessage(payload, `圖片上傳失敗（${response.status}）。`));
  }

  const requiredKeys = ['fileId', 'publicUrl'] as const;
  const payloadRecord = payload as Record<string, unknown>;
  for (const key of requiredKeys) {
    if (!(key in payloadRecord) || typeof payloadRecord[key] !== 'string' || !payloadRecord[key]) {
      throw new Error(`後台缺少圖片回應欄位：${key}。`);
    }
  }

  const successPayload = payload as {
    fileId: string;
    publicUrl: string;
    viewUrl?: string;
    downloadUrl?: string;
    mimeType?: string;
    updatedAt?: string;
    updatedBy?: string;
  };

  return {
    fileId: successPayload.fileId,
    publicUrl: successPayload.publicUrl,
    viewUrl: successPayload.viewUrl,
    downloadUrl: successPayload.downloadUrl,
    mimeType: successPayload.mimeType,
    updatedAt: successPayload.updatedAt,
    updatedBy: successPayload.updatedBy,
  };
}

export async function listRemoteCards(
  options: {
    baseUrl?: string;
    fetchImpl?: FetchLike;
    signal?: AbortSignal;
  } = {},
): Promise<CardRecordSummary[]> {
  const baseUrl = requireCardApiBaseUrl(options.baseUrl ?? getCardApiBaseUrl());
  const response = await (options.fetchImpl ?? DEFAULT_FETCH)(buildCardApiUrl(baseUrl, { action: 'listCards' }), {
    method: 'GET',
    cache: 'no-store',
    signal: options.signal,
  });
  const payload = await readCardApiJsonResponse(response);

  if (!response.ok || payload.ok === false) {
    throw new Error(getCardApiErrorMessage(payload, `載入版本列表失敗（${response.status}）。`));
  }

  const cards = extractCardsFromEnvelope(payload);
  if (!Array.isArray(cards)) {
    throw new Error('後台沒有回傳版本列表。');
  }

  return cards.map((card) => {
    if (!card || typeof card !== 'object') {
      throw new Error('版本列表格式不正確。');
    }

    const record = card as Record<string, unknown>;
    return {
      slug: String(record.slug || ''),
      isLive: record.isLive === true,
      versionId: typeof record.versionId === 'string' ? record.versionId : undefined,
      publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : undefined,
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
      updatedBy: typeof record.updatedBy === 'string' ? record.updatedBy : undefined,
    };
  });
}

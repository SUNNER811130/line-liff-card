import { assertCardConfig } from '../content/cards/schema';
import type { CardConfig } from '../content/cards/types';
import { defaultCardSlug, getBundledCardBySlug, primaryCard } from '../content/cards';
import {
  buildCardApiUrl,
  extractConfigFromEnvelope,
  getCardApiErrorMessage,
  readCardApiJsonResponse,
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
};

const DEFAULT_FETCH: FetchLike = (...args) => fetch(...args);

export const getCardApiBaseUrl = (): string => import.meta.env.VITE_CARD_API_BASE_URL?.trim() ?? '';

const normalizeBaseUrl = (baseUrl?: string): string => baseUrl?.trim() ?? '';

const validateRemoteConfig = (config: unknown, expectedSlug: string): CardConfig => {
  assertCardConfig(config);

  if (config.slug !== expectedSlug) {
    throw new Error(`遠端卡片 slug 不一致，預期 ${expectedSlug}，實際為 ${config.slug}。`);
  }

  return config;
};
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
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? getCardApiBaseUrl());
  if (!baseUrl) {
    throw new Error('未設定正式後台 API Base URL。');
  }

  const response = await (options.fetchImpl ?? DEFAULT_FETCH)(buildCardApiUrl(baseUrl, { action: 'getCard', slug: expectedSlug }), {
    method: 'GET',
    signal: options.signal,
  });
  const payload = await readCardApiJsonResponse(response);

  if (!response.ok || payload.ok === false) {
    throw new Error(getCardApiErrorMessage(payload, `載入正式資料失敗（${response.status}）。`));
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
  if (!bundled) {
    throw new Error(`找不到 slug「${slug}」對應的 bundled card。`);
  }

  try {
    const remoteConfig = await fetchRemoteCardConfig(slug, options);
    return {
      config: remoteConfig,
      source: 'remote',
      message: '已載入正式後台資料。',
    };
  } catch (error) {
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
    writeToken: string;
    updatedBy?: string;
    fetchImpl?: FetchLike;
  },
): Promise<SaveRuntimeCardResult> {
  const expectedSlug = getCanonicalCardSlug(slug || config.slug || defaultCardSlug);
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? getCardApiBaseUrl());
  if (!baseUrl) {
    throw new Error('未設定正式後台 API Base URL。');
  }

  const writeToken = options.writeToken.trim();
  if (!writeToken) {
    throw new Error('請先輸入 write token。');
  }

  const validatedConfig = validateRemoteConfig(config, expectedSlug);
  const response = await (options.fetchImpl ?? DEFAULT_FETCH)(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'saveCard',
      slug: expectedSlug,
      config: validatedConfig,
      writeToken,
      updatedBy: options.updatedBy?.trim() ?? '',
    }),
  });
  const payload = await readCardApiJsonResponse(response);

  if (!response.ok || payload.ok === false) {
    throw new Error(getCardApiErrorMessage(payload, `儲存正式資料失敗（${response.status}）。`));
  }

  const responseConfig = extractConfigFromEnvelope(payload) ?? validatedConfig;
  return {
    config: validateRemoteConfig(responseConfig, expectedSlug),
    slug: expectedSlug,
    updatedAt: 'updatedAt' in payload ? payload.updatedAt : undefined,
  };
}

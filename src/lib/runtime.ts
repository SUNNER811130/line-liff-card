export const getLiffId = (): string | undefined => import.meta.env.VITE_LIFF_ID?.trim() || undefined;

export type AppMode = 'WEB-PREVIEW' | 'LIFF-READY' | 'IN-LIFF' | 'SHARE-AVAILABLE';

type AppModeInput = {
  hasLiffId: boolean;
  inClient: boolean;
  shareAvailable: boolean;
  initFailed?: boolean;
};

export const getAppMode = ({
  hasLiffId,
  inClient,
  shareAvailable,
  initFailed = false,
}: AppModeInput): AppMode => {
  if (!hasLiffId || initFailed) {
    return 'WEB-PREVIEW';
  }

  if (shareAvailable) {
    return 'SHARE-AVAILABLE';
  }

  if (inClient) {
    return 'IN-LIFF';
  }

  return 'LIFF-READY';
};

const PLACEHOLDER_PATTERNS = [
  /(^|\.)example\.(com|org|net)$/i,
  /^line\.ee$/i,
];

const isPlaceholderValue = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  if (trimmed.startsWith('mailto:')) {
    return /@example\.(com|org|net)$/i.test(trimmed);
  }

  try {
    const url = new URL(trimmed, 'https://placeholder.local');
    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(url.hostname)) || /(^|\/)example($|[/?#])/i.test(url.pathname);
  } catch {
    return /^#?$/.test(trimmed);
  }
};

export const getPublicPageUrl = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const currentUrl = new URL(window.location.pathname + window.location.search + window.location.hash, window.location.origin);
  return currentUrl.toString();
};

export const resolveActionUrl = (value: string, fallbackUrl: string): string => {
  if (isPlaceholderValue(value)) {
    return fallbackUrl;
  }

  try {
    return new URL(value, fallbackUrl).toString();
  } catch {
    return fallbackUrl;
  }
};

export const toAssetUrl = (assetPath: string): string => {
  if (/^(https?:)?\/\//.test(assetPath)) {
    return assetPath;
  }

  const normalizedAssetPath = assetPath.replace(/^\/+/, '');
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(normalizedAssetPath, baseUrl).toString();
};

export const getLiffId = (): string | undefined => import.meta.env.VITE_LIFF_ID?.trim() || undefined;

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

export const getAbsoluteUrl = (pathname: string): string => {
  if (typeof window === 'undefined') {
    const siteUrl = import.meta.env.VITE_SITE_URL?.trim();
    return siteUrl ? new URL(pathname, siteUrl).toString() : pathname;
  }

  return new URL(pathname, window.location.origin).toString();
};

export const navigateToUrl = (targetUrl: string) => {
  window.location.assign(targetUrl);
};

const GOOGLE_DRIVE_THUMBNAIL_SIZE = 'w2000';

const normalizeGoogleDriveAssetUrl = (assetUrl: string): string => {
  try {
    const url = new URL(assetUrl);
    if (url.hostname !== 'drive.google.com') {
      return assetUrl;
    }

    let fileId = url.searchParams.get('id')?.trim() ?? '';
    if (!fileId) {
      const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      fileId = fileMatch?.[1]?.trim() ?? '';
    }

    if (!fileId) {
      return assetUrl;
    }

    const normalized = new URL('https://drive.google.com/thumbnail');
    normalized.searchParams.set('id', fileId);
    normalized.searchParams.set('sz', GOOGLE_DRIVE_THUMBNAIL_SIZE);
    return normalized.toString();
  } catch {
    return assetUrl;
  }
};

export const getPreviewAssetUrl = (assetPath: string): string => {
  if (/^(https?:)?\/\//.test(assetPath)) {
    return normalizeGoogleDriveAssetUrl(assetPath);
  }

  const normalizedAssetPath = assetPath.replace(/^\/+/, '');
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(normalizedAssetPath, baseUrl).toString();
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
  return getPreviewAssetUrl(assetPath);
};

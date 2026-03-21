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

export const getPublicPageUrl = (): string =>
  typeof window === 'undefined' ? '' : window.location.href;

export const toAssetUrl = (assetPath: string): string => {
  if (/^(https?:)?\/\//.test(assetPath)) {
    return assetPath;
  }

  const normalizedAssetPath = assetPath.replace(/^\/+/, '');
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(normalizedAssetPath, baseUrl).toString();
};

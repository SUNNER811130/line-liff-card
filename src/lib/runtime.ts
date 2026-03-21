export const getLiffId = (): string | undefined => import.meta.env.VITE_LIFF_ID;

export const getAppMode = (): 'web-preview' | 'liff-ready' =>
  getLiffId() ? 'liff-ready' : 'web-preview';

export const getPublicPageUrl = (): string => window.location.href;

export const toAssetUrl = (assetPath: string): string => {
  if (/^(https?:)?\/\//.test(assetPath)) {
    return assetPath;
  }

  const normalizedAssetPath = assetPath.replace(/^\/+/, '');
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(normalizedAssetPath, baseUrl).toString();
};

export type LiffInitResult =
  | {
      status: 'disabled';
      message: string;
    }
  | {
      status: 'ready';
    }
  | {
      status: 'error';
      message: string;
    };

type LiffSdk = {
  init: (config: { liffId: string }) => Promise<void>;
  isInClient: () => boolean;
  isLoggedIn: () => boolean;
  login: (config: { redirectUri: string }) => void;
  isApiAvailable: (apiName: string) => boolean;
  shareTargetPicker: (messages: unknown[]) => Promise<unknown>;
  permanentLink: {
    createUrlBy: (url: string) => Promise<string>;
  };
  use: (module: object) => unknown;
};

type LiffModuleCtor = new () => object;

const LIFF_REDIRECT_QUERY_KEYS = [
  'access_token',
  'id_token',
  'liff.state',
  'liff.referrer',
  'liffClientId',
  'liffRedirectUri',
];

let initPromise: Promise<LiffInitResult> | null = null;
let lastInitResult: LiffInitResult | null = null;
let liffSdkPromise: Promise<LiffSdk> | null = null;

export const getConfiguredLiffId = () => import.meta.env.VITE_LIFF_ID?.trim();
export const getConfiguredSiteUrl = () => import.meta.env.VITE_SITE_URL?.trim();

const hasWindow = () => typeof window !== 'undefined';

const toUrl = (value: string): URL => {
  if (hasWindow()) {
    return new URL(value, window.location.href);
  }

  return new URL(value);
};

const normalizePathname = (pathname: string): string => {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const getEndpointUrl = (): URL | null => {
  const siteUrl = getConfiguredSiteUrl();
  if (!siteUrl) {
    return null;
  }

  try {
    return toUrl(siteUrl);
  } catch {
    return null;
  }
};

const getCurrentWindowUrl = (): URL => {
  if (!hasWindow()) {
    throw new Error('目前環境無法取得網址。');
  }

  return new URL(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
    window.location.origin,
  );
};

const cleanupLoginRedirectUrl = () => {
  if (!hasWindow()) {
    return;
  }

  const currentUrl = getCurrentWindowUrl();
  let changed = false;

  LIFF_REDIRECT_QUERY_KEYS.forEach((key) => {
    if (currentUrl.searchParams.has(key)) {
      currentUrl.searchParams.delete(key);
      changed = true;
    }
  });

  if (!changed) {
    return;
  }

  const sanitizedPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
  window.history.replaceState(window.history.state, '', sanitizedPath);
};

const installLiffModule = async (
  sdk: LiffSdk,
  loader: Promise<{ default: LiffModuleCtor }>,
) => {
  const { default: ModuleCtor } = await loader;
  sdk.use(new ModuleCtor());
};

const loadLiffSdk = async (): Promise<LiffSdk> => {
  if (!liffSdkPromise) {
    liffSdkPromise = (async () => {
      const [{ default: liffCore }, ...modules] = await Promise.all([
        import('@line/liff/core'),
        import('@line/liff/is-in-client'),
        import('@line/liff/is-logged-in'),
        import('@line/liff/login'),
        import('@line/liff/is-api-available'),
        import('@line/liff/share-target-picker'),
        import('@line/liff/permanent-link'),
      ]);

      const sdk = liffCore as unknown as LiffSdk;
      await Promise.all(modules.map((moduleLoader) => installLiffModule(sdk, Promise.resolve(moduleLoader))));
      return sdk;
    })();
  }

  return liffSdkPromise;
};

export const getExpectedEndpoint = (): string =>
  getEndpointUrl()?.toString() ?? '未設定 VITE_SITE_URL';

export const getLiffEntryUrl = (): string => {
  const liffId = getConfiguredLiffId();
  return liffId ? `https://liff.line.me/${liffId}` : '';
};

export const getCurrentUrl = (): string => {
  cleanupLoginRedirectUrl();
  return getCurrentWindowUrl().toString();
};

export const isCurrentUrlWithinEndpoint = (targetUrl = hasWindow() ? getCurrentUrl() : ''): boolean => {
  const endpointUrl = getEndpointUrl();
  if (!endpointUrl || !targetUrl) {
    return true;
  }

  const target = toUrl(targetUrl);
  return (
    target.origin === endpointUrl.origin &&
    normalizePathname(target.pathname).startsWith(normalizePathname(endpointUrl.pathname))
  );
};

export const getEndpointFallbackUrl = (): string =>
  getEndpointUrl()?.toString() || (hasWindow() ? getCurrentUrl() : '');

const getEndpointMismatchMessage = (targetUrl: string) => {
  const endpointUrl = getEndpointUrl();
  if (!endpointUrl) {
    return '未設定 VITE_SITE_URL，無法驗證 LIFF Endpoint URL 範圍。';
  }

  return `目前頁面 ${toUrl(targetUrl).toString()} 不在 LIFF Endpoint URL 範圍內，請改由 ${endpointUrl.toString()} 或 LIFF URL 開啟。`;
};

const assertUrlWithinEndpoint = (targetUrl: string) => {
  if (!isCurrentUrlWithinEndpoint(targetUrl)) {
    throw new Error(getEndpointMismatchMessage(targetUrl));
  }
};

export async function initLiff(): Promise<LiffInitResult> {
  if (lastInitResult) {
    return lastInitResult;
  }

  const liffId = getConfiguredLiffId();
  if (!liffId) {
    lastInitResult = {
      status: 'disabled',
      message: '未設定 VITE_LIFF_ID，已使用 web-preview mode。',
    };
    return lastInitResult;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const currentUrl = getCurrentUrl();
        assertUrlWithinEndpoint(currentUrl);
        const sdk = await loadLiffSdk();
        await sdk.init({ liffId });
        lastInitResult = { status: 'ready' };
        return lastInitResult;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'LIFF 初始化失敗，請確認 LIFF Endpoint URL 與目前頁面路徑。';
        lastInitResult = { status: 'error', message };
        return lastInitResult;
      }
    })();
  }

  return initPromise;
}

export async function isInClient(): Promise<boolean> {
  const liffId = getConfiguredLiffId();
  if (!liffId || !lastInitResult || lastInitResult.status !== 'ready') {
    return false;
  }

  const sdk = await loadLiffSdk();
  return sdk.isInClient();
}

export async function isLoggedIn(): Promise<boolean> {
  const liffId = getConfiguredLiffId();
  if (!liffId || !lastInitResult || lastInitResult.status !== 'ready') {
    return false;
  }

  const sdk = await loadLiffSdk();
  return sdk.isLoggedIn();
}

export async function ensureLogin(): Promise<boolean> {
  if (!getConfiguredLiffId()) {
    return false;
  }

  const initResult = await initLiff();
  if (initResult.status !== 'ready') {
    return false;
  }

  const sdk = await loadLiffSdk();
  if (sdk.isLoggedIn()) {
    return true;
  }

  if (!hasWindow()) {
    return false;
  }

  sdk.login({ redirectUri: getCurrentUrl() });
  return false;
}

export async function isShareAvailable(): Promise<boolean> {
  const liffId = getConfiguredLiffId();
  if (!liffId || !lastInitResult || lastInitResult.status !== 'ready') {
    return false;
  }

  const sdk = await loadLiffSdk();
  return sdk.isApiAvailable('shareTargetPicker');
}

export async function createPermanentLink(url?: string): Promise<string> {
  if (!getConfiguredLiffId()) {
    throw new Error('未設定 VITE_LIFF_ID，無法建立 LIFF permanent link。');
  }

  const initResult = await initLiff();
  if (initResult.status === 'error') {
    throw new Error(initResult.message);
  }

  if (initResult.status === 'disabled') {
    throw new Error(initResult.message);
  }

  const targetUrl = url ?? getCurrentUrl();
  assertUrlWithinEndpoint(targetUrl);

  const sdk = await loadLiffSdk();
  return sdk.permanentLink.createUrlBy(toUrl(targetUrl).toString());
}

export async function buildShareTargetUrl(url?: string): Promise<string> {
  const targetUrl = url ?? (hasWindow() ? getCurrentUrl() : '');
  const liffEntryUrl = getLiffEntryUrl();

  if (!getConfiguredLiffId()) {
    return targetUrl;
  }

  if (!isCurrentUrlWithinEndpoint(targetUrl)) {
    return liffEntryUrl || getEndpointFallbackUrl() || targetUrl;
  }

  try {
    return await createPermanentLink(targetUrl);
  } catch {
    return liffEntryUrl || getEndpointFallbackUrl() || targetUrl;
  }
}

export async function shareCard(messages: unknown[]): Promise<unknown> {
  const initResult = await initLiff();
  if (initResult.status !== 'ready') {
    throw new Error(
      initResult.status === 'error' ? initResult.message : '未設定 VITE_LIFF_ID，無法啟用 LIFF 分享。',
    );
  }

  const sdk = await loadLiffSdk();
  return sdk.shareTargetPicker(messages);
}

export function __resetLiffForTests() {
  initPromise = null;
  lastInitResult = null;
  liffSdkPromise = null;
}

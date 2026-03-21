import liff from '@line/liff';

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

let initPromise: Promise<LiffInitResult> | null = null;
let lastInitResult: LiffInitResult | null = null;

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

export const getExpectedEndpoint = (): string =>
  getEndpointUrl()?.toString() ?? '未設定 VITE_SITE_URL';

export const getLiffEntryUrl = (): string => {
  const liffId = getConfiguredLiffId();
  return liffId ? `https://liff.line.me/${liffId}` : '';
};

const isUnderEndpointUrl = (target: URL, endpoint: URL): boolean =>
  target.origin === endpoint.origin &&
  normalizePathname(target.pathname).startsWith(normalizePathname(endpoint.pathname));

const assertUrlWithinEndpoint = (targetUrl: string) => {
  const endpointUrl = getEndpointUrl();
  if (!endpointUrl) {
    return;
  }

  const target = toUrl(targetUrl);
  if (!isUnderEndpointUrl(target, endpointUrl)) {
    throw new Error(
      `目前頁面不在 LIFF Endpoint URL 範圍內，請確認網址位於 ${endpointUrl.toString()} 之下。`,
    );
  }
};

const getCurrentUrl = () => {
  if (!hasWindow()) {
    throw new Error('目前環境無法取得網址。');
  }

  return new URL(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
    window.location.origin,
  ).toString();
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
        assertUrlWithinEndpoint(getCurrentUrl());
        await liff.init({ liffId });
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

export function isInClient(): boolean {
  const liffId = getConfiguredLiffId();
  if (!liffId || !lastInitResult || lastInitResult.status !== 'ready') {
    return false;
  }

  return liff.isInClient();
}

export function isLoggedIn(): boolean {
  const liffId = getConfiguredLiffId();
  if (!liffId || !lastInitResult || lastInitResult.status !== 'ready') {
    return false;
  }

  return liff.isLoggedIn();
}

export function ensureLogin(): boolean {
  if (!getConfiguredLiffId()) {
    return false;
  }

  if (isLoggedIn()) {
    return true;
  }

  if (!hasWindow()) {
    return false;
  }

  liff.login({ redirectUri: getCurrentUrl() });
  return false;
}

export function isShareAvailable(): boolean {
  const liffId = getConfiguredLiffId();
  if (!liffId || !lastInitResult || lastInitResult.status !== 'ready') {
    return false;
  }

  return liff.isApiAvailable('shareTargetPicker');
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

  return liff.permanentLink.createUrlBy(toUrl(targetUrl).toString());
}

export async function buildShareTargetUrl(url?: string): Promise<string> {
  const targetUrl = url ?? (hasWindow() ? getCurrentUrl() : '');

  if (!getConfiguredLiffId()) {
    return targetUrl;
  }

  try {
    return await createPermanentLink(targetUrl);
  } catch {
    return getLiffEntryUrl() || targetUrl;
  }
}

export function __resetLiffForTests() {
  initPromise = null;
  lastInitResult = null;
}

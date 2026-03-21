const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, '');

const normalizeBasePath = (basePath: string): string => {
  const trimmed = trimSlashes(basePath);
  return trimmed ? `/${trimmed}/` : '/';
};

const getPathSegments = (pathname: string, basePath: string): string[] => {
  const normalizedBasePath = normalizeBasePath(basePath);
  const trimmedPathname = pathname.startsWith(normalizedBasePath)
    ? pathname.slice(normalizedBasePath.length)
    : pathname.replace(/^\/+/, '');

  return trimSlashes(trimmedPathname).split('/').filter(Boolean);
};

export const getCardPath = (slug: string, basePath: string = import.meta.env.BASE_URL): string => {
  const normalizedBasePath = normalizeBasePath(basePath);
  return `${normalizedBasePath}card/${trimSlashes(slug)}/`;
};

export const getAppHomePath = (basePath: string = import.meta.env.BASE_URL): string =>
  normalizeBasePath(basePath);

const getSiteOrigin = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim();
  if (configuredSiteUrl) {
    return new URL(configuredSiteUrl).origin;
  }

  return 'https://example.invalid';
};

export const getCardWebUrl = (slug: string, basePath: string = import.meta.env.BASE_URL): string =>
  new URL(getCardPath(slug, basePath), `${getSiteOrigin()}${getAppHomePath(basePath)}`).toString();

export const getCardLiffUrl = (slug: string, liffId = import.meta.env.VITE_LIFF_ID?.trim()): string => {
  if (!liffId) {
    return '';
  }

  return `https://liff.line.me/${liffId}/card/${trimSlashes(slug)}/`;
};

export const getCardShareUrl = (slug: string): string => getCardLiffUrl(slug) || getCardWebUrl(slug);

export type AppRoute =
  | { kind: 'home' }
  | { kind: 'admin' }
  | { kind: 'card'; slug: string }
  | { kind: 'not-found'; slug: string | null };

export const resolveAppRoute = (
  pathname: string,
  basePath: string = import.meta.env.BASE_URL,
): AppRoute => {
  const segments = getPathSegments(pathname, basePath);

  if (segments.length === 0) {
    return { kind: 'home' };
  }

  if (segments[0] === 'admin') {
    return { kind: 'admin' };
  }

  if (segments[0] === 'card' && segments[1]) {
    return { kind: 'card', slug: segments[1] };
  }

  return { kind: 'not-found', slug: segments[1] ?? segments[0] ?? null };
};

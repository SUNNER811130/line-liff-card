const hasFileExtension = (pathname: string): boolean => /\.[^/]+$/.test(pathname);

const normalizeBasePath = (basePath: string): string => {
  const trimmed = basePath.trim();

  if (!trimmed || trimmed === '/') {
    return '/';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
};

const normalizeRoutePath = (routePath: string): string => {
  const normalizedPath = `/${routePath.replace(/^\/+/, '')}`;

  if (!hasFileExtension(normalizedPath) && !normalizedPath.endsWith('/')) {
    return `${normalizedPath}/`;
  }

  return normalizedPath;
};

export const resolvePagesRedirectUrl = (currentUrl: string, basePath: string): string | null => {
  const url = new URL(currentUrl);
  const routePath = url.searchParams.get('p');

  if (!routePath) {
    return null;
  }

  const restoredUrl = new URL(url.origin);
  restoredUrl.pathname = `${normalizeBasePath(basePath).replace(/\/$/, '')}${normalizeRoutePath(routePath)}`;

  const routeQuery = url.searchParams.get('q');
  restoredUrl.search = routeQuery ? `?${routeQuery}` : '';
  restoredUrl.hash = url.hash;

  return restoredUrl.toString();
};

export const restorePagesLocation = (
  currentWindow: Pick<Window, 'location' | 'history'>,
  basePath: string = import.meta.env.BASE_URL,
): boolean => {
  const restoredUrl = resolvePagesRedirectUrl(currentWindow.location.href, basePath);

  if (!restoredUrl) {
    return false;
  }

  const url = new URL(restoredUrl);
  currentWindow.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
};

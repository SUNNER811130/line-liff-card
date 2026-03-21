type EnvLike = Record<string, string | undefined>;

function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim();

  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const withoutEdgeSlashes = trimmed.replace(/^\/+|\/+$/g, '');
  return `/${withoutEdgeSlashes}/`;
}

export function resolveBasePath(env: EnvLike = process.env): string {
  const explicitBasePath = env.VITE_BASE_PATH;
  if (explicitBasePath) {
    return normalizeBasePath(explicitBasePath);
  }

  const repository = env.GITHUB_REPOSITORY;
  if (!repository) {
    return '/';
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    return '/';
  }

  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return '/';
  }

  return normalizeBasePath(repo);
}

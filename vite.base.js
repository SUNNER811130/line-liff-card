function normalizeBasePath(basePath) {
    var trimmed = basePath.trim();
    if (!trimmed || trimmed === '/') {
        return '/';
    }
    var withoutEdgeSlashes = trimmed.replace(/^\/+|\/+$/g, '');
    return "/".concat(withoutEdgeSlashes, "/");
}
export function resolveBasePath(env) {
    if (env === void 0) { env = process.env; }
    var explicitBasePath = env.VITE_BASE_PATH;
    if (explicitBasePath) {
        return normalizeBasePath(explicitBasePath);
    }
    var repository = env.GITHUB_REPOSITORY;
    if (!repository) {
        return '/';
    }
    var _a = repository.split('/'), owner = _a[0], repo = _a[1];
    if (!owner || !repo) {
        return '/';
    }
    if (repo.toLowerCase() === "".concat(owner.toLowerCase(), ".github.io")) {
        return '/';
    }
    return normalizeBasePath(repo);
}

import { resolveBasePath } from '../../vite.base';

describe('resolveBasePath', () => {
  it('uses explicit VITE_BASE_PATH when provided', () => {
    expect(resolveBasePath({ VITE_BASE_PATH: 'custom-path' })).toBe('/custom-path/');
  });

  it('derives a project Pages base path from GITHUB_REPOSITORY', () => {
    expect(resolveBasePath({ GITHUB_REPOSITORY: 'usersun/line-liff-card' })).toBe('/line-liff-card/');
  });

  it('uses root base path for user pages repositories', () => {
    expect(resolveBasePath({ GITHUB_REPOSITORY: 'usersun/usersun.github.io' })).toBe('/');
  });
});

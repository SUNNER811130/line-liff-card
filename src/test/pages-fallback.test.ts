import { resolvePagesRedirectUrl } from '../lib/pages-fallback';

describe('resolvePagesRedirectUrl', () => {
  it('restores a project pages route under the repo base path', () => {
    expect(
      resolvePagesRedirectUrl(
        'https://usersun.github.io/line-liff-card/?p=card%2Fdefault%2F',
        '/line-liff-card/',
      ),
    ).toBe('https://usersun.github.io/line-liff-card/card/default/');
  });

  it('preserves search and hash parameters from the fallback redirect', () => {
    expect(
      resolvePagesRedirectUrl(
        'https://usersun.github.io/line-liff-card/?p=card%2Fdefault&q=ref%3Dabc#hero',
        '/line-liff-card/',
      ),
    ).toBe('https://usersun.github.io/line-liff-card/card/default/?ref=abc#hero');
  });

  it('restores arbitrary card slug routes under the repo base path', () => {
    expect(
      resolvePagesRedirectUrl(
        'https://usersun.github.io/line-liff-card/?p=card%2Fdemo-consultant%2F',
        '/line-liff-card/',
      ),
    ).toBe('https://usersun.github.io/line-liff-card/card/demo-consultant/');
  });

  it('restores the admin route under the repo base path', () => {
    expect(
      resolvePagesRedirectUrl(
        'https://usersun.github.io/line-liff-card/?p=admin%2F',
        '/line-liff-card/',
      ),
    ).toBe('https://usersun.github.io/line-liff-card/admin/');
  });

  it('returns null when no fallback redirect is present', () => {
    expect(resolvePagesRedirectUrl('https://usersun.github.io/line-liff-card/', '/line-liff-card/')).toBeNull();
  });
});

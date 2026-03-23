import { describe, expect, it, vi } from 'vitest';

describe('runtime asset urls', () => {
  it('normalizes legacy Drive uc image urls to stable thumbnail urls', async () => {
    const { toAssetUrl } = await import('../lib/runtime');

    expect(toAssetUrl('https://drive.google.com/uc?export=view&id=drive-file-123')).toBe(
      'https://drive.google.com/thumbnail?id=drive-file-123&sz=w2000',
    );
  });

  it('normalizes Drive file view urls to stable thumbnail urls', async () => {
    const { toAssetUrl } = await import('../lib/runtime');

    expect(toAssetUrl('https://drive.google.com/file/d/drive-file-123/view?usp=sharing')).toBe(
      'https://drive.google.com/thumbnail?id=drive-file-123&sz=w2000',
    );
  });

  it('keeps non-Drive absolute urls unchanged', async () => {
    const { toAssetUrl } = await import('../lib/runtime');

    expect(toAssetUrl('https://cdn.example.test/runtime-hero.jpg')).toBe(
      'https://cdn.example.test/runtime-hero.jpg',
    );
  });

  it('resolves relative asset paths against the vite base url', async () => {
    vi.stubEnv('BASE_URL', '/line-liff-card/');
    window.history.replaceState({}, '', '/card/default/');
    const { toAssetUrl } = await import('../lib/runtime');

    expect(toAssetUrl('images/hero-placeholder.svg')).toBe(
      `${window.location.origin}/line-liff-card/images/hero-placeholder.svg`,
    );
  });
});

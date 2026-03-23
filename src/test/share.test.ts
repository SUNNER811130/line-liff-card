import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultCard } from '../content/cards/default';
import { cloneCardConfig } from '../content/cards/draft';

describe('share helpers', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/card/default/');
  });

  it('builds a flex payload with a third forward-share footer button', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    const { FLEX_FORWARD_SHARE_LABEL, buildFlexMessage } = await import('../lib/share');

    const message = buildFlexMessage(
      defaultCard,
      'https://liff.line.me/mock-permalink',
      'https://example.test/card/default/',
    );
    const buttons = message.contents.footer.contents;

    expect(buttons).toHaveLength(3);
    expect(message.contents.hero).toMatchObject({
      size: 'full',
      aspectRatio: '4:3',
      aspectMode: 'cover',
    });
    expect(buttons[2]).toMatchObject({
      type: 'button',
      style: 'link',
      action: {
        type: 'uri',
        label: FLEX_FORWARD_SHARE_LABEL,
        uri: 'https://liff.line.me/test-liff-id/card/default/?intent=share&source=flex-forward',
      },
    });
  });

  it('canonicalizes legacy slug forward-share url back to the formal default card', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    const { buildFlexForwardShareUrl } = await import('../lib/share');

    expect(buildFlexForwardShareUrl('demo-consultant')).toBe(
      'https://liff.line.me/test-liff-id/card/default/?intent=share&source=flex-forward',
    );
  });

  it('keeps the page share handoff on the canonical LIFF route with a one-time intent id', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    const { buildLiffShareIntentUrl } = await import('../lib/share');

    const url = buildLiffShareIntentUrl('demo-consultant');

    expect(url).toMatch(
      /^https:\/\/liff\.line\.me\/test-liff-id\/card\/default\/\?intent=share&source=page-share&intentId=/,
    );
    expect(window.sessionStorage.getItem('line-liff-card:share-intent:pending')).toBeTruthy();
  });

  it('bootstraps a one-time pending intent when a recipient opens the flex forward-share url', async () => {
    const { clearShareIntent, getActiveShareIntent } = await import('../lib/share');
    window.history.replaceState({}, '', '/card/default/?intent=share&source=flex-forward');

    const activeIntent = getActiveShareIntent();

    expect(activeIntent.active).toBe(true);
    if (!activeIntent.active) {
      throw new Error('expected active share intent');
    }

    expect(window.sessionStorage.getItem('line-liff-card:share-intent:pending')).toBe(activeIntent.intentId);
    expect(window.location.search).toContain('intentId=');

    clearShareIntent();

    expect(window.location.search).toBe('');
    expect(window.sessionStorage.getItem('line-liff-card:share-intent:pending')).toBeNull();
  });

  it('builds flex content from the current runtime config instead of hardcoded bundled text', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    const runtimeConfig = cloneCardConfig(defaultCard);
    runtimeConfig.content.fullName = 'Runtime 名稱';
    runtimeConfig.content.brandName = 'Runtime 品牌';
    runtimeConfig.photo.src = 'https://cdn.example.test/runtime-hero.jpg';
    runtimeConfig.actions[0].label = 'Runtime 第一按鈕';
    const { buildFlexMessage } = await import('../lib/share');

    const message = buildFlexMessage(
      runtimeConfig,
      'https://liff.line.me/mock-permalink',
      'https://example.test/card/default/',
    );

    expect(message.altText).toBe('Runtime 名稱｜Runtime 品牌');
    expect(message.contents.hero.url).toBe('https://cdn.example.test/runtime-hero.jpg');
    expect(message.contents.footer.contents[0]).toMatchObject({
      action: {
        label: 'Runtime 第一按鈕',
      },
    });
  });

  it('keeps the flex output valid when new style keys are blank', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    const runtimeConfig = cloneCardConfig(defaultCard);
    runtimeConfig.styles = {
      brandTextColor: '',
      nameFontSize: '',
      sectionGap: '',
      flexBodyLineHeight: '',
    };
    const { buildFlexMessage } = await import('../lib/share');

    const message = buildFlexMessage(
      runtimeConfig,
      'https://liff.line.me/mock-permalink',
      'https://example.test/card/default/',
    );

    expect(message.contents.body).toMatchObject({
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
    });
    expect(message.contents.body.contents[0]).toMatchObject({
      type: 'text',
      size: '12px',
    });
    expect(message.contents.body.contents[4]).toMatchObject({
      type: 'text',
      lineSpacing: '4px',
    });
  });

  it('renders subtitle into the flex body with its own style tokens', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    const runtimeConfig = cloneCardConfig(defaultCard);
    runtimeConfig.content.subheadline = '副標進 Flex';
    runtimeConfig.styles = {
      ...runtimeConfig.styles,
      subtitleTextColor: '#7a6542',
      subtitleFontSize: '17',
    };
    const { buildFlexMessage } = await import('../lib/share');

    const message = buildFlexMessage(
      runtimeConfig,
      'https://liff.line.me/mock-permalink',
      'https://example.test/card/default/',
    );

    expect(message.contents.body.contents[3]).toMatchObject({
      type: 'text',
      text: '副標進 Flex',
      color: '#7a6542',
      size: '17px',
    });
  });

  it('omits the subtitle block from flex when the value is blank', async () => {
    vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
    const runtimeConfig = cloneCardConfig(defaultCard);
    runtimeConfig.content.subheadline = '   ';
    const { buildFlexMessage } = await import('../lib/share');

    const message = buildFlexMessage(
      runtimeConfig,
      'https://liff.line.me/mock-permalink',
      'https://example.test/card/default/',
    );

    expect(message.contents.body.contents).toHaveLength(4);
    expect(message.contents.body.contents.some((item) => 'text' in item && item.text === '   ')).toBe(false);
  });
});

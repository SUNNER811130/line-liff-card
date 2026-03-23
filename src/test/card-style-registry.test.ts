import { describe, expect, it } from 'vitest';
import { cloneCardConfig } from '../content/cards/draft';
import { defaultCard } from '../content/cards/default';
import {
  buildCardWebStyleVariables,
  buildFlexStyleTokens,
  FLEX_HERO_IMAGE_ASPECT_RATIO,
  FLEX_HERO_IMAGE_ASPECT_MODE,
  FLEX_HERO_IMAGE_SIZE,
} from '../lib/card-style-registry';
import { buildFlexMessage } from '../lib/share';

describe('card style registry', () => {
  it('falls back to formal defaults when style keys are missing or blank', () => {
    const config = cloneCardConfig(defaultCard);
    config.styles = {
      brandTextColor: '',
      primaryButtonBackgroundColor: '',
    };

    expect(buildCardWebStyleVariables(config)).toMatchObject({
      '--card-brand-color': '#66758b',
      '--card-primary-button-bg': 'var(--accent)',
      '--card-name-size': 'clamp(2.5rem, 8vw, 4.6rem)',
      '--card-subtitle-size': '1rem',
    });

    expect(buildFlexStyleTokens(config)).toMatchObject({
      brandTextColor: '#37506b',
      primaryButtonBackgroundColor: '#163863',
      nameFontSize: '28px',
      subtitleFontSize: '13px',
    });
  });

  it('keeps legacy web subheadline size as the fallback when the new subtitle size is absent', () => {
    const config = cloneCardConfig(defaultCard);
    config.styles = {
      ...config.styles,
      subheadlineFontSize: '22',
      subtitleFontSize: '',
    };

    expect(buildCardWebStyleVariables(config)).toMatchObject({
      '--card-subtitle-size': '22px',
      '--card-subheadline-size': '22px',
    });
  });

  it('preserves the shared hero image source and fixed flex hero ratio', () => {
    const config = cloneCardConfig(defaultCard);
    config.photo.src = 'https://cdn.example.test/shared-hero.jpg';

    const message = buildFlexMessage(config, 'https://example.test/share', 'https://example.test/card/default/');

    expect(FLEX_HERO_IMAGE_SIZE).toBe('full');
    expect(FLEX_HERO_IMAGE_ASPECT_RATIO).toBe('4:3');
    expect(FLEX_HERO_IMAGE_ASPECT_MODE).toBe('cover');
    expect(message.contents.hero).toMatchObject({
      url: 'https://cdn.example.test/shared-hero.jpg',
      size: 'full',
      aspectRatio: '4:3',
      aspectMode: 'cover',
    });
  });

  it('applies configured style tokens to both web variables and flex output', () => {
    const config = cloneCardConfig(defaultCard);
    config.styles = {
      ...config.styles,
      nameFontSize: '32',
      subtitleTextColor: '#556677',
      subtitleFontSize: '18',
      introTextColor: '#334455',
      sectionGap: '20',
      flexBodyLineHeight: '6',
    };

    const webVariables = buildCardWebStyleVariables(config);
    const flexTokens = buildFlexStyleTokens(config);
    const message = buildFlexMessage(config, 'https://example.test/share', 'https://example.test/card/default/');

    expect(webVariables).toMatchObject({
      '--card-name-size': '32px',
      '--card-intro-color': '#334455',
      '--card-section-gap': '20px',
    });
    expect(flexTokens).toMatchObject({
      nameFontSize: '32px',
      subtitleTextColor: '#556677',
      subtitleFontSize: '18px',
      introTextColor: '#334455',
      sectionGap: '20px',
      bodyLineHeight: '6px',
    });
    expect(message.contents.body.contents[1]).toMatchObject({
      size: '32px',
    });
    expect(message.contents.body.contents[3]).toMatchObject({
      color: '#556677',
      size: '18px',
    });
    expect(message.contents.body.contents[4]).toMatchObject({
      color: '#334455',
      lineSpacing: '6px',
      margin: '20px',
    });
  });
});

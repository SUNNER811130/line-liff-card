import { describe, expect, it } from 'vitest';
import { cloneCardConfig } from '../content/cards/draft';
import { defaultCard } from '../content/cards/default';
import {
  buildCardHeroStyleTokens,
  buildCardWebStyleVariables,
  buildFlexStyleTokens,
  FLEX_BUBBLE_SIZE,
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
    expect(FLEX_BUBBLE_SIZE).toBe('mega');
    expect(message.contents.hero).toMatchObject({
      url: 'https://cdn.example.test/shared-hero.jpg',
      size: 'full',
      aspectRatio: '4:3',
      aspectMode: 'cover',
    });
    expect(message.contents.size).toBe('mega');
  });

  it('applies configured style tokens to both web variables and flex output', () => {
    const config = cloneCardConfig(defaultCard);
    config.styles = {
      ...config.styles,
      brandFontWeight: 'medium',
      nameFontWeight: 'bold',
      titleFontWeight: 'medium',
      subtitleFontWeight: 'bold',
      introFontWeight: 'medium',
      buttonFontWeight: 'medium',
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
      '--card-brand-weight': '500',
      '--card-name-weight': '700',
      '--card-title-weight': '500',
      '--card-subtitle-weight': '700',
      '--card-intro-weight': '500',
      '--card-button-weight': '500',
      '--card-name-size': '32px',
      '--card-intro-color': '#334455',
      '--card-section-gap': '20px',
    });
    expect(flexTokens).toMatchObject({
      brandFontWeight: 'bold',
      nameFontWeight: 'bold',
      titleFontWeight: 'bold',
      subtitleFontWeight: 'bold',
      introFontWeight: 'bold',
      nameFontSize: '32px',
      subtitleTextColor: '#556677',
      subtitleFontSize: '18px',
      introTextColor: '#334455',
      sectionGap: '20px',
      bodyLineHeight: '6px',
    });
    expect(message.contents.body.contents[1]).toMatchObject({
      size: '32px',
      weight: 'bold',
    });
    expect(message.contents.body.contents[3]).toMatchObject({
      color: '#556677',
      size: '18px',
      weight: 'bold',
    });
    expect(message.contents.body.contents[4]).toMatchObject({
      color: '#334455',
      lineSpacing: '6px',
      margin: '20px',
      weight: 'bold',
    });
  });

  it('falls back hero layout keys to the current production defaults when absent or blank', () => {
    const config = cloneCardConfig(defaultCard);
    config.styles = {
      ...config.styles,
      heroAspectRatio: '',
      heroAspectMode: '',
      flexBubbleSize: '',
      heroZoom: '',
      heroFocalX: '',
      heroFocalY: '',
    };

    expect(buildCardHeroStyleTokens(config.styles)).toMatchObject({
      webAspectRatio: 'auto',
      flexAspectRatio: '4:3',
      aspectMode: 'cover',
      bubbleSize: 'mega',
      zoomPercent: 100,
      focalX: 0,
      focalY: 0,
      objectPosition: '50.00% 50.00%',
    });
  });

  it('maps configured hero controls into web variables and flex tokens', () => {
    const config = cloneCardConfig(defaultCard);
    config.styles = {
      ...config.styles,
      heroAspectRatio: '20:13',
      heroAspectMode: 'contain',
      flexBubbleSize: 'giga',
      heroZoom: '135',
      heroFocalX: '-20',
      heroFocalY: '40',
    };

    expect(buildCardWebStyleVariables(config)).toMatchObject({
      '--card-hero-aspect-ratio': '20 / 13',
      '--card-hero-object-fit': 'contain',
      '--card-hero-scale': '1.35',
      '--card-hero-object-position': '40.00% 70.00%',
    });

    expect(buildFlexStyleTokens(config)).toMatchObject({
      bubbleSize: 'giga',
      heroAspectRatio: '20:13',
      heroAspectMode: 'contain',
    });
  });
});

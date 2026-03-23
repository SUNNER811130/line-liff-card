import type { CardConfig, CardStylesConfig } from '../content/cards/types';

export const FLEX_HERO_IMAGE_ASPECT_RATIO = '4:3';
export const FLEX_HERO_IMAGE_SIZE = 'full';
export const FLEX_HERO_IMAGE_ASPECT_MODE = 'cover';
export const FLEX_BUBBLE_SIZE = 'mega';
export const FLEX_HERO_IMAGE_RECOMMENDED_WIDTH = 1200;
export const FLEX_HERO_IMAGE_RECOMMENDED_HEIGHT = 900;
export const FLEX_HERO_IMAGE_MIN_WIDTH = 800;
export const FLEX_HERO_IMAGE_MIN_HEIGHT = 600;

export const HERO_ASPECT_RATIO_OPTIONS = ['4:3', '20:13', '1:1'] as const;
export const HERO_ASPECT_MODE_OPTIONS = ['cover', 'contain'] as const;
export const FLEX_BUBBLE_SIZE_OPTIONS = ['kilo', 'mega', 'giga'] as const;

export type HeroAspectRatioPreset = (typeof HERO_ASPECT_RATIO_OPTIONS)[number];
export type HeroAspectModePreset = (typeof HERO_ASPECT_MODE_OPTIONS)[number];
export type FlexBubbleSizePreset = (typeof FLEX_BUBBLE_SIZE_OPTIONS)[number];
export const FONT_WEIGHT_OPTIONS = ['regular', 'medium', 'bold'] as const;
export type FontWeightPreset = (typeof FONT_WEIGHT_OPTIONS)[number];

export type CardStyleScope = 'both' | 'web' | 'flex' | 'system';

export type CardStyleRegistryItem = {
  key: keyof CardStylesConfig;
  label: string;
  scope: CardStyleScope;
  helpText: string;
  placeholder: string;
  webDefault: string;
  flexDefault?: string;
};

const cardStyleRegistry = [
  {
    key: 'heroAspectRatio',
    label: 'Hero 比例',
    scope: 'both',
    helpText: '調整主視覺顯示容器比例。未填時，Flex 維持正式版 4:3；網頁維持目前自適應高度外觀。',
    placeholder: '4:3',
    webDefault: '',
    flexDefault: FLEX_HERO_IMAGE_ASPECT_RATIO,
  },
  {
    key: 'heroAspectMode',
    label: 'Hero 顯示模式',
    scope: 'both',
    helpText: '調整主視覺以 cover 或 contain 顯示。未填時沿用正式版 cover。',
    placeholder: 'cover',
    webDefault: FLEX_HERO_IMAGE_ASPECT_MODE,
    flexDefault: FLEX_HERO_IMAGE_ASPECT_MODE,
  },
  {
    key: 'flexBubbleSize',
    label: 'Flex Bubble 尺寸',
    scope: 'flex',
    helpText: '只影響 LINE 分享 Flex bubble 尺寸。未填時沿用目前正式版預設 mega。',
    placeholder: 'mega',
    webDefault: FLEX_BUBBLE_SIZE,
    flexDefault: FLEX_BUBBLE_SIZE,
  },
  {
    key: 'heroZoom',
    label: '圖片縮放',
    scope: 'web',
    helpText: '只調整 `/card/default/` 與 admin 主視覺預覽的顯示縮放，不會改原圖檔。未填時為 100%。',
    placeholder: '100',
    webDefault: '100',
  },
  {
    key: 'heroFocalX',
    label: '圖片焦點 X',
    scope: 'web',
    helpText: '只調整 `/card/default/` 與 admin 主視覺預覽的水平焦點位置。-100 靠左，0 置中，100 靠右。',
    placeholder: '0',
    webDefault: '0',
  },
  {
    key: 'heroFocalY',
    label: '圖片焦點 Y',
    scope: 'web',
    helpText: '只調整 `/card/default/` 與 admin 主視覺預覽的垂直焦點位置。-100 靠上，0 置中，100 靠下。',
    placeholder: '0',
    webDefault: '0',
  },
  {
    key: 'brandTextColor',
    label: '品牌 / 小標字色',
    scope: 'both',
    helpText: '影響卡片品牌小標與 LINE 分享卡片品牌列字色。未填時沿用預設樣式。',
    placeholder: '#66758b',
    webDefault: '#66758b',
    flexDefault: '#37506b',
  },
  {
    key: 'brandFontSize',
    label: '品牌 / 小標字級',
    scope: 'both',
    helpText: '影響卡片品牌小標與 LINE 分享卡片品牌列字級。未填時沿用預設樣式。',
    placeholder: '12',
    webDefault: '0.76rem',
    flexDefault: '12px',
  },
  {
    key: 'brandFontWeight',
    label: '品牌 / 小標字重',
    scope: 'both',
    helpText: '影響卡片品牌小標、區塊小標與 LINE 分享卡片品牌列字重。未填時沿用目前正式版外觀。',
    placeholder: 'regular',
    webDefault: '800',
    flexDefault: 'bold',
  },
  {
    key: 'nameTextColor',
    label: '姓名字色',
    scope: 'both',
    helpText: '影響主姓名在網頁與 LINE Flex 的顯示顏色。未填時沿用預設樣式。',
    placeholder: '#172233',
    webDefault: '#172233',
    flexDefault: '#132033',
  },
  {
    key: 'nameFontSize',
    label: '姓名字級',
    scope: 'both',
    helpText: '影響主姓名在網頁與 LINE Flex 的主標字級。未填時沿用預設樣式。',
    placeholder: '44',
    webDefault: 'clamp(2.5rem, 8vw, 4.6rem)',
    flexDefault: '28px',
  },
  {
    key: 'nameFontWeight',
    label: '姓名字重',
    scope: 'both',
    helpText: '影響主姓名在網頁與 LINE Flex 的字重。未填時沿用目前正式版外觀。',
    placeholder: 'regular',
    webDefault: '400',
    flexDefault: 'bold',
  },
  {
    key: 'titleTextColor',
    label: '職稱字色',
    scope: 'both',
    helpText: '影響職稱文字在網頁與 LINE Flex 的顯示顏色。未填時沿用預設樣式。',
    placeholder: '#5d6a7d',
    webDefault: 'var(--muted)',
    flexDefault: '#5e6c81',
  },
  {
    key: 'titleFontSize',
    label: '職稱字級',
    scope: 'both',
    helpText: '影響職稱文字在網頁與 LINE Flex 的字級。未填時沿用預設樣式。',
    placeholder: '16',
    webDefault: '1.08rem',
    flexDefault: '14px',
  },
  {
    key: 'titleFontWeight',
    label: '職稱字重',
    scope: 'both',
    helpText: '影響職稱文字在網頁與 LINE Flex 的字重。未填時沿用目前正式版外觀。',
    placeholder: 'regular',
    webDefault: '400',
    flexDefault: 'regular',
  },
  {
    key: 'subtitleTextColor',
    label: '副標字色',
    scope: 'both',
    helpText: '影響卡片副標與 LINE Flex 副標的顯示顏色。未填時沿用預設樣式。',
    placeholder: '#5d6a7d',
    webDefault: 'var(--muted)',
    flexDefault: '#5e6c81',
  },
  {
    key: 'subtitleFontSize',
    label: '副標字級',
    scope: 'both',
    helpText: '影響卡片副標與 LINE Flex 副標的字級。未填時沿用預設樣式。',
    placeholder: '15',
    webDefault: '1rem',
    flexDefault: '13px',
  },
  {
    key: 'subtitleFontWeight',
    label: '副標字重',
    scope: 'both',
    helpText: '影響卡片副標與 LINE Flex 副標的字重。未填時沿用目前正式版外觀。',
    placeholder: 'regular',
    webDefault: '400',
    flexDefault: 'regular',
  },
  {
    key: 'introTextColor',
    label: '內文字色',
    scope: 'both',
    helpText: '影響介紹內文在網頁與 LINE Flex 的字色。未填時沿用預設樣式。',
    placeholder: '#5d6a7d',
    webDefault: 'var(--muted)',
    flexDefault: '#5e6c81',
  },
  {
    key: 'introFontSize',
    label: '內文字級',
    scope: 'both',
    helpText: '影響介紹內文在網頁與 LINE Flex 的字級。未填時沿用預設樣式。',
    placeholder: '14',
    webDefault: '1rem',
    flexDefault: '14px',
  },
  {
    key: 'introFontWeight',
    label: '內文字重',
    scope: 'both',
    helpText: '影響介紹內文在網頁與 LINE Flex 的字重。未填時沿用目前正式版外觀。',
    placeholder: 'regular',
    webDefault: '400',
    flexDefault: 'regular',
  },
  {
    key: 'headlineFontSize',
    label: '主標字級',
    scope: 'web',
    helpText: '只影響 `/card/default/` 網頁版主標字級。未填時沿用預設樣式。',
    placeholder: '28',
    webDefault: 'clamp(1.3rem, 3vw, 1.9rem)',
  },
  {
    key: 'subheadlineFontSize',
    label: '副標字級',
    scope: 'web',
    helpText: '只影響 `/card/default/` 網頁版副標字級。未填時沿用預設樣式。',
    placeholder: '16',
    webDefault: '1rem',
  },
  {
    key: 'primaryButtonBackgroundColor',
    label: 'Primary 按鈕背景色',
    scope: 'both',
    helpText: '影響第一顆主要按鈕在網頁與 LINE Flex 的主色。未填時沿用預設樣式。',
    placeholder: '#163863',
    webDefault: 'var(--accent)',
    flexDefault: '#163863',
  },
  {
    key: 'primaryButtonTextColor',
    label: 'Primary 按鈕字色',
    scope: 'web',
    helpText: '只影響 `/card/default/` 網頁版 primary 按鈕文字顏色。LINE Flex 會沿用平台按鈕預設文字色。',
    placeholder: '#ffffff',
    webDefault: 'var(--accent-contrast)',
    flexDefault: '#ffffff',
  },
  {
    key: 'secondaryButtonBackgroundColor',
    label: 'Secondary 按鈕背景色',
    scope: 'web',
    helpText: '只影響 `/card/default/` 網頁版 secondary 按鈕背景色。未填時沿用預設樣式。',
    placeholder: '#edf3fb',
    webDefault: 'var(--accent-soft)',
  },
  {
    key: 'secondaryButtonTextColor',
    label: 'Secondary 按鈕字色',
    scope: 'web',
    helpText: '只影響 `/card/default/` 網頁版 secondary 按鈕字色。未填時沿用預設樣式。',
    placeholder: '#18365f',
    webDefault: 'var(--accent)',
  },
  {
    key: 'buttonFontWeight',
    label: '按鈕文字字重',
    scope: 'web',
    helpText: '只影響 `/card/default/` 網頁版按鈕文字字重。LINE Flex 按鈕文字字重由平台控制。',
    placeholder: 'regular',
    webDefault: '700',
  },
  {
    key: 'buttonBorderRadius',
    label: '按鈕圓角',
    scope: 'web',
    helpText: '只影響 `/card/default/` 網頁版按鈕圓角。未填時沿用預設樣式。',
    placeholder: '18',
    webDefault: '18px',
  },
  {
    key: 'sectionGap',
    label: '重要區塊間距',
    scope: 'both',
    helpText: '影響主資訊區與下方區塊的主要間距，也同步調整 LINE Flex 內容節奏。未填時沿用預設樣式。',
    placeholder: '16',
    webDefault: '16px',
    flexDefault: '16px',
  },
  {
    key: 'cardPadding',
    label: '區塊 padding',
    scope: 'web',
    helpText: '只影響 `/card/default/` 卡片主要容器 padding。未填時沿用預設樣式。',
    placeholder: '24',
    webDefault: '24px',
  },
  {
    key: 'flexTitleSubtitleGap',
    label: 'Flex 主標與副標間距',
    scope: 'flex',
    helpText: '只影響 LINE 分享卡片中姓名、職稱與說明之間的間距。未填時沿用預設樣式。',
    placeholder: '6',
    webDefault: '6px',
    flexDefault: '6px',
  },
  {
    key: 'flexBodyLineHeight',
    label: 'Flex 內文字行距',
    scope: 'flex',
    helpText: '只影響 LINE 分享卡片介紹文字的行距。未填時沿用預設樣式。',
    placeholder: '4',
    webDefault: '4px',
    flexDefault: '4px',
  },
] satisfies CardStyleRegistryItem[];

export const CARD_STYLE_REGISTRY = [...cardStyleRegistry];

export const CARD_STYLE_REGISTRY_BY_KEY = Object.fromEntries(
  CARD_STYLE_REGISTRY.map((item) => [item.key, item]),
) as Record<keyof CardStylesConfig, CardStyleRegistryItem>;

const trimStyleValue = (value: string | undefined): string => value?.trim() ?? '';

const HERO_ASPECT_RATIO_CSS_VALUE: Record<HeroAspectRatioPreset, string> = {
  '4:3': '4 / 3',
  '20:13': '20 / 13',
  '1:1': '1 / 1',
};

const isHeroAspectRatioPreset = (value: string): value is HeroAspectRatioPreset =>
  (HERO_ASPECT_RATIO_OPTIONS as readonly string[]).includes(value);

const isHeroAspectModePreset = (value: string): value is HeroAspectModePreset =>
  (HERO_ASPECT_MODE_OPTIONS as readonly string[]).includes(value);

const isFlexBubbleSizePreset = (value: string): value is FlexBubbleSizePreset =>
  (FLEX_BUBBLE_SIZE_OPTIONS as readonly string[]).includes(value);

const isFontWeightPreset = (value: string): value is FontWeightPreset =>
  (FONT_WEIGHT_OPTIONS as readonly string[]).includes(value);

const clampNumber = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const getClampedNumberStyleValue = (
  value: string | undefined,
  options: {
    fallback: number;
    min: number;
    max: number;
  },
): number => {
  const trimmed = trimStyleValue(value);
  if (!trimmed) {
    return options.fallback;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return options.fallback;
  }

  return clampNumber(parsed, options.min, options.max);
};

const getResolvedSubtitleSizeValue = (styles: CardStylesConfig | undefined): string => {
  const configuredSubtitleSize = trimStyleValue(styles?.subtitleFontSize);
  if (configuredSubtitleSize) {
    return getResolvedCardStyleValue(styles, 'subtitleFontSize', 'web');
  }

  const legacySubheadlineSize = trimStyleValue(styles?.subheadlineFontSize);
  if (legacySubheadlineSize) {
    return getResolvedCardStyleValue(styles, 'subheadlineFontSize', 'web');
  }

  return getResolvedCardStyleValue(styles, 'subtitleFontSize', 'web');
};

const normalizeLengthValue = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}px`;
  }

  return trimmed;
};

const FONT_WEIGHT_WEB_VALUE: Record<FontWeightPreset, string> = {
  regular: '400',
  medium: '500',
  bold: '700',
};

const FONT_WEIGHT_FLEX_VALUE: Record<FontWeightPreset, 'regular' | 'bold'> = {
  regular: 'regular',
  medium: 'bold',
  bold: 'bold',
};

const isFontWeightStyleKey = (key: keyof CardStylesConfig): boolean => key.endsWith('FontWeight');

const normalizeFontWeightValue = (value: string, surface: 'web' | 'flex'): string => {
  const trimmed = value.trim();
  if (isFontWeightPreset(trimmed)) {
    return surface === 'web' ? FONT_WEIGHT_WEB_VALUE[trimmed] : FONT_WEIGHT_FLEX_VALUE[trimmed];
  }

  return trimmed;
};

export const getCardStyleInputValue = (styles: CardStylesConfig | undefined, key: keyof CardStylesConfig): string =>
  trimStyleValue(styles?.[key]);

export const getResolvedHeroAspectRatioValue = (
  styles: CardStylesConfig | undefined,
  surface: 'web' | 'flex',
): HeroAspectRatioPreset | '' => {
  const configured = trimStyleValue(styles?.heroAspectRatio);
  if (isHeroAspectRatioPreset(configured)) {
    return configured;
  }

  return surface === 'flex' ? FLEX_HERO_IMAGE_ASPECT_RATIO : '';
};

export const getResolvedHeroAspectModeValue = (
  styles: CardStylesConfig | undefined,
): HeroAspectModePreset => {
  const configured = trimStyleValue(styles?.heroAspectMode);
  return isHeroAspectModePreset(configured) ? configured : FLEX_HERO_IMAGE_ASPECT_MODE;
};

export const getResolvedFlexBubbleSizeValue = (
  styles: CardStylesConfig | undefined,
): FlexBubbleSizePreset => {
  const configured = trimStyleValue(styles?.flexBubbleSize);
  return isFlexBubbleSizePreset(configured) ? configured : FLEX_BUBBLE_SIZE;
};

export const getResolvedHeroZoomValue = (styles: CardStylesConfig | undefined): number =>
  getClampedNumberStyleValue(styles?.heroZoom, {
    fallback: 100,
    min: 50,
    max: 150,
  });

export const getResolvedHeroFocalXValue = (styles: CardStylesConfig | undefined): number =>
  getClampedNumberStyleValue(styles?.heroFocalX, {
    fallback: 0,
    min: -100,
    max: 100,
  });

export const getResolvedHeroFocalYValue = (styles: CardStylesConfig | undefined): number =>
  getClampedNumberStyleValue(styles?.heroFocalY, {
    fallback: 0,
    min: -100,
    max: 100,
  });

const toHeroFocalPercent = (focalValue: number): string => `${((focalValue + 100) / 2).toFixed(2)}%`;

export type CardHeroStyleTokens = {
  webAspectRatio: string;
  flexAspectRatio: HeroAspectRatioPreset;
  aspectMode: HeroAspectModePreset;
  bubbleSize: FlexBubbleSizePreset;
  zoomPercent: number;
  zoomScale: number;
  focalX: number;
  focalY: number;
  objectPosition: string;
};

export const buildCardHeroStyleTokens = (styles: CardStylesConfig | undefined): CardHeroStyleTokens => {
  const webAspectRatio = getResolvedHeroAspectRatioValue(styles, 'web');
  const flexAspectRatio = getResolvedHeroAspectRatioValue(styles, 'flex') || FLEX_HERO_IMAGE_ASPECT_RATIO;
  const zoomPercent = getResolvedHeroZoomValue(styles);
  const focalX = getResolvedHeroFocalXValue(styles);
  const focalY = getResolvedHeroFocalYValue(styles);

  return {
    webAspectRatio: webAspectRatio ? HERO_ASPECT_RATIO_CSS_VALUE[webAspectRatio] : 'auto',
    flexAspectRatio,
    aspectMode: getResolvedHeroAspectModeValue(styles),
    bubbleSize: getResolvedFlexBubbleSizeValue(styles),
    zoomPercent,
    zoomScale: zoomPercent / 100,
    focalX,
    focalY,
    objectPosition: `${toHeroFocalPercent(focalX)} ${toHeroFocalPercent(focalY)}`,
  };
};

export const getResolvedCardStyleValue = (
  styles: CardStylesConfig | undefined,
  key: keyof CardStylesConfig,
  surface: 'web' | 'flex',
): string => {
  const registryItem = CARD_STYLE_REGISTRY_BY_KEY[key];
  const configured = trimStyleValue(styles?.[key]);
  const fallback = surface === 'flex' ? registryItem.flexDefault ?? registryItem.webDefault : registryItem.webDefault;
  const rawValue = configured || fallback;

  if (key === 'flexBodyLineHeight') {
    return normalizeLengthValue(rawValue) || '4px';
  }

  if (isFontWeightStyleKey(key)) {
    return normalizeFontWeightValue(rawValue, surface);
  }

  if (
    key.endsWith('FontSize') ||
    key === 'sectionGap' ||
    key === 'cardPadding' ||
    key === 'buttonBorderRadius' ||
    key === 'flexTitleSubtitleGap'
  ) {
    return normalizeLengthValue(rawValue);
  }

  return rawValue;
};

export const buildCardWebStyleVariables = (config: CardConfig): Record<string, string> => {
  const heroTokens = buildCardHeroStyleTokens(config.styles);

  return {
    '--card-hero-aspect-ratio': heroTokens.webAspectRatio,
    '--card-hero-object-fit': heroTokens.aspectMode,
    '--card-hero-scale': String(heroTokens.zoomScale),
    '--card-hero-object-position': heroTokens.objectPosition,
    '--card-brand-color': getResolvedCardStyleValue(config.styles, 'brandTextColor', 'web'),
    '--card-brand-size': getResolvedCardStyleValue(config.styles, 'brandFontSize', 'web'),
    '--card-brand-weight': getResolvedCardStyleValue(config.styles, 'brandFontWeight', 'web'),
    '--card-name-color': getResolvedCardStyleValue(config.styles, 'nameTextColor', 'web'),
    '--card-name-size': getResolvedCardStyleValue(config.styles, 'nameFontSize', 'web'),
    '--card-name-weight': getResolvedCardStyleValue(config.styles, 'nameFontWeight', 'web'),
    '--card-title-color': getResolvedCardStyleValue(config.styles, 'titleTextColor', 'web'),
    '--card-title-size': getResolvedCardStyleValue(config.styles, 'titleFontSize', 'web'),
    '--card-title-weight': getResolvedCardStyleValue(config.styles, 'titleFontWeight', 'web'),
    '--card-subtitle-color': getResolvedCardStyleValue(config.styles, 'subtitleTextColor', 'web'),
    '--card-subtitle-size': getResolvedSubtitleSizeValue(config.styles),
    '--card-subtitle-weight': getResolvedCardStyleValue(config.styles, 'subtitleFontWeight', 'web'),
    '--card-intro-color': getResolvedCardStyleValue(config.styles, 'introTextColor', 'web'),
    '--card-intro-size': getResolvedCardStyleValue(config.styles, 'introFontSize', 'web'),
    '--card-intro-weight': getResolvedCardStyleValue(config.styles, 'introFontWeight', 'web'),
    '--card-headline-size': getResolvedCardStyleValue(config.styles, 'headlineFontSize', 'web'),
    '--card-subheadline-size': getResolvedSubtitleSizeValue(config.styles),
    '--card-primary-button-bg': getResolvedCardStyleValue(config.styles, 'primaryButtonBackgroundColor', 'web'),
    '--card-primary-button-color': getResolvedCardStyleValue(config.styles, 'primaryButtonTextColor', 'web'),
    '--card-secondary-button-bg': getResolvedCardStyleValue(config.styles, 'secondaryButtonBackgroundColor', 'web'),
    '--card-secondary-button-color': getResolvedCardStyleValue(config.styles, 'secondaryButtonTextColor', 'web'),
    '--card-button-weight': getResolvedCardStyleValue(config.styles, 'buttonFontWeight', 'web'),
    '--card-button-radius': getResolvedCardStyleValue(config.styles, 'buttonBorderRadius', 'web'),
    '--card-section-gap': getResolvedCardStyleValue(config.styles, 'sectionGap', 'web'),
    '--card-surface-padding': getResolvedCardStyleValue(config.styles, 'cardPadding', 'web'),
  };
};

export type FlexStyleTokens = {
  bubbleSize: FlexBubbleSizePreset;
  heroAspectRatio: HeroAspectRatioPreset;
  heroAspectMode: HeroAspectModePreset;
  brandTextColor: string;
  brandFontSize: string;
  brandFontWeight: 'regular' | 'bold';
  nameTextColor: string;
  nameFontSize: string;
  nameFontWeight: 'regular' | 'bold';
  titleTextColor: string;
  titleFontSize: string;
  titleFontWeight: 'regular' | 'bold';
  subtitleTextColor: string;
  subtitleFontSize: string;
  subtitleFontWeight: 'regular' | 'bold';
  introTextColor: string;
  introFontSize: string;
  introFontWeight: 'regular' | 'bold';
  primaryButtonBackgroundColor: string;
  primaryButtonTextColor: string;
  sectionGap: string;
  titleSubtitleGap: string;
  bodyLineHeight: string;
};

export const buildFlexStyleTokens = (config: CardConfig): FlexStyleTokens => {
  const heroTokens = buildCardHeroStyleTokens(config.styles);

  return {
    bubbleSize: heroTokens.bubbleSize,
    heroAspectRatio: heroTokens.flexAspectRatio,
    heroAspectMode: heroTokens.aspectMode,
    brandTextColor: getResolvedCardStyleValue(config.styles, 'brandTextColor', 'flex'),
    brandFontSize: getResolvedCardStyleValue(config.styles, 'brandFontSize', 'flex'),
    brandFontWeight: getResolvedCardStyleValue(config.styles, 'brandFontWeight', 'flex') as 'regular' | 'bold',
    nameTextColor: getResolvedCardStyleValue(config.styles, 'nameTextColor', 'flex'),
    nameFontSize: getResolvedCardStyleValue(config.styles, 'nameFontSize', 'flex'),
    nameFontWeight: getResolvedCardStyleValue(config.styles, 'nameFontWeight', 'flex') as 'regular' | 'bold',
    titleTextColor: getResolvedCardStyleValue(config.styles, 'titleTextColor', 'flex'),
    titleFontSize: getResolvedCardStyleValue(config.styles, 'titleFontSize', 'flex'),
    titleFontWeight: getResolvedCardStyleValue(config.styles, 'titleFontWeight', 'flex') as 'regular' | 'bold',
    subtitleTextColor: getResolvedCardStyleValue(config.styles, 'subtitleTextColor', 'flex'),
    subtitleFontSize: getResolvedCardStyleValue(config.styles, 'subtitleFontSize', 'flex'),
    subtitleFontWeight: getResolvedCardStyleValue(config.styles, 'subtitleFontWeight', 'flex') as 'regular' | 'bold',
    introTextColor: getResolvedCardStyleValue(config.styles, 'introTextColor', 'flex'),
    introFontSize: getResolvedCardStyleValue(config.styles, 'introFontSize', 'flex'),
    introFontWeight: getResolvedCardStyleValue(config.styles, 'introFontWeight', 'flex') as 'regular' | 'bold',
    primaryButtonBackgroundColor: getResolvedCardStyleValue(config.styles, 'primaryButtonBackgroundColor', 'flex'),
    primaryButtonTextColor: getResolvedCardStyleValue(config.styles, 'primaryButtonTextColor', 'flex'),
    sectionGap: getResolvedCardStyleValue(config.styles, 'sectionGap', 'flex'),
    titleSubtitleGap: getResolvedCardStyleValue(config.styles, 'flexTitleSubtitleGap', 'flex'),
    bodyLineHeight: getResolvedCardStyleValue(config.styles, 'flexBodyLineHeight', 'flex'),
  };
};

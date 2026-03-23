import type { CardConfig, CardStylesConfig } from '../content/cards/types';

export const FLEX_HERO_IMAGE_ASPECT_RATIO = '4:3';
export const FLEX_HERO_IMAGE_SIZE = 'full';
export const FLEX_HERO_IMAGE_ASPECT_MODE = 'cover';
export const FLEX_HERO_IMAGE_RECOMMENDED_WIDTH = 1200;
export const FLEX_HERO_IMAGE_RECOMMENDED_HEIGHT = 900;
export const FLEX_HERO_IMAGE_MIN_WIDTH = 800;
export const FLEX_HERO_IMAGE_MIN_HEIGHT = 600;

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

export const getCardStyleInputValue = (styles: CardStylesConfig | undefined, key: keyof CardStylesConfig): string =>
  trimStyleValue(styles?.[key]);

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

export const buildCardWebStyleVariables = (config: CardConfig): Record<string, string> => ({
  '--card-brand-color': getResolvedCardStyleValue(config.styles, 'brandTextColor', 'web'),
  '--card-brand-size': getResolvedCardStyleValue(config.styles, 'brandFontSize', 'web'),
  '--card-name-color': getResolvedCardStyleValue(config.styles, 'nameTextColor', 'web'),
  '--card-name-size': getResolvedCardStyleValue(config.styles, 'nameFontSize', 'web'),
  '--card-title-color': getResolvedCardStyleValue(config.styles, 'titleTextColor', 'web'),
  '--card-title-size': getResolvedCardStyleValue(config.styles, 'titleFontSize', 'web'),
  '--card-intro-color': getResolvedCardStyleValue(config.styles, 'introTextColor', 'web'),
  '--card-intro-size': getResolvedCardStyleValue(config.styles, 'introFontSize', 'web'),
  '--card-headline-size': getResolvedCardStyleValue(config.styles, 'headlineFontSize', 'web'),
  '--card-subheadline-size': getResolvedCardStyleValue(config.styles, 'subheadlineFontSize', 'web'),
  '--card-primary-button-bg': getResolvedCardStyleValue(config.styles, 'primaryButtonBackgroundColor', 'web'),
  '--card-primary-button-color': getResolvedCardStyleValue(config.styles, 'primaryButtonTextColor', 'web'),
  '--card-secondary-button-bg': getResolvedCardStyleValue(config.styles, 'secondaryButtonBackgroundColor', 'web'),
  '--card-secondary-button-color': getResolvedCardStyleValue(config.styles, 'secondaryButtonTextColor', 'web'),
  '--card-button-radius': getResolvedCardStyleValue(config.styles, 'buttonBorderRadius', 'web'),
  '--card-section-gap': getResolvedCardStyleValue(config.styles, 'sectionGap', 'web'),
  '--card-surface-padding': getResolvedCardStyleValue(config.styles, 'cardPadding', 'web'),
});

export type FlexStyleTokens = {
  brandTextColor: string;
  brandFontSize: string;
  nameTextColor: string;
  nameFontSize: string;
  titleTextColor: string;
  titleFontSize: string;
  introTextColor: string;
  introFontSize: string;
  primaryButtonBackgroundColor: string;
  primaryButtonTextColor: string;
  sectionGap: string;
  titleSubtitleGap: string;
  bodyLineHeight: string;
};

export const buildFlexStyleTokens = (config: CardConfig): FlexStyleTokens => ({
  brandTextColor: getResolvedCardStyleValue(config.styles, 'brandTextColor', 'flex'),
  brandFontSize: getResolvedCardStyleValue(config.styles, 'brandFontSize', 'flex'),
  nameTextColor: getResolvedCardStyleValue(config.styles, 'nameTextColor', 'flex'),
  nameFontSize: getResolvedCardStyleValue(config.styles, 'nameFontSize', 'flex'),
  titleTextColor: getResolvedCardStyleValue(config.styles, 'titleTextColor', 'flex'),
  titleFontSize: getResolvedCardStyleValue(config.styles, 'titleFontSize', 'flex'),
  introTextColor: getResolvedCardStyleValue(config.styles, 'introTextColor', 'flex'),
  introFontSize: getResolvedCardStyleValue(config.styles, 'introFontSize', 'flex'),
  primaryButtonBackgroundColor: getResolvedCardStyleValue(config.styles, 'primaryButtonBackgroundColor', 'flex'),
  primaryButtonTextColor: getResolvedCardStyleValue(config.styles, 'primaryButtonTextColor', 'flex'),
  sectionGap: getResolvedCardStyleValue(config.styles, 'sectionGap', 'flex'),
  titleSubtitleGap: getResolvedCardStyleValue(config.styles, 'flexTitleSubtitleGap', 'flex'),
  bodyLineHeight: getResolvedCardStyleValue(config.styles, 'flexBodyLineHeight', 'flex'),
});

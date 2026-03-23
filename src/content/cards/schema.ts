import type { CardConfig } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isString = (value: unknown): value is string => typeof value === 'string';

const assertStringArray = (value: unknown, fieldName: string) => {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    throw new Error(`${fieldName} 必須是非空字串陣列。`);
  }
};

/**
 * Validate card config shape at runtime so the data layer stays safe when it
 * is later wired to Sheets, CMS, or other external sources.
 */
export const assertCardConfig: (value: unknown) => asserts value is CardConfig = (value) => {
  if (!isRecord(value)) {
    throw new Error('card config 必須是物件。');
  }

  if (!isNonEmptyString(value.id)) throw new Error('card.id 必須存在。');
  if (!isNonEmptyString(value.slug)) throw new Error('card.slug 必須存在。');
  if (!isBoolean(value.isPrimary)) throw new Error('card.isPrimary 必須是 boolean。');
  assertStringArray(value.legacySlugs, 'card.legacySlugs');

  if (!isRecord(value.appearance)) throw new Error('card.appearance 必須存在。');
  if (!isNonEmptyString(value.appearance.theme)) throw new Error('card.appearance.theme 必須存在。');
  if (!isNonEmptyString(value.appearance.layout)) throw new Error('card.appearance.layout 必須存在。');

  if (!isRecord(value.modules)) throw new Error('card.modules 必須存在。');
  if (!isBoolean(value.modules.showHighlights)) throw new Error('card.modules.showHighlights 必須是 boolean。');
  if (!isBoolean(value.modules.showSharePanel)) throw new Error('card.modules.showSharePanel 必須是 boolean。');
  if (!isBoolean(value.modules.showQrCode)) throw new Error('card.modules.showQrCode 必須是 boolean。');

  if (!isRecord(value.photo)) throw new Error('card.photo 必須存在。');
  if (!isNonEmptyString(value.photo.src)) throw new Error('card.photo.src 必須存在。');
  if (!isNonEmptyString(value.photo.alt)) throw new Error('card.photo.alt 必須存在。');
  if (value.photo.link !== undefined && !isNonEmptyString(value.photo.link)) throw new Error('card.photo.link 必須是非空字串。');

  if (!isRecord(value.content)) throw new Error('card.content 必須存在。');
  if (!isNonEmptyString(value.content.brandName)) throw new Error('card.content.brandName 必須存在。');
  if (!isNonEmptyString(value.content.fullName)) throw new Error('card.content.fullName 必須存在。');
  if (!isNonEmptyString(value.content.title)) throw new Error('card.content.title 必須存在。');
  if (!isNonEmptyString(value.content.headline)) throw new Error('card.content.headline 必須存在。');
  if (!isNonEmptyString(value.content.subheadline)) throw new Error('card.content.subheadline 必須存在。');
  if (!isNonEmptyString(value.content.intro)) throw new Error('card.content.intro 必須存在。');
  if (!isNonEmptyString(value.content.highlightsTitle)) throw new Error('card.content.highlightsTitle 必須存在。');
  assertStringArray(value.content.highlights, 'card.content.highlights');
  if (!isNonEmptyString(value.content.actionsTitle)) throw new Error('card.content.actionsTitle 必須存在。');
  if (!isNonEmptyString(value.content.actionsDescription)) throw new Error('card.content.actionsDescription 必須存在。');
  if (!isNonEmptyString(value.content.sharePanelTitle)) throw new Error('card.content.sharePanelTitle 必須存在。');

  if (value.styles !== undefined) {
    if (!isRecord(value.styles)) {
      throw new Error('card.styles 必須是物件。');
    }

    Object.entries(value.styles).forEach(([styleKey, styleValue]) => {
      if (styleValue !== undefined && !isString(styleValue)) {
        throw new Error(`card.styles.${styleKey} 必須是字串。`);
      }
    });
  }

  if (!Array.isArray(value.actions) || value.actions.some((action) => !isRecord(action) || !isNonEmptyString(action.id) || !isNonEmptyString(action.label))) {
    throw new Error('card.actions 內容格式不正確。');
  }

  if (!isRecord(value.share)) throw new Error('card.share 必須存在。');
  if (value.share.title !== undefined && !isNonEmptyString(value.share.title)) throw new Error('card.share.title 必須是非空字串。');
  if (value.share.text !== undefined && !isNonEmptyString(value.share.text)) throw new Error('card.share.text 必須是非空字串。');

  if (!isRecord(value.seo)) throw new Error('card.seo 必須存在。');
  if (!isNonEmptyString(value.seo.title)) throw new Error('card.seo.title 必須存在。');
  if (!isNonEmptyString(value.seo.description)) throw new Error('card.seo.description 必須存在。');
  if (!isNonEmptyString(value.seo.ogTitle)) throw new Error('card.seo.ogTitle 必須存在。');
  if (!isNonEmptyString(value.seo.ogDescription)) throw new Error('card.seo.ogDescription 必須存在。');
  if (!isNonEmptyString(value.seo.ogImage)) throw new Error('card.seo.ogImage 必須存在。');
};

export const defineCardConfig = (value: CardConfig): CardConfig => {
  assertCardConfig(value);
  return value;
};

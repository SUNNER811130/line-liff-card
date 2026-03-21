import type { CardActionConfig, CardConfig } from '../content/cards/types';

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isAllowedLink = (value: string): boolean => {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return true;
  }

  return isHttpUrl(trimmed);
};

const validateAction = (action: CardActionConfig, index: number): string[] => {
  const errors: string[] = [];

  if (action.enabled === false) {
    return errors;
  }

  if (!action.label.trim()) {
    errors.push(`按鈕 ${index + 1} 需要文案。`);
  }

  if (!action.url?.trim()) {
    errors.push(`按鈕 ${index + 1} 需要連結。`);
  } else if (!isAllowedLink(action.url)) {
    errors.push(`按鈕 ${index + 1} 連結格式不正確。`);
  }

  return errors;
};

export const validateCardConfig = (config: CardConfig): string[] => {
  const errors: string[] = [];

  if (!config.content.fullName.trim()) {
    errors.push('姓名不能為空。');
  }

  if (!config.content.title.trim()) {
    errors.push('職稱不能為空。');
  }

  if (!config.content.brandName.trim()) {
    errors.push('品牌名稱不能為空。');
  }

  if (!config.content.headline.trim()) {
    errors.push('主標不能為空。');
  }

  if (!config.photo.src.trim()) {
    errors.push('照片網址不能為空。');
  } else if (!config.photo.src.startsWith('data:') && !config.photo.src.startsWith('/') && !isHttpUrl(config.photo.src)) {
    errors.push('照片網址格式不正確。');
  }

  if (config.photo.link?.trim() && !isAllowedLink(config.photo.link)) {
    errors.push('照片連結格式不正確。');
  }

  config.actions.forEach((action, index) => {
    errors.push(...validateAction(action, index));
  });

  return errors;
};

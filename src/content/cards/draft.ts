import { defaultCard } from './default';
import { assertCardConfig } from './schema';
import type { CardConfig } from './types';

export const ADMIN_DRAFT_STORAGE_KEY = 'line-liff-card.admin-draft';

export const cloneCardConfig = (config: CardConfig): CardConfig =>
  JSON.parse(JSON.stringify(config)) as CardConfig;

export const createDefaultCardDraft = (): CardConfig => cloneCardConfig(defaultCard);

export const parseCardConfigJson = (json: string): { ok: true; data: CardConfig } | { ok: false; error: string } => {
  try {
    const parsed = JSON.parse(json) as unknown;
    assertCardConfig(parsed);
    return {
      ok: true,
      data: cloneCardConfig(parsed),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 格式不正確。',
    };
  }
};

export const serializeCardConfig = (config: CardConfig): string => JSON.stringify(config, null, 2);

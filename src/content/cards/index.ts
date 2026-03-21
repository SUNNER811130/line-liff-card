import { defaultCard } from './default';
import type { CardConfig } from './types';

const legacySlugs = new Set(['demo-consultant']);

export const primaryCard: CardConfig = defaultCard;
export const cards: CardConfig[] = [primaryCard];
export const defaultCardSlug = primaryCard.slug;

export const getCardBySlug = (slug: string): CardConfig | undefined =>
  cards.find((card) => card.slug === slug) ?? (legacySlugs.has(slug) ? primaryCard : undefined);

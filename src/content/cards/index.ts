import { defaultCard } from './default';
import type { CardConfig } from './types';

export const primaryCard: CardConfig = defaultCard;
export const cards: CardConfig[] = [primaryCard];
export const defaultCardSlug = primaryCard.slug;
const legacySlugMap = new Map(cards.flatMap((card) => card.legacySlugs.map((slug) => [slug, card] as const)));

export const getCardBySlug = (slug: string): CardConfig | undefined =>
  cards.find((card) => card.slug === slug) ?? legacySlugMap.get(slug);

export const getBundledCardBySlug = getCardBySlug;

import { defaultCard } from './default';
import { demoConsultantCard } from './demo-consultant';
import type { CardConfig } from './types';

export const cards: CardConfig[] = [defaultCard, demoConsultantCard];

export const defaultCardSlug = defaultCard.slug;

export const getCardBySlug = (slug: string): CardConfig | undefined =>
  cards.find((card) => card.slug === slug);

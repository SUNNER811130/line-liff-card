import defaultCardSeed from './default.seed.json';
import { defineCardConfig } from './schema';
import type { CardConfig } from './types';

export const defaultCard = defineCardConfig(defaultCardSeed as CardConfig);

import type { CardThemeId, ThemePreset } from './types';

const themePresets: Record<CardThemeId, ThemePreset> = {
  executive: {
    cardSurfaceClassName: 'theme-executive',
    cssVariables: {
      '--accent': '#18365f',
      '--accent-soft': '#edf3fb',
      '--accent-contrast': '#ffffff',
      '--accent-secondary': '#8e6c46',
      '--accent-secondary-soft': '#f5eee5',
      '--hero-gradient':
        'linear-gradient(140deg, rgba(17, 42, 74, 0.96) 0%, rgba(34, 66, 110, 0.92) 52%, rgba(142, 108, 70, 0.8) 100%)',
    },
  },
};

export const resolveThemePreset = (themeId: CardThemeId): ThemePreset => themePresets[themeId] ?? themePresets.executive;

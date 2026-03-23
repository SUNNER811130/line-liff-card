export type CardThemeId = 'executive';

export type CardLayoutId = 'profile-right';

export type CardActionTone = 'primary' | 'secondary';

export type CardActionConfig = {
  id: string;
  label: string;
  url?: string;
  tone?: CardActionTone;
  enabled?: boolean;
};

export type CardPhotoConfig = {
  src: string;
  alt: string;
  link?: string;
};

export type CardModulesConfig = {
  showHighlights: boolean;
  showSharePanel: boolean;
  showQrCode: boolean;
};

export type CardAppearanceConfig = {
  theme: CardThemeId;
  layout: CardLayoutId;
};

export type CardStylesConfig = {
  brandTextColor?: string;
  brandFontSize?: string;
  nameTextColor?: string;
  nameFontSize?: string;
  titleTextColor?: string;
  titleFontSize?: string;
  subtitleTextColor?: string;
  subtitleFontSize?: string;
  introTextColor?: string;
  introFontSize?: string;
  headlineFontSize?: string;
  subheadlineFontSize?: string;
  primaryButtonBackgroundColor?: string;
  primaryButtonTextColor?: string;
  secondaryButtonBackgroundColor?: string;
  secondaryButtonTextColor?: string;
  buttonBorderRadius?: string;
  sectionGap?: string;
  cardPadding?: string;
  flexTitleSubtitleGap?: string;
  flexBodyLineHeight?: string;
  heroAspectRatio?: string;
  heroAspectMode?: string;
  flexBubbleSize?: string;
  heroZoom?: string;
  heroFocalX?: string;
  heroFocalY?: string;
};

export type CardShareConfig = {
  title?: string;
  text?: string;
  buttonLabel?: string;
};

export type CardSeoConfig = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
};

export type CardContentConfig = {
  brandName: string;
  fullName: string;
  title: string;
  headline: string;
  subheadline: string;
  intro: string;
  highlightsTitle: string;
  highlights: string[];
  actionsTitle: string;
  actionsDescription: string;
  sharePanelTitle: string;
};

export type CardConfig = {
  id: string;
  slug: string;
  isPrimary: boolean;
  legacySlugs: string[];
  appearance: CardAppearanceConfig;
  modules: CardModulesConfig;
  photo: CardPhotoConfig;
  content: CardContentConfig;
  styles?: CardStylesConfig;
  actions: CardActionConfig[];
  share: CardShareConfig;
  seo: CardSeoConfig;
};

export type ThemePreset = {
  cardSurfaceClassName: string;
  cssVariables: Record<string, string>;
};

export type CardLinkActionView = {
  kind: 'link';
  key: string;
  label: string;
  href: string;
  tone: CardActionTone;
};

export type CardShareActionView = {
  kind: 'button';
  key: 'share';
  label: string;
  tone: 'share';
  onClick: () => void;
  disabled?: boolean;
};

export type CardActionView = CardLinkActionView | CardShareActionView;

export type CardPageViewModel = {
  slug: string;
  appearance: ThemePreset;
  modules: CardModulesConfig;
  photo: {
    src: string;
    alt: string;
    href: string;
  };
  identity: {
    brandName: string;
    fullName: string;
    title: string;
  };
  summary: {
    headline: string;
    subheadline: string;
    intro: string;
  };
  highlights: {
    title: string;
    items: string[];
  };
  actions: {
    title: string;
    description: string;
    items: CardActionView[];
  };
  sharePanel: {
    title: string;
  };
  shareButtonLabel: string;
};

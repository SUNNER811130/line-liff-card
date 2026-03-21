import type { CardConfig, CardPageViewModel } from './types';
import { resolveActionUrl } from '../../lib/runtime';
import { buildCardActionItems } from '../../lib/card-actions';
import { resolveThemePreset } from './themes';

type BuildCardPageViewModelInput = {
  config: CardConfig;
  pageUrl: string;
  onShare: () => void;
  shareDisabled?: boolean;
};

export const buildCardPageViewModel = ({
  config,
  pageUrl,
  onShare,
  shareDisabled = false,
}: BuildCardPageViewModelInput): CardPageViewModel => ({
  slug: config.slug,
  appearance: resolveThemePreset(config.appearance.theme),
  modules: config.modules,
  photo: {
    src: config.photo.src,
    alt: config.photo.alt,
    href: resolveActionUrl(config.photo.link ?? '', pageUrl),
  },
  identity: {
    brandName: config.content.brandName,
    fullName: config.content.fullName,
    title: config.content.title,
  },
  summary: {
    headline: config.content.headline,
    subheadline: config.content.subheadline,
    intro: config.content.intro,
  },
  highlights: {
    title: config.content.highlightsTitle,
    items: config.content.highlights,
  },
  actions: {
    title: config.content.actionsTitle,
    description: config.content.actionsDescription,
    items: buildCardActionItems({
      actions: config.actions,
      fallbackUrl: pageUrl,
      onShare,
      shareDisabled,
    }),
  },
  sharePanel: {
    title: config.content.sharePanelTitle,
  },
});

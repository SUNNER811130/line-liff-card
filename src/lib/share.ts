import type { CardConfig } from '../content/cards/types';
import { createPermanentLink, shareCard } from './liff';
import { navigateToUrl, resolveActionUrl, toAssetUrl } from './runtime';

type ShareOutcome = 'shared' | 'dismissed' | 'web-share' | 'redirected' | 'copied';

export type ShareResult = {
  outcome: ShareOutcome;
  message: string;
};

const buildFlexMessage = (config: CardConfig, shareUrl: string, pageUrl: string) => ({
  type: 'flex' as const,
  altText: `${config.fullName}｜${config.brand}`,
  contents: {
    type: 'bubble' as const,
    hero: {
      type: 'image' as const,
      url: toAssetUrl(config.heroImage),
      size: 'full' as const,
      aspectRatio: '4:3' as const,
      aspectMode: 'cover' as const,
      action: {
        type: 'uri' as const,
        label: config.fullName,
        uri: shareUrl,
      },
    },
    body: {
      type: 'box' as const,
      layout: 'vertical' as const,
      spacing: 'md' as const,
      contents: [
        {
          type: 'text' as const,
          text: config.brand,
          size: 'xs' as const,
          weight: 'bold' as const,
          color: '#37506b',
        },
        {
          type: 'text' as const,
          text: config.fullName,
          size: 'xl' as const,
          weight: 'bold' as const,
          color: '#132033',
        },
        {
          type: 'text' as const,
          text: config.title,
          size: 'sm' as const,
          color: '#5e6c81',
        },
        {
          type: 'text' as const,
          text: config.intro,
          wrap: true,
          size: 'sm' as const,
          color: '#5e6c81',
        },
      ],
    },
    footer: {
      type: 'box' as const,
      layout: 'vertical' as const,
      spacing: 'sm' as const,
      contents: [
        {
          type: 'button' as const,
          style: 'primary' as const,
          color: '#163863',
          action: {
            type: 'uri' as const,
            label: config.contactAction.label,
            uri: resolveActionUrl(config.contactAction.url, pageUrl),
          },
        },
        {
          type: 'button' as const,
          style: 'secondary' as const,
          action: {
            type: 'uri' as const,
            label: config.bookingAction.label,
            uri: resolveActionUrl(config.bookingAction.url, pageUrl),
          },
        },
      ],
    },
  },
});

const buildLineShareUrl = (config: CardConfig, pageUrl: string) =>
  `https://line.me/R/msg/text/?${encodeURIComponent(`${config.fullName}｜${config.title}\n${config.brand}\n${pageUrl}`)}`;

const copyShareUrl = async (pageUrl: string): Promise<ShareResult> => {
  if (!navigator.clipboard?.writeText) {
    throw new Error('目前無法啟用分享，請稍後再試。');
  }

  await navigator.clipboard.writeText(pageUrl);
  return {
    outcome: 'copied',
    message: '已複製電子名片連結，可直接貼給 LINE 好友。',
  };
};

type ShareDigitalCardInput = {
  config: CardConfig;
  pageUrl: string;
  inClient: boolean;
  shareAvailable: boolean;
};

export async function shareDigitalCard({
  config,
  pageUrl,
  inClient,
  shareAvailable,
}: ShareDigitalCardInput): Promise<ShareResult> {
  if (inClient && shareAvailable) {
    const permanentLink = await createPermanentLink(pageUrl);
    const shared = await shareCard([buildFlexMessage(config, permanentLink, pageUrl)]);

    return shared
      ? {
          outcome: 'shared',
          message: '已開啟 LINE 分享視窗。',
        }
      : {
          outcome: 'dismissed',
          message: '已取消分享。',
        };
  }

  if (navigator.share) {
    await navigator.share({
      title: `${config.fullName}｜${config.brand}`,
      text: `${config.title}\n${config.headline}`,
      url: pageUrl,
    });

    return {
      outcome: 'web-share',
      message: '已開啟分享視窗。',
    };
  }

  try {
    navigateToUrl(buildLineShareUrl(config, pageUrl));
    return {
      outcome: 'redirected',
      message: '已切換到可分享的 LINE 頁面。',
    };
  } catch {
    return copyShareUrl(pageUrl);
  }
}

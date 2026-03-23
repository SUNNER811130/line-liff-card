import type { CardConfig } from '../content/cards/types';
import { createPermanentLink, shareCard } from './liff';
import { navigateToUrl, resolveActionUrl, toAssetUrl } from './runtime';
import { getCardLiffUrl } from './routes';
import {
  buildFlexStyleTokens,
  FLEX_HERO_IMAGE_SIZE,
} from './card-style-registry';

type ShareOutcome = 'shared' | 'dismissed' | 'web-share' | 'redirected' | 'copied';

export type ShareResult = {
  outcome: ShareOutcome;
  message: string;
};

/**
 * LIFF/web share adapter for the current runtime card. Preserve Flex payload
 * fields, forward-share URL format, and fallback order.
 */
const SHARE_INTENT_PARAM = 'intent';
const SHARE_INTENT_ID_PARAM = 'intentId';
const SHARE_SOURCE_PARAM = 'source';
const SHARE_INTENT_VALUE = 'share';
const SHARE_SOURCE_PAGE_SHARE = 'page-share';
const SHARE_SOURCE_FLEX_FORWARD = 'flex-forward';
const SHARE_INTENT_PENDING_KEY = 'line-liff-card:share-intent:pending';
const SHARE_INTENT_LOGIN_KEY = 'line-liff-card:share-intent:login-requested';
export const FLEX_FORWARD_SHARE_LABEL = '分享這張電子名片';

const createShareIntentId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getCanonicalLiffShareUrl = (slug: string): string => getCardLiffUrl(slug);

const buildShareIntentUrl = (slug: string, source: string, intentId?: string): string => {
  const liffUrl = getCanonicalLiffShareUrl(slug);
  if (!liffUrl) {
    return '';
  }

  const targetUrl = new URL(liffUrl);
  targetUrl.searchParams.set(SHARE_INTENT_PARAM, SHARE_INTENT_VALUE);
  targetUrl.searchParams.set(SHARE_SOURCE_PARAM, source);

  if (intentId) {
    targetUrl.searchParams.set(SHARE_INTENT_ID_PARAM, intentId);
  }

  return targetUrl.toString();
};

export const buildFlexForwardShareUrl = (slug: string): string =>
  buildShareIntentUrl(slug, SHARE_SOURCE_FLEX_FORWARD);

const buildFlexFooterButtons = (config: CardConfig, pageUrl: string) => {
  const styleTokens = buildFlexStyleTokens(config);

  return [
    {
      type: 'button' as const,
      style: 'primary' as const,
      color: styleTokens.primaryButtonBackgroundColor,
      action: {
        type: 'uri' as const,
        label: config.actions[0]?.label ?? '查看名片',
        uri: resolveActionUrl(config.actions[0]?.url ?? '', pageUrl),
      },
    },
    {
      type: 'button' as const,
      style: 'secondary' as const,
      action: {
        type: 'uri' as const,
        label: config.actions[1]?.label ?? '立即聯絡',
        uri: resolveActionUrl(config.actions[1]?.url ?? '', pageUrl),
      },
    },
    {
      type: 'button' as const,
      style: 'link' as const,
      height: 'sm' as const,
      action: {
        type: 'uri' as const,
        label: FLEX_FORWARD_SHARE_LABEL,
        uri: buildFlexForwardShareUrl(config.slug),
      },
    },
  ];
};

const buildFlexBodyContents = (config: CardConfig) => {
  const styleTokens = buildFlexStyleTokens(config);
  const subtitle = config.content.subheadline.trim();

  return [
    {
      type: 'text' as const,
      text: config.content.brandName,
      size: styleTokens.brandFontSize,
      weight: styleTokens.brandFontWeight,
      color: styleTokens.brandTextColor,
    },
    {
      type: 'text' as const,
      text: config.content.fullName,
      margin: styleTokens.titleSubtitleGap,
      size: styleTokens.nameFontSize,
      weight: styleTokens.nameFontWeight,
      color: styleTokens.nameTextColor,
    },
    {
      type: 'text' as const,
      text: config.content.title,
      margin: styleTokens.titleSubtitleGap,
      size: styleTokens.titleFontSize,
      weight: styleTokens.titleFontWeight,
      color: styleTokens.titleTextColor,
    },
    ...(subtitle
      ? [
          {
            type: 'text' as const,
            text: subtitle,
            wrap: true,
            margin: styleTokens.titleSubtitleGap,
            size: styleTokens.subtitleFontSize,
            weight: styleTokens.subtitleFontWeight,
            color: styleTokens.subtitleTextColor,
          },
        ]
      : []),
    {
      type: 'text' as const,
      text: config.content.intro,
      wrap: true,
      margin: styleTokens.sectionGap,
      size: styleTokens.introFontSize,
      weight: styleTokens.introFontWeight,
      color: styleTokens.introTextColor,
      lineSpacing: styleTokens.bodyLineHeight,
    },
  ];
};

export const buildFlexMessage = (config: CardConfig, shareUrl: string, pageUrl: string) => {
  const styleTokens = buildFlexStyleTokens(config);

  return {
    type: 'flex' as const,
    altText: `${config.content.fullName}｜${config.content.brandName}`,
    contents: {
      type: 'bubble' as const,
      size: styleTokens.bubbleSize,
      hero: {
        type: 'image' as const,
        url: toAssetUrl(config.photo.src),
        size: FLEX_HERO_IMAGE_SIZE as 'full',
        aspectRatio: styleTokens.heroAspectRatio,
        aspectMode: styleTokens.heroAspectMode,
        action: {
          type: 'uri' as const,
          label: config.content.fullName,
          uri: shareUrl,
        },
      },
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        paddingAll: styleTokens.sectionGap,
        contents: buildFlexBodyContents(config),
      },
      footer: {
        type: 'box' as const,
        layout: 'vertical' as const,
        spacing: 'sm' as const,
        paddingAll: styleTokens.sectionGap,
        contents: buildFlexFooterButtons(config, pageUrl),
      },
    },
  };
};

const buildLineShareUrl = (config: CardConfig, pageUrl: string) =>
  `https://line.me/R/msg/text/?${encodeURIComponent(`${config.content.fullName}｜${config.content.title}\n${config.content.brandName}\n${pageUrl}`)}`;

const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const bootstrapExternalShareIntent = (source: string | null): { active: false } | { active: true; intentId: string } => {
  if (source !== SHARE_SOURCE_FLEX_FORWARD) {
    return { active: false };
  }

  const intentId = createShareIntentId();
  setPendingShareIntent(intentId);
  updateShareIntentUrl((currentUrl) => {
    currentUrl.searchParams.set(SHARE_INTENT_ID_PARAM, intentId);
  });

  return { active: true, intentId };
};

const readShareIntentFromUrl = (): { active: false } | { active: true; intentId: string } => {
  if (typeof window === 'undefined') {
    return { active: false };
  }

  const currentUrl = new URL(window.location.href);
  const intent = currentUrl.searchParams.get(SHARE_INTENT_PARAM);
  const intentId = currentUrl.searchParams.get(SHARE_INTENT_ID_PARAM);
  const source = currentUrl.searchParams.get(SHARE_SOURCE_PARAM);

  if (intent !== SHARE_INTENT_VALUE) {
    return { active: false };
  }

  if (!intentId) {
    return bootstrapExternalShareIntent(source);
  }

  return { active: true, intentId };
};

const updateShareIntentUrl = (updater: (url: URL) => void) => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentUrl = new URL(window.location.href);
  updater(currentUrl);
  window.history.replaceState(window.history.state, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
};

const setPendingShareIntent = (intentId: string) => {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(SHARE_INTENT_PENDING_KEY, intentId);
  window.sessionStorage.removeItem(SHARE_INTENT_LOGIN_KEY);
};

const getPendingShareIntent = (): string | null => {
  if (!canUseSessionStorage()) {
    return null;
  }

  return window.sessionStorage.getItem(SHARE_INTENT_PENDING_KEY);
};

const getLoginRequestedIntent = (): string | null => {
  if (!canUseSessionStorage()) {
    return null;
  }

  return window.sessionStorage.getItem(SHARE_INTENT_LOGIN_KEY);
};

const setLoginRequestedIntent = (intentId: string) => {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(SHARE_INTENT_LOGIN_KEY, intentId);
};

export const clearShareIntent = () => {
  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(SHARE_INTENT_PENDING_KEY);
    window.sessionStorage.removeItem(SHARE_INTENT_LOGIN_KEY);
  }

  updateShareIntentUrl((currentUrl) => {
    currentUrl.searchParams.delete(SHARE_INTENT_PARAM);
    currentUrl.searchParams.delete(SHARE_INTENT_ID_PARAM);
    currentUrl.searchParams.delete(SHARE_SOURCE_PARAM);
  });
};

export const getActiveShareIntent = (): { active: false } | { active: true; intentId: string; loginRequested: boolean } => {
  const shareIntent = readShareIntentFromUrl();
  if (!shareIntent.active) {
    return shareIntent;
  }

  if (getPendingShareIntent() !== shareIntent.intentId) {
    clearShareIntent();
    return { active: false };
  }

  return {
    active: true,
    intentId: shareIntent.intentId,
    loginRequested: getLoginRequestedIntent() === shareIntent.intentId,
  };
};

export const markShareIntentLoginRequested = (intentId: string) => {
  setLoginRequestedIntent(intentId);
};

export const buildLiffShareIntentUrl = (slug: string): string => {
  const intentId = createShareIntentId();
  setPendingShareIntent(intentId);
  return buildShareIntentUrl(slug, SHARE_SOURCE_PAGE_SHARE, intentId);
};

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

  if (inClient) {
    const liffShareIntentUrl = buildLiffShareIntentUrl(config.slug);
    if (liffShareIntentUrl) {
      navigateToUrl(liffShareIntentUrl);
      return {
        outcome: 'redirected',
        message: '已切換到 LIFF 分享流程，將嘗試送出同一張 LINE Flex 電子名片。',
      };
    }
  }

  if (navigator.share) {
    await navigator.share({
      title: config.share.title ?? `${config.content.fullName}｜${config.content.brandName}`,
      text: config.share.text ?? `${config.content.title}\n${config.content.headline}`,
      url: pageUrl,
    });

    return {
      outcome: 'web-share',
      message: '已開啟一般分享視窗；這次分享內容可能會是網址，而不是 LINE Flex 電子名片。',
    };
  }

  try {
    navigateToUrl(buildLineShareUrl(config, pageUrl));
    return {
      outcome: 'redirected',
      message: '已切換到 LINE 文字分享頁；這次會分享網址，而不是 LINE Flex 電子名片。',
    };
  } catch {
    return copyShareUrl(pageUrl);
  }
}

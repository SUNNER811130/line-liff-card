import type { CardConfig } from '../content/cards/types';

export const SHARE_BUTTON_LABEL = '分享此電子名片給 LINE 好友';

export type CardActionItem =
  | {
      kind: 'link';
      key: string;
      label: string;
      href: string;
      tone: 'primary' | 'secondary';
    }
  | {
      kind: 'button';
      key: string;
      label: string;
      tone: 'share';
      onClick: () => void;
      disabled?: boolean;
    };

type BuildCardActionItemsInput = {
  config: CardConfig;
  contactUrl: string;
  bookingUrl: string;
  onShare: () => void;
  shareDisabled?: boolean;
};

export const buildCardActionItems = ({
  config,
  contactUrl,
  bookingUrl,
  onShare,
  shareDisabled = false,
}: BuildCardActionItemsInput): CardActionItem[] => [
  {
    kind: 'link',
    key: 'contact',
    label: config.contactAction.label,
    href: contactUrl,
    tone: 'primary',
  },
  {
    kind: 'link',
    key: 'booking',
    label: config.bookingAction.label,
    href: bookingUrl,
    tone: 'secondary',
  },
  {
    kind: 'button',
    key: 'share',
    label: SHARE_BUTTON_LABEL,
    tone: 'share',
    onClick: onShare,
    disabled: shareDisabled,
  },
];

import type { CardActionConfig, CardActionView } from '../content/cards/types';
import { resolveActionUrl } from './runtime';

export const SHARE_BUTTON_LABEL = '分享此電子名片給 LINE 好友';

type BuildCardActionItemsInput = {
  actions: CardActionConfig[];
  fallbackUrl: string;
  onShare: () => void;
  shareDisabled?: boolean;
  shareLabel?: string;
};

const toLinkAction = (action: CardActionConfig, fallbackUrl: string): CardActionView | null => {
  if (action.enabled === false || !action.label.trim()) {
    return null;
  }

  return {
    kind: 'link',
    key: action.id,
    label: action.label,
    href: resolveActionUrl(action.url ?? '', fallbackUrl),
    tone: action.tone ?? 'secondary',
  };
};

export const buildCardActionItems = ({
  actions,
  fallbackUrl,
  onShare,
  shareDisabled = false,
  shareLabel = SHARE_BUTTON_LABEL,
}: BuildCardActionItemsInput): CardActionView[] => [
  ...actions.map((action) => toLinkAction(action, fallbackUrl)).filter((action): action is Exclude<CardActionView, { kind: 'button' }> => Boolean(action)),
  {
    kind: 'button',
    key: 'share',
    label: shareLabel.trim() || SHARE_BUTTON_LABEL,
    tone: 'share',
    onClick: onShare,
    disabled: shareDisabled,
  },
];

import { cards, getCardBySlug } from '../content/cards';
import { getCardLiffUrl, getCardShareUrl, getCardWebUrl } from '../lib/routes';
import { buildCardActionItems } from '../lib/card-actions';

describe('card collection', () => {
  it('loads required card fields', () => {
    expect(cards.length).toBeGreaterThanOrEqual(1);

    cards.forEach((card) => {
      expect(card.slug).toBeTruthy();
      expect(card.id).toBeTruthy();
      expect(card.content.brandName).toBeTruthy();
      expect(card.content.fullName).toBeTruthy();
      expect(card.content.highlights.length).toBeGreaterThan(0);
      expect(card.modules.showQrCode).toBeTypeOf('boolean');
    });
  });

  it('does not keep known placeholder urls in card actions', () => {
    cards.forEach((card) => {
      expect(card.photo.link).not.toContain('example');
      card.actions.forEach((action) => {
        expect(action.url ?? '').not.toContain('example');
      });
    });
  });

  it('finds cards by slug', () => {
    expect(getCardBySlug('default')?.content.fullName).toBe('蘇彥宇 Sunner');
    expect(getCardBySlug('demo-consultant')?.content.fullName).toBe('蘇彥宇 Sunner');
    expect(getCardBySlug('missing-card')).toBeUndefined();
  });

  it('builds card-specific web, liff, and share urls', () => {
    expect(getCardWebUrl('default')).toContain('/card/default/');
    expect(getCardLiffUrl('default', 'test-liff-id')).toBe('https://liff.line.me/test-liff-id/card/default/');
    expect(getCardShareUrl('default')).toContain('/card/default/');
  });

  it('keeps the formal card theme stable', () => {
    expect(getCardBySlug('default')?.appearance.theme).toBe('executive');
    expect(getCardBySlug('demo-consultant')?.appearance.theme).toBe('executive');
  });

  it('keeps share as the third action after the first two editable links', () => {
    const card = getCardBySlug('default');

    expect(card).toBeTruthy();

    const actions = buildCardActionItems({
      actions: [
        ...(card?.actions ?? []),
        {
          id: 'hidden',
          label: '隱藏按鈕',
          enabled: false,
        },
        {
          id: 'overflow',
          label: '不應出現的第四顆按鈕',
          url: '#overflow',
          enabled: true,
        },
      ],
      fallbackUrl: 'https://example.test/card/default/',
      onShare: () => undefined,
    });

    expect(actions).toHaveLength(3);
    expect(actions[0]).toMatchObject({
      kind: 'link',
      label: '立即聯繫我',
    });
    expect(actions[1]).toMatchObject({
      kind: 'link',
      label: '查看服務內容',
    });
    expect(actions[2]).toMatchObject({
      kind: 'button',
      key: 'share',
      label: '分享此電子名片給 LINE 好友',
    });
  });
});

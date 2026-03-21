import { cards, getCardBySlug } from '../content/cards';
import { getCardLiffUrl, getCardShareUrl, getCardWebUrl } from '../lib/routes';

describe('card collection', () => {
  it('loads required card fields', () => {
    expect(cards.length).toBeGreaterThanOrEqual(1);

    cards.forEach((card) => {
      expect(card.slug).toBeTruthy();
      expect(card.brand).toBeTruthy();
      expect(card.fullName).toBeTruthy();
      expect(card.highlights.length).toBeGreaterThan(0);
      expect(card.qrEnabled).toBeTypeOf('boolean');
    });
  });

  it('does not keep known placeholder urls in card actions', () => {
    cards.forEach((card) => {
      expect(card.heroLink).not.toContain('example');
      expect(card.contactAction.url).not.toContain('example');
      expect(card.bookingAction.url).not.toContain('example');
    });
  });

  it('finds cards by slug', () => {
    expect(getCardBySlug('default')?.fullName).toBe('姓名');
    expect(getCardBySlug('demo-consultant')?.fullName).toBe('姓名');
    expect(getCardBySlug('missing-card')).toBeUndefined();
  });

  it('builds card-specific web, liff, and share urls', () => {
    expect(getCardWebUrl('default')).toContain('/card/default/');
    expect(getCardLiffUrl('default', 'test-liff-id')).toBe('https://liff.line.me/test-liff-id/card/default/');
    expect(getCardShareUrl('default')).toContain('/card/default/');
  });

  it('keeps the formal card theme stable', () => {
    expect(getCardBySlug('default')?.theme).toBe('corporate');
    expect(getCardBySlug('demo-consultant')?.theme).toBe('corporate');
  });
});

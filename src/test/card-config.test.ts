import { cards, getCardBySlug } from '../content/cards';

describe('card collection', () => {
  it('loads required card fields', () => {
    expect(cards.length).toBeGreaterThanOrEqual(2);

    cards.forEach((card) => {
      expect(card.slug).toBeTruthy();
      expect(card.brand).toBeTruthy();
      expect(card.englishName).toBeTruthy();
      expect(card.bullets.length).toBeGreaterThan(0);
      expect(card.qrEnabled).toBeTypeOf('boolean');
    });
  });

  it('does not keep known placeholder urls in card actions', () => {
    cards.forEach((card) => {
      expect(card.heroLink).not.toContain('example');
      expect(card.button1.url).not.toContain('example');
      expect(card.button2.url).not.toContain('example');
      expect(card.button3.url).not.toContain('example');
    });
  });

  it('finds cards by slug', () => {
    expect(getCardBySlug('default')?.englishName).toBe('Client Success Office');
    expect(getCardBySlug('demo-consultant')?.englishName).toBe('Demo Consultant Studio');
    expect(getCardBySlug('missing-card')).toBeUndefined();
  });
});

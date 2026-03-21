import { cardConfig } from '../content/card.config';

describe('card config', () => {
  it('loads required fields', () => {
    expect(cardConfig.brand).toBeTruthy();
    expect(cardConfig.englishName).toBeTruthy();
    expect(cardConfig.bullets.length).toBeGreaterThan(0);
    expect(cardConfig.qrEnabled).toBeTypeOf('boolean');
  });

  it('does not keep known placeholder urls in card actions', () => {
    expect(cardConfig.heroLink).not.toContain('example');
    expect(cardConfig.button1.url).not.toContain('example');
    expect(cardConfig.button2.url).not.toContain('example');
    expect(cardConfig.button3.url).not.toContain('example');
  });
});

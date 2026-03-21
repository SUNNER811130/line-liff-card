import { cardConfig } from '../content/card.config';

describe('card config', () => {
  it('loads required fields', () => {
    expect(cardConfig.brand).toBeTruthy();
    expect(cardConfig.englishName).toBeTruthy();
    expect(cardConfig.bullets.length).toBeGreaterThan(0);
    expect(cardConfig.qrEnabled).toBeTypeOf('boolean');
  });
});

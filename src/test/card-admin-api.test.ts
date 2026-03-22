import { describe, expect, it } from 'vitest';
import { defaultCard } from '../content/cards/default';
import {
  buildCardApiUrl,
  extractConfigFromEnvelope,
  getCardApiErrorMessage,
  readCardApiJsonResponse,
} from '../lib/card-admin-api';

describe('card admin api helpers', () => {
  it('builds backend GET urls with action and slug parameters', () => {
    expect(buildCardApiUrl('https://example.test/exec', { action: 'getCard', slug: 'default' })).toBe(
      'https://example.test/exec?action=getCard&slug=default',
    );
  });

  it('extracts config from direct or nested backend envelopes', () => {
    expect(extractConfigFromEnvelope({ ok: true, config: defaultCard })).toEqual(defaultCard);
    expect(extractConfigFromEnvelope({ ok: true, data: { config: defaultCard } })).toEqual(defaultCard);
  });

  it('parses backend json responses and surfaces backend errors', async () => {
    const payload = await readCardApiJsonResponse(
      new Response(JSON.stringify({ ok: false, error: 'Invalid write token.' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    expect(getCardApiErrorMessage(payload, 'fallback')).toBe('Invalid write token.');
  });
});

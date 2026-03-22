export const CARD_API_ACTIONS = {
  health: 'health',
  getCard: 'getCard',
};

export const buildHealthUrl = (baseUrl) => {
  const url = new URL(baseUrl);
  url.searchParams.set('action', CARD_API_ACTIONS.health);
  return url.toString();
};

export const buildGetCardUrl = (baseUrl, slug = 'default') => {
  const url = new URL(baseUrl);
  url.searchParams.set('action', CARD_API_ACTIONS.getCard);
  url.searchParams.set('slug', slug);
  return url.toString();
};

export const parseBackendJson = async (response) => {
  const text = await response.text();
  if (!text) {
    throw new Error('Backend returned an empty response body.');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Backend did not return valid JSON.');
  }
};

export const assertWriteToken = (expectedToken, candidateToken) => {
  const expected = String(expectedToken ?? '').trim();
  const candidate = String(candidateToken ?? '').trim();

  if (!expected) {
    throw new Error('ADMIN_WRITE_SECRET is not configured.');
  }

  if (!candidate || candidate !== expected) {
    throw new Error('Invalid write token.');
  }

  return true;
};

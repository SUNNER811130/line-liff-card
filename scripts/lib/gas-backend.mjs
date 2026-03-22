export const CARD_API_ACTIONS = {
  health: 'health',
  initBackend: 'initBackend',
  getCard: 'getCard',
  saveCard: 'saveCard',
  debugRuntimeAccess: 'debugRuntimeAccess',
};

export const buildExecUrl = (deploymentId) => `https://script.google.com/macros/s/${deploymentId}/exec`;

export const maskToken = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '(empty)';
  }

  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-1)}`;
  }

  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
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

export const buildDebugRuntimeAccessUrl = (baseUrl) => {
  const url = new URL(baseUrl);
  url.searchParams.set('action', CARD_API_ACTIONS.debugRuntimeAccess);
  return url.toString();
};

export const buildInitBackendPayload = ({
  writeToken,
  sheetId,
  sheetName,
  updatedBy = '',
  config,
  slug = 'default',
  force = false,
  seedDefault = true,
} = {}) => ({
  action: CARD_API_ACTIONS.initBackend,
  writeToken,
  sheetId,
  sheetName,
  updatedBy,
  config,
  slug,
  force,
  seedDefault,
});

export const extractDeploymentId = (text) => {
  const match = String(text ?? '').match(/AKfycb[\w-]+/g);
  return match ? match.at(-1) ?? '' : '';
};

export const extractVersionNumber = (text) => {
  const match = String(text ?? '').match(/Created version (\d+)/);
  return match?.[1] ?? '';
};

export const buildSaveCardPayload = ({
  writeToken,
  updatedBy = '',
  config,
  slug = config?.slug ?? 'default',
} = {}) => ({
  action: CARD_API_ACTIONS.saveCard,
  writeToken,
  updatedBy,
  config,
  slug,
});

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
    throw new Error('CARD_ADMIN_WRITE_TOKEN is not configured.');
  }

  if (!candidate || candidate !== expected) {
    throw new Error('Invalid write token.');
  }

  return true;
};

import defaultCardSeed from '../../src/content/cards/default.seed.json' with { type: 'json' };

export const DEFAULT_RUNTIME_SHEET_NAME = 'cards_runtime';
export const RUNTIME_SHEET_HEADERS = ['slug', 'config_json', 'updated_at', 'updated_by'];
export const DEFAULT_RUNTIME_SLUG = 'default';

export const cloneJson = (value) => JSON.parse(JSON.stringify(value));

export const getDefaultSeedConfig = () => cloneJson(defaultCardSeed);

export const createRuntimeRow = ({
  slug = DEFAULT_RUNTIME_SLUG,
  config = getDefaultSeedConfig(),
  updatedAt = new Date().toISOString(),
  updatedBy = 'runtime-sheet',
} = {}) => [slug, JSON.stringify(config), updatedAt, updatedBy];

const normalizeCell = (value) => String(value ?? '').trim();

const hasRequiredHeader = (row = []) =>
  RUNTIME_SHEET_HEADERS.every((header, index) => normalizeCell(row[index]) === header);

export const initializeRuntimeSheetMatrix = ({
  matrix = [],
  seedConfig = getDefaultSeedConfig(),
  slug = DEFAULT_RUNTIME_SLUG,
  updatedBy = 'runtime-sheet',
  force = false,
  seedDefault = true,
  now = new Date().toISOString(),
} = {}) => {
  const nextMatrix = matrix.map((row) => [...row]);
  let createdHeader = false;
  let seededDefault = false;
  let replacedExisting = false;

  if (nextMatrix.length === 0) {
    nextMatrix.push([...RUNTIME_SHEET_HEADERS]);
    createdHeader = true;
  } else if (!hasRequiredHeader(nextMatrix[0])) {
    throw new Error(`Runtime sheet header mismatch. Expected: ${RUNTIME_SHEET_HEADERS.join(', ')}`);
  }

  if (!seedDefault) {
    return {
      matrix: nextMatrix,
      createdHeader,
      seededDefault,
      replacedExisting,
    };
  }

  const targetSlug = normalizeCell(slug) || DEFAULT_RUNTIME_SLUG;
  const nextConfig = cloneJson(seedConfig);
  if (normalizeCell(nextConfig.slug) !== targetSlug) {
    throw new Error(`Seed config slug mismatch. Expected ${targetSlug}, received ${normalizeCell(nextConfig.slug)}.`);
  }

  const existingIndex = nextMatrix.findIndex((row, index) => index > 0 && normalizeCell(row[0]) === targetSlug);
  const nextRow = createRuntimeRow({
    slug: targetSlug,
    config: nextConfig,
    updatedAt: now,
    updatedBy,
  });

  if (existingIndex === -1) {
    nextMatrix.push(nextRow);
    seededDefault = true;
  } else if (force) {
    nextMatrix[existingIndex] = nextRow;
    seededDefault = true;
    replacedExisting = true;
  }

  return {
    matrix: nextMatrix,
    createdHeader,
    seededDefault,
    replacedExisting,
  };
};

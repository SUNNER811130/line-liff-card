import { beforeAll, describe, expect, it } from 'vitest';
import { defaultCard } from '../content/cards/default';

type RuntimeSheetModule = {
  DEFAULT_RUNTIME_SLUG: string;
  RUNTIME_SHEET_HEADERS: string[];
  createRuntimeRow: (input: {
    slug: string;
    config: unknown;
    updatedAt: string;
    updatedBy: string;
  }) => [string, string, string, string];
  initializeRuntimeSheetMatrix: (input: {
    matrix: string[][];
    updatedBy?: string;
    now?: string;
    force?: boolean;
  }) => {
    createdHeader: boolean;
    seededDefault: boolean;
    replacedExisting: boolean;
    matrix: string[][];
  };
};

type GasBackendModule = {
  assertWriteToken: (expectedToken: string, candidateToken: string) => true;
};

let runtimeSheet: RuntimeSheetModule;
let gasBackend: GasBackendModule;

beforeAll(async () => {
  const runtimeSheetModulePath = new URL('../../scripts/lib/runtime-sheet.mjs', import.meta.url).pathname;
  const gasBackendModulePath = new URL('../../scripts/lib/gas-backend.mjs', import.meta.url).pathname;
  runtimeSheet = (await import(runtimeSheetModulePath)) as RuntimeSheetModule;
  gasBackend = (await import(gasBackendModulePath)) as GasBackendModule;
});

describe('runtime sheet initialization', () => {
  it('creates header row and seeds the default card when the sheet is empty', () => {
    const result = runtimeSheet.initializeRuntimeSheetMatrix({
      matrix: [],
      updatedBy: 'test-runner',
      now: '2026-03-22T00:00:00.000Z',
    });

    expect(result.createdHeader).toBe(true);
    expect(result.seededDefault).toBe(true);
    expect(result.replacedExisting).toBe(false);
    expect(result.matrix[0]).toEqual(runtimeSheet.RUNTIME_SHEET_HEADERS);
    expect(result.matrix[1][0]).toBe(runtimeSheet.DEFAULT_RUNTIME_SLUG);
    expect(JSON.parse(result.matrix[1][1])).toEqual(defaultCard);
  });

  it('does not overwrite an existing default row unless force is enabled', () => {
    const existingRow = runtimeSheet.createRuntimeRow({
      slug: 'default',
      config: {
        ...defaultCard,
        content: {
          ...defaultCard.content,
          fullName: '既有正式資料',
        },
      },
      updatedAt: '2026-03-21T00:00:00.000Z',
      updatedBy: 'existing-user',
    });

    const keepResult = runtimeSheet.initializeRuntimeSheetMatrix({
      matrix: [runtimeSheet.RUNTIME_SHEET_HEADERS, existingRow],
      now: '2026-03-22T00:00:00.000Z',
    });
    expect(keepResult.seededDefault).toBe(false);
    expect(JSON.parse(keepResult.matrix[1][1]).content.fullName).toBe('既有正式資料');

    const replaceResult = runtimeSheet.initializeRuntimeSheetMatrix({
      matrix: [runtimeSheet.RUNTIME_SHEET_HEADERS, existingRow],
      force: true,
      now: '2026-03-22T00:00:00.000Z',
    });
    expect(replaceResult.seededDefault).toBe(true);
    expect(replaceResult.replacedExisting).toBe(true);
    expect(JSON.parse(replaceResult.matrix[1][1]).content.fullName).toBe(defaultCard.content.fullName);
  });

  it('rejects invalid write token candidates', () => {
    expect(() => gasBackend.assertWriteToken('expected-token', 'wrong-token')).toThrow('Invalid write token.');
    expect(gasBackend.assertWriteToken('expected-token', 'expected-token')).toBe(true);
  });
});

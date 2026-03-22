declare module '../../scripts/lib/runtime-sheet.mjs' {
  export const DEFAULT_RUNTIME_SHEET_NAME: string;
  export const RUNTIME_SHEET_HEADERS: string[];
  export const DEFAULT_RUNTIME_SLUG: string;
  export const cloneJson: <T>(value: T) => T;
  export const getDefaultSeedConfig: () => unknown;
  export const createRuntimeRow: (input?: {
    slug?: string;
    config?: unknown;
    updatedAt?: string;
    updatedBy?: string;
  }) => [string, string, string, string];
  export const initializeRuntimeSheetMatrix: (input?: {
    matrix?: string[][];
    seedConfig?: unknown;
    slug?: string;
    updatedBy?: string;
    force?: boolean;
    seedDefault?: boolean;
    now?: string;
  }) => {
    matrix: string[][];
    createdHeader: boolean;
    seededDefault: boolean;
    replacedExisting: boolean;
  };
}

declare module '../../scripts/lib/gas-backend.mjs' {
  export const CARD_API_ACTIONS: Record<string, string>;
  export const buildExecUrl: (deploymentId: string) => string;
  export const maskToken: (value: string) => string;
  export const buildHealthUrl: (baseUrl: string) => string;
  export const buildGetCardUrl: (baseUrl: string, slug?: string) => string;
  export const buildInitBackendPayload: (input?: Record<string, unknown>) => Record<string, unknown>;
  export const buildSaveCardPayload: (input?: Record<string, unknown>) => Record<string, unknown>;
  export const parseBackendJson: (response: Response) => Promise<unknown>;
  export const assertWriteToken: (expectedToken: string, candidateToken: string) => true;
}

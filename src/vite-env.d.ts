/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CARD_API_BASE_URL?: string;
  readonly VITE_LIFF_ID?: string;
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AIRTABLE_BASE_ID?: string;
  readonly VITE_DEV_USER_EMAIL?: string;
  readonly VITE_DEV_USER_NAME?: string;
  readonly VITE_DEV_USER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

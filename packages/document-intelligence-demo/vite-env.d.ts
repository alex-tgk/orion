/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_AI_WRAPPER_URL?: string;
  readonly VITE_USE_REAL_AI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

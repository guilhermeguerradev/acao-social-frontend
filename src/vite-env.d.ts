/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_API_PROTOCOL?: string;
  readonly VITE_API_HOST?: string;
  readonly VITE_API_PORT?: string;
  readonly VITE_DEV_HOST?: string;
  readonly VITE_DEV_PORT?: string;
  readonly VITE_PREVIEW_HOST?: string;
  readonly VITE_PREVIEW_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

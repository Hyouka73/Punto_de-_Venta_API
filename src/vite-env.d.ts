interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly VITE_APP_MODE?: string;
  readonly VITE_DATA_ADAPTER?: string;
  readonly VITE_ENABLE_TRANSFERENCIAS?: string;
  readonly VITE_SHEETS_WEBAPP_URL?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_VERSION?: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

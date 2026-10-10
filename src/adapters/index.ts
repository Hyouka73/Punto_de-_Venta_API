import type { IDataAdapter } from '../domain/ports/IDataAdapter';
import { ENV, type DataAdapterType } from '../config/env';
import { MockDataAdapter } from './MockDataAdapter';
import { SheetsAppsScriptAdapter } from './SheetsAppsScriptAdapter';

export * from './MockDataAdapter';
export * from './SheetsAppsScriptAdapter';
export * from './sheetsSchema';

/**
 * Fábrica y proveedor desacoplado de la instancia de persistencia activa (IDataAdapter).
 *
 * Durante desarrollo o pruebas locales usa MockDataAdapter (en memoria).
 * En producción o staging con Google Sheets usa SheetsAppsScriptAdapter.
 */
export function createDataAdapter(
  overrideType?: DataAdapterType,
  webappUrl?: string
): IDataAdapter {
  let stored: string | null = null;
  let storedUrl: string | null = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    stored = window.localStorage.getItem('pos_adapter_mode');
    storedUrl = window.localStorage.getItem('pos_webapp_url');
  }
  const type = overrideType || (stored as DataAdapterType | null) || ENV.dataAdapter;
  if (type === 'sheets') {
    const validStoredUrl = storedUrl && storedUrl.trim().length > 0 ? storedUrl.trim() : undefined;
    const url = webappUrl || validStoredUrl || ENV.sheetsWebappUrl || undefined;
    return url ? new SheetsAppsScriptAdapter({ webappUrl: url }) : new SheetsAppsScriptAdapter();
  }
  return new MockDataAdapter();
}

/**
 * Instancia singleton predeterminada configurada por entorno
 */
export const defaultDataAdapter: IDataAdapter = createDataAdapter();

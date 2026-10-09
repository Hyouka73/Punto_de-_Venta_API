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
export function createDataAdapter(overrideType?: DataAdapterType): IDataAdapter {
  const type = overrideType || ENV.dataAdapter;
  if (type === 'sheets') {
    return new SheetsAppsScriptAdapter();
  }
  return new MockDataAdapter();
}

/**
 * Instancia singleton predeterminada configurada por entorno
 */
export const defaultDataAdapter: IDataAdapter = createDataAdapter();

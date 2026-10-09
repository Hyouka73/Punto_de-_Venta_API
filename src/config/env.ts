/**
 * Configuración de entorno y validación en tiempo de arranque.
 * POS Paletería v2 - Capa de Configuración
 */

export type AppMode = 'LOCAL' | 'DEV' | 'PROD';
export type DataAdapterType = 'mock' | 'sheets';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA';

export interface AppConfig {
  readonly appMode: AppMode;
  readonly dataAdapter: DataAdapterType;
  readonly enableTransferencias: boolean;
  readonly sheetsWebappUrl: string;
  readonly appTitle: string;
  readonly appVersion: string;
  readonly metodosPagoPermitidos: readonly MetodoPago[];
}

/**
 * Obtiene el valor de una variable de entorno con soporte universal
 * (Vite import.meta.env con fallback a process.env para pruebas unitarias Node)
 */
function getRawEnvValue(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const val = (import.meta.env as unknown as Record<string, string | undefined>)[key];
    if (val !== undefined && val !== '') return val;
  }
  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (globalProcess && globalProcess.env) {
    const val = globalProcess.env[key];
    if (val !== undefined && val !== '') return val;
  }
  return undefined;
}

/**
 * Valida y normaliza la configuración de entorno en tiempo de inicialización.
 */
export function loadAndValidateConfig(): AppConfig {
  const rawMode = (getRawEnvValue('VITE_APP_MODE') ?? 'LOCAL').toUpperCase();
  const appMode: AppMode =
    rawMode === 'DEV' || rawMode === 'PROD' ? rawMode : 'LOCAL';

  const rawAdapter = (getRawEnvValue('VITE_DATA_ADAPTER') ?? 'mock').toLowerCase();
  const dataAdapter: DataAdapterType =
    rawAdapter === 'sheets' ? 'sheets' : 'mock';

  const rawTransferencias = getRawEnvValue('VITE_ENABLE_TRANSFERENCIAS');
  const enableTransferencias =
    rawTransferencias === 'true' || rawTransferencias === '1';

  const sheetsWebappUrl = getRawEnvValue('VITE_SHEETS_WEBAPP_URL') ?? '';

  // Validación de invariante: si se usa adaptador sheets en modo no local, debe haber URL
  if (dataAdapter === 'sheets' && appMode !== 'LOCAL' && !sheetsWebappUrl) {
    throw new Error(
      `[Configuración Inválida] VITE_DATA_ADAPTER está configurado como 'sheets' en modo '${appMode}', pero VITE_SHEETS_WEBAPP_URL está vacío.`
    );
  }

  const appTitle = getRawEnvValue('VITE_APP_TITLE') ?? 'POS Paletería v2';
  const appVersion = getRawEnvValue('VITE_APP_VERSION') ?? '2.0.0';

  // Métodos de pago permitidos según R15: Efectivo es base, Transferencias es opcional
  const metodosPago: MetodoPago[] = ['EFECTIVO'];
  if (enableTransferencias) {
    metodosPago.push('TRANSFERENCIA');
  }

  return Object.freeze({
    appMode,
    dataAdapter,
    enableTransferencias,
    sheetsWebappUrl,
    appTitle,
    appVersion,
    metodosPagoPermitidos: Object.freeze(metodosPago),
  });
}

/**
 * Imprime en consola el resumen de estado del entorno activo de forma profesional y clara.
 */
export function printEnvStatus(config: AppConfig): void {
  const badgeStyle = 'background: #0284C7; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;';
  const info = `[${config.appTitle} v${config.appVersion}] Modo: ${config.appMode} | Adaptador: ${config.dataAdapter} | Métodos de Pago: [${config.metodosPagoPermitidos.join(', ')}]`;

  if (typeof window !== 'undefined' && typeof console !== 'undefined') {
    console.info(`%cPOS%c ${info}`, badgeStyle, '');
  } else {
    console.info(info);
  }
}

/**
 * Instancia singleton inmutable de la configuración de la aplicación
 */
export const ENV: AppConfig = loadAndValidateConfig();

// Imprimir estado en arranque
printEnvStatus(ENV);

/**
 * Helpers de conveniencia
 */
export const isLocalMode = (): boolean => ENV.appMode === 'LOCAL';
export const isDevMode = (): boolean => ENV.appMode === 'DEV';
export const isProdMode = (): boolean => ENV.appMode === 'PROD';
export const isMockAdapter = (): boolean => ENV.dataAdapter === 'mock';
export const isTransferenciasEnabled = (): boolean => ENV.enableTransferencias;

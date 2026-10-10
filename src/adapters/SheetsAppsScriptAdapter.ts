import type {
  CatalogResponse,
  CloseJornadaDTO,
  DailySummaryResponse,
  IDataAdapter,
  OpenJornadaDTO,
  ParametersResponse,
} from '../domain/ports/IDataAdapter';
import type { Jornada, Movimiento, CierreResumen } from '../domain/types';
import { ENV } from '../config/env';

export interface SheetsAppsScriptAdapterOptions {
  readonly webappUrl?: string;
  readonly fetchFn?: typeof fetch;
  readonly timeoutMs?: number;
}

export interface PinValidationResponse {
  readonly success: boolean;
  readonly valido: boolean;
  readonly rol?: string;
  readonly error?: string;
  readonly intentosRestantes?: number;
  readonly segundosRestantes?: number;
}

/**
 * Normaliza y valida una URL o ID de despliegue de Google Apps Script.
 * Acepta:
 * - URL completa: https://script.google.com/macros/s/{id}/exec
 * - URL sin /exec: https://script.google.com/macros/s/{id} -> agrega /exec
 * - URL sin https://: script.google.com/macros/s/{id}/exec -> agrega https://
 * - ID de despliegue puro: AKfycbw... -> https://script.google.com/macros/s/{id}/exec
 */
export function normalizeGoogleAppsScriptUrl(input: string): string {
  if (!input) return '';
  let url = input.trim();
  if (!url) return '';

  // Caso: ID puro de despliegue de Google Apps Script (inicia con AKfycb...)
  if (/^AKfycb[a-zA-Z0-9_-]+$/.test(url)) {
    return `https://script.google.com/macros/s/${url}/exec`;
  }

  // Caso: omite https://
  if (url.startsWith('script.google.com/')) {
    url = `https://${url}`;
  }

  // Caso: URL de Apps Script pero sin /exec al final (termina en id o en /)
  if (url.includes('/macros/s/') && !url.endsWith('/exec')) {
    url = url.replace(/\/+$/, '') + '/exec';
  }

  return url;
}

/**
 * Adaptador de Datos para Producción con Google Sheets + Google Apps Script (GAS).
 *
 * Se comunica con la Web App de Apps Script mediante solicitudes HTTP optimizadas:
 * - Evita preflight CORS gracias al manejo de text/plain en GAS.
 * - Desduplicación idempotente garantizada en backend por id_mov.
 * - Sigue redirecciones HTTP 302 nativas de Google Apps Script.
 */
export class SheetsAppsScriptAdapter implements IDataAdapter {
  private readonly webappUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: SheetsAppsScriptAdapterOptions = {}) {
    const rawUrl = options.webappUrl !== undefined ? options.webappUrl : ENV.sheetsWebappUrl;
    this.webappUrl = normalizeGoogleAppsScriptUrl(rawUrl);
    const scope = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : null);
    const rawFetch = options.fetchFn || (typeof globalThis !== 'undefined' ? globalThis.fetch : (typeof window !== 'undefined' ? window.fetch : fetch));
    // Bindeo estricto al contexto global para evitar "Illegal invocation" en navegadores
    this.fetchFn = scope && typeof rawFetch?.bind === 'function' ? rawFetch.bind(scope) : rawFetch;
    this.timeoutMs = options.timeoutMs ?? 20000;
  }

  /**
   * Invoca fetch garantizando que el contexto 'this' pertenezca a Window/globalThis
   */
  private async executeFetch(url: string, init?: RequestInit): Promise<Response> {
    const scope = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : null);
    const fn = this.fetchFn || (typeof globalThis !== 'undefined' ? globalThis.fetch : fetch);
    if (scope && typeof fn?.call === 'function') {
      return fn.call(scope, url, init);
    }
    return fn(url, init);
  }

  /**
   * Ejecuta una petición HTTP POST contra Google Apps Script
   */
  private async postRequest<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!this.webappUrl) {
      throw new Error(
        `[SheetsAppsScriptAdapter] La URL del backend de Google Apps Script no está configurada. Verifica VITE_SHEETS_WEBAPP_URL.`
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.executeFetch(this.webappUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Evita preflight CORS OPTIONS
        },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `[SheetsAppsScriptAdapter] Error HTTP ${response.status}: ${response.statusText}`
        );
      }

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error(
          `[SheetsAppsScriptAdapter] Respuesta inválida del servidor (no es JSON): ${text.substring(0, 100)}`
        );
      }

      if (data && data.success === false && data.error) {
        throw new Error(`[SheetsAppsScriptAdapter] Error de servidor: ${data.error}`);
      }

      return data as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(
          `[SheetsAppsScriptAdapter] Tiempo de espera agotado (${this.timeoutMs}ms) conectando a Google Apps Script.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Obtiene el catálogo público de productos y combos
   */
  async getCatalog(): Promise<CatalogResponse> {
    const res = await this.postRequest<{ success: boolean; items: any[]; version?: string }>(
      'GET_CATALOG'
    );
    return {
      items: res.items,
      version: res.version,
    };
  }

  /**
   * Obtiene los parámetros operativos del negocio
   */
  async getParameters(): Promise<ParametersResponse> {
    const res = await this.postRequest<{ success: boolean; parameters: any }>('GET_PARAMETERS');
    return {
      parameters: res.parameters,
    };
  }

  /**
   * Consulta si existe una jornada activa actualmente
   */
  async getActiveJornada(): Promise<Jornada | null> {
    const res = await this.postRequest<{ success: boolean; jornada: Jornada | null }>(
      'GET_ACTIVE_JORNADA'
    );
    return res.jornada;
  }

  /**
   * Abre una nueva jornada registrando fondo inicial e inventario
   */
  async openJornada(data: OpenJornadaDTO): Promise<{ success: boolean; jornada: Jornada }> {
    const res = await this.postRequest<{ success: boolean; jornada: Jornada }>('OPEN_JORNADA', {
      fecha: data.fecha,
      fondoInicial: data.fondoInicial,
      inventarioInicial: data.inventarioInicial,
      usuarioApertura: data.usuarioApertura,
      notaApertura: data.notaApertura,
    });
    return {
      success: res.success,
      jornada: res.jornada,
    };
  }

  /**
   * Envía un lote de movimientos con desduplicación en servidor (idempotencia)
   */
  async submitMovements(
    movements: readonly Movimiento[]
  ): Promise<{ success: boolean; syncedIds: string[] }> {
    const res = await this.postRequest<{ success: boolean; syncedIds: string[] }>(
      'SUBMIT_MOVEMENTS',
      {
        movements,
      }
    );
    return {
      success: res.success,
      syncedIds: res.syncedIds,
    };
  }

  /**
   * Realiza el cierre guiado y liquidación de jornada
   */
  async closeJornada(
    data: CloseJornadaDTO
  ): Promise<{ success: boolean; resumen: CierreResumen }> {
    const res = await this.postRequest<{ success: boolean; resumen: CierreResumen }>(
      'CLOSE_JORNADA',
      {
        jornadaId: data.jornadaId,
        usuarioCierre: data.usuarioCierre,
        efectivoContado: data.efectivoContado,
        restantesFisicos: data.restantesFisicos,
        entradas: data.entradas,
        mermas: data.mermas,
        notaCierre: data.notaCierre,
      }
    );
    return {
      success: res.success,
      resumen: res.resumen,
    };
  }

  /**
   * Obtiene el resumen del día consolidado
   */
  async getDailySummary(jornadaId: string): Promise<DailySummaryResponse> {
    const res = await this.postRequest<{
      success: boolean;
      totalVentas: number;
      ventasPorCategoria: Record<string, number>;
      jornada?: Jornada;
      stockActual?: Record<string, { stockActual: number; esNegativo: boolean }>;
    }>('GET_DAILY_SUMMARY', { jornadaId });

    return {
      jornada: res.jornada ?? {
        id: jornadaId,
        fecha: new Date().toISOString().substring(0, 10),
        estado: 'ABIERTA',
        ts_apertura: new Date().toISOString(),
        fondo_inicial: 200,
        usuario_apertura: 'supervisora',
        inventario_inicial: {},
      },
      totalVentas: res.totalVentas,
      ventasPorCategoria: res.ventasPorCategoria,
      stockActual: res.stockActual ?? {},
    };
  }

  /**
   * Valida un PIN de Supervisora o Admin en Google Apps Script
   */
  async validatePin(pin: string, rol: 'SUPERVISORA' | 'ADMIN'): Promise<PinValidationResponse> {
    const res = await this.postRequest<PinValidationResponse>('VALIDATE_PIN', {
      pin,
      rol,
    });
    return res;
  }

  /**
   * Ejecuta un test de conectividad en vivo contra la Web App de Apps Script
   */
  async testConnection(overrideUrl?: string): Promise<{
    success: boolean;
    latencyMs: number;
    itemCount?: number;
    error?: string;
  }> {
    const rawUrl = overrideUrl !== undefined ? overrideUrl : this.webappUrl;
    const targetUrl = normalizeGoogleAppsScriptUrl(rawUrl);
    if (!targetUrl) {
      return {
        success: false,
        latencyMs: 0,
        error: 'URL de Google Apps Script no configurada',
      };
    }

    const t0 = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await this.executeFetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'GET_CATALOG' }),
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const t1 = performance.now();
      const latencyMs = Math.round(t1 - t0);

      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          error: `Error HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return {
          success: false,
          latencyMs,
          error: 'La respuesta del servidor no es un JSON válido. Verifica la configuración de la Web App en Google Apps Script.',
        };
      }

      if (data && data.success) {
        return {
          success: true,
          latencyMs,
          itemCount: Array.isArray(data.items) ? data.items.length : 0,
        };
      }
      return {
        success: false,
        latencyMs,
        error: data?.error || 'Respuesta inesperada del backend',
      };
    } catch (err: any) {
      const t1 = performance.now();
      const latencyMs = Math.round(t1 - t0);
      let errorMsg = err.message || 'Fallo de red al conectar con Google Apps Script';
      if (err.name === 'AbortError') {
        errorMsg = 'Tiempo de espera agotado (20s). Puede deberse al cold start inicial de Google Apps Script. Por favor reintenta.';
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = 'No se pudo contactar a Google Apps Script (Failed to fetch). Verifica que en el despliegue de Apps Script el acceso esté configurado en: "Quién tiene acceso: Cualquier usuario" (Anyone).';
      }
      return {
        success: false,
        latencyMs,
        error: errorMsg,
      };
    }
  }
}

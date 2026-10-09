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
    this.webappUrl = options.webappUrl || ENV.sheetsWebappUrl;
    this.fetchFn = options.fetchFn || (typeof globalThis !== 'undefined' ? globalThis.fetch : fetch);
    this.timeoutMs = options.timeoutMs ?? 15000;
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
      const response = await this.fetchFn(this.webappUrl, {
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
}

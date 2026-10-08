import type {
  CatalogoItem,
  ParametrosNegocio,
} from '../config/types';
import type {
  CierreResumen,
  Jornada,
  Movimiento,
} from '../types';

export interface CatalogResponse {
  readonly items: readonly CatalogoItem[];
  readonly version?: string;
}

export interface ParametersResponse {
  readonly parameters: ParametrosNegocio;
}

export interface OpenJornadaDTO {
  readonly fecha: string;
  readonly fondoInicial: number;
  readonly inventarioInicial: Readonly<Record<string, number>>;
  readonly usuarioApertura: string;
  readonly notaApertura?: string;
}

export interface CloseJornadaDTO {
  readonly jornadaId: string;
  readonly usuarioCierre: string;
  readonly efectivoContado: number;
  readonly restantesFisicos: Readonly<Record<string, number>>;
  readonly entradas?: Readonly<Record<string, number>>;
  readonly mermas?: Readonly<Record<string, number>>;
  readonly notaCierre?: string;
}

export interface DailySummaryResponse {
  readonly jornada: Jornada;
  readonly totalVentas: number;
  readonly ventasPorCategoria: Readonly<Record<string, number>>;
  readonly resumenCierre?: CierreResumen;
  readonly stockActual: Readonly<Record<string, { stockActual: number; esNegativo: boolean }>>;
}

/**
 * Puerto Primario de Persistencia y Comunicación de Datos (IDataAdapter).
 *
 * Desacopla por completo la aplicación del motor de persistencia (MockDataAdapter para desarrollo
 * o SheetsDataAdapter para producción con Google Apps Script).
 */
export interface IDataAdapter {
  getCatalog(): Promise<CatalogResponse>;
  getParameters(): Promise<ParametersResponse>;
  getActiveJornada(): Promise<Jornada | null>;
  openJornada(data: OpenJornadaDTO): Promise<{ success: boolean; jornada: Jornada }>;
  closeJornada(data: CloseJornadaDTO): Promise<{ success: boolean; resumen: CierreResumen }>;
  submitMovements(movements: readonly Movimiento[]): Promise<{ success: boolean; syncedIds: string[] }>;
  getDailySummary(jornadaId: string): Promise<DailySummaryResponse>;
}

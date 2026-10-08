/**
 * Modelo de Datos e Interfaces de Dominio (POS Paletería v2)
 * Tipos inmutables (readonly) puros sin dependencias de UI ni red.
 */

import type {
  CatalogoItem,
  ComponenteCombo,
  MotivoMermaId,
  MotivoMermaInfo,
  ParametrosNegocio,
} from './config/types';

export type {
  CatalogoItem,
  ComponenteCombo,
  MotivoMermaId,
  MotivoMermaInfo,
  ParametrosNegocio,
};

/**
 * Tipos de movimiento atómico soportados por el POS
 */
export type TipoMovimiento =
  | 'VENTA'
  | 'ANULACION'
  | 'MERMA'
  | 'ENTRADA'
  | 'AJUSTE'
  | 'RECONSTRUCCION'
  | 'APERTURA';

/**
 * Métodos de pago disponibles
 */
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA';

/**
 * Estado de sincronización en el cliente
 */
export type EstadoSincronizacion = 'PENDIENTE' | 'CONFIRMADO' | 'ERROR';

/**
 * Movimiento inmutable registrado en el cliente antes de tocar la red.
 * Cada movimiento tiene un id_mov UUID v4 único generado al momento del toque.
 */
export interface Movimiento {
  readonly id_mov: string;
  readonly jornada_id: string;
  readonly tipo: TipoMovimiento;
  readonly categoria_id: string;
  readonly cantidad: number;
  readonly precio_unitario: number;
  readonly monto_total: number;
  readonly metodo_pago: MetodoPago;
  readonly ref_mov?: string; // Para ANULACION, referencia al id_mov original
  readonly motivo?: MotivoMermaId | string; // Para MERMA o justificación de AJUSTE/ANULACION
  readonly usuario: string; // 'mostrador' | 'supervisora' | 'admin'
  readonly dispositivo_id: string;
  readonly ts_cliente: string; // ISO 8601 local
  readonly ts_servidor?: string; // ISO 8601 asignado por Apps Script
  readonly estado_sincronizacion?: EstadoSincronizacion;
  readonly reloj_desfasado?: boolean; // R17: true si desfase absoluto > 15 min
  readonly nota?: string;
}

/**
 * Estado del ciclo de vida de una jornada de negocio
 */
export type EstadoJornada = 'ABIERTA' | 'CERRADA' | 'CERRADA_SIN_CONTEO';

/**
 * Jornada de negocio (R1). Solo una jornada puede estar abierta a la vez.
 */
export interface Jornada {
  readonly id: string;
  readonly fecha: string; // YYYY-MM-DD
  readonly estado: EstadoJornada;
  readonly ts_apertura: string;
  readonly ts_cierre?: string;
  readonly fondo_inicial: number;
  readonly usuario_apertura: string;
  readonly usuario_cierre?: string;
  readonly inventario_inicial: Readonly<Record<string, number>>; // CategoriaId -> Piezas físicas
  readonly nota_apertura?: string;
  readonly nota_cierre?: string;
}

/**
 * Categoría base de producto
 */
export interface Categoria {
  readonly id: string;
  readonly nombre: string;
  readonly precio: number;
  readonly costo: number;
  readonly icono: string;
  readonly color: string;
  readonly orden: number;
  readonly activo: boolean;
  readonly controla_stock: boolean;
}

/**
 * Definición de Combo (R4)
 */
export interface Combo {
  readonly id: string;
  readonly nombre: string;
  readonly precio: number;
  readonly costo: number;
  readonly icono: string;
  readonly color: string;
  readonly orden: number;
  readonly activo: boolean;
  readonly es_combo: true;
  readonly componentes: readonly ComponenteCombo[];
}

/**
 * Resultado del semáforo de cierre de caja (R11)
 */
export type SemaforoCierre = 'VERDE' | 'AMBAR' | 'ROJO';

/**
 * Detalle analítico por categoría en el Cierre Guiado (R10)
 */
export interface CierreDetalle {
  readonly categoria_id: string;
  readonly categoria_nombre: string;
  readonly apertura: number;
  readonly entradas: number;
  readonly mermas: number;
  readonly restantes_fisicos: number;
  readonly piezas_conteo: number; // Apertura + Entradas - Mermas - Restantes
  readonly piezas_toques: number; // Ventas directas + Combos expandidos
  readonly discrepancia_piezas: number; // piezas_conteo - piezas_toques
  readonly precio_unitario: number;
  readonly dinero_esperado: number;
  readonly propuesta_reconstruccion: number; // Faltantes > 0 candidatos a reconstruir
}

/**
 * Resumen consolidado del Cierre Guiado (Cuadre Triple - R10, R11, R13)
 */
export interface CierreResumen {
  readonly jornada_id: string;
  readonly fecha: string;
  readonly ts_cierre: string;
  readonly usuario_cierre: string;
  readonly fondo_inicial: number;
  readonly efectivo_contado: number;
  readonly efectivo_neto: number; // efectivo_contado - fondo_inicial
  readonly ventas_efectivo: number;
  readonly ventas_transferencia: number;
  readonly reconstrucciones_total: number;
  readonly dinero_esperado: number;
  readonly diferencia_final: number; // efectivo_neto - dinero_esperado
  readonly semaforo: SemaforoCierre;
  readonly detalles_por_categoria: readonly CierreDetalle[];
  readonly explicaciones: readonly string[];
  readonly total_piezas_conteo: number;
  readonly total_piezas_toques: number;
  readonly total_mermas: number;
  readonly total_consumo_casa: number;
}

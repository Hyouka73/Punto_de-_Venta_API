/**
 * Tipos de configuración del catálogo y parámetros de negocio
 * POS Paletería v2 - Capa de Dominio (Pura, sin dependencias de UI/red)
 */

export interface ComponenteCombo {
  readonly id: string;
  readonly cant: number;
  readonly cantidad?: number;
}

export interface CatalogoItem {
  readonly id: string;
  readonly nombre: string;
  readonly precio: number;
  readonly costo: number;
  readonly icono: string;
  readonly color: string;
  readonly orden: number;
  readonly activo: boolean;
  readonly controla_stock: boolean;
  readonly es_combo?: boolean;
  readonly componentes?: readonly ComponenteCombo[];
}

export type MotivoMermaId =
  | 'palo_roto_deforme'
  | 'descongelada_cristalizada'
  | 'consumo_casa';

export interface MotivoMermaInfo {
  readonly id: MotivoMermaId;
  readonly etiqueta: string;
  readonly descripcion: string;
  readonly cuentaComoPerdidaCaja: boolean;
}

export interface ParametrosNegocio {
  readonly tolerancia_verde: number;
  readonly tolerancia_ambar: number;
  readonly fondo_caja_default: number;
  readonly ventana_deshacer_min: number;
  readonly timezone: string;
  readonly schema_version: string;
  readonly motivos_merma: readonly MotivoMermaInfo[];
}

import type { ParametrosNegocio, MotivoMermaInfo } from './types';

/**
 * Catálogo de motivos estándar de merma según R6 del Plan Maestro v2.
 */
export const MOTIVOS_MERMA: readonly MotivoMermaInfo[] = [
  {
    id: 'palo_roto_deforme',
    etiqueta: 'Palo Roto / Deforme',
    descripcion: 'Producto dañado físicamente por manipulación o defecto.',
    cuentaComoPerdidaCaja: false,
  },
  {
    id: 'descongelada_cristalizada',
    etiqueta: 'Descongelada / Cristalizada',
    descripcion: 'Producto afectado por temperatura o cadena de frío.',
    cuentaComoPerdidaCaja: false,
  },
  {
    id: 'consumo_casa',
    etiqueta: 'Consumo de la Casa',
    descripcion: 'Producto consumido por la familia o personal.',
    cuentaComoPerdidaCaja: false,
  },
] as const;

/**
 * Parámetros operativos y reglas numéricas por defecto del POS.
 */
export const DEFAULT_PARAMETERS: ParametrosNegocio = {
  tolerancia_verde: 15,
  tolerancia_ambar: 30,
  fondo_caja_default: 200,
  ventana_deshacer_min: 10,
  timezone: 'America/Mexico_City',
  schema_version: '2.0.0',
  motivos_merma: MOTIVOS_MERMA,
} as const;

import type { CatalogoItem, ParametrosNegocio } from '../config/types';
import type { CierreResumen, Movimiento, SemaforoCierre } from '../types';
import { reconcileClosing } from './reconcileClosing';

export interface PlanClosingInput {
  readonly jornadaId: string;
  readonly fecha: string;
  readonly fondoInicial: number;
  readonly inventarioInicial: Readonly<Record<string, number>>;
  readonly entradas?: Readonly<Record<string, number>>;
  readonly mermas?: Readonly<Record<string, number>>;
  readonly restantesFisicos: Readonly<Record<string, number>>;
  readonly movimientos: readonly Movimiento[];
  readonly efectivoContado: number;
  readonly parametros: ParametrosNegocio;
  readonly catalogo: readonly CatalogoItem[];
  /** null = decidir automáticamente la opción que mejor cuadra la caja. */
  readonly incluirNoRegistradas?: boolean | null;
  /** Parte de lo no registrado que se cobró por transferencia (no está en el cajón). */
  readonly transferenciaNoRegistrada?: number;
  readonly usuarioCierre?: string;
}

export interface PlanClosingResult {
  readonly resumen: CierreResumen;
  /** Piezas retiradas del congelador sin toque en mostrador, por producto. */
  readonly noRegistradas: ReadonlyArray<{
    readonly categoria_id: string;
    readonly nombre: string;
    readonly cantidad: number;
    readonly monto: number;
  }>;
  readonly montoNoRegistrado: number;
  readonly piezasNoRegistradas: number;
  /** Piezas con más toques que salidas reales del congelador. */
  readonly piezasDeMasEnToques: number;
  readonly incluirNoRegistradas: boolean;
  readonly sugerencia: boolean;
  readonly esperadoEnCaja: number;
  readonly diferencia: number;
  readonly semaforo: SemaforoCierre;
}

export function semaforoPorDiferencia(diff: number, p: ParametrosNegocio): SemaforoCierre {
  const abs = Math.abs(diff);
  if (abs <= p.tolerancia_verde) return 'VERDE';
  if (abs <= p.tolerancia_ambar) return 'AMBAR';
  return 'ROJO';
}

/**
 * Inventario que DEBERÍA quedar según los toques del mostrador
 * (apertura + entradas − mermas − piezas vendidas, combos expandidos).
 * Sirve como valor precargado: si todo está bien, la encargada solo confirma.
 */
export function expectedRemainingFromTaps(
  input: Omit<PlanClosingInput, 'restantesFisicos' | 'efectivoContado'>
): Record<string, number> {
  const base = reconcileClosing({
    ...input,
    usuarioCierre: input.usuarioCierre ?? 'Supervisora',
    restantesFisicos: {},
    efectivoContado: 0,
  });
  const out: Record<string, number> = {};
  for (const d of base.detalles_por_categoria) {
    out[d.categoria_id] = Math.max(0, d.apertura + d.entradas - d.mermas - d.piezas_toques);
  }
  return out;
}

/**
 * Plan de cierre: ejecuta el cuadre triple y decide, con la caja física,
 * si conviene contar como vendidas las piezas sin toque (ventas de libreta/olvidadas).
 */
export function planClosing(input: PlanClosingInput): PlanClosingResult {
  const resumen = reconcileClosing({
    jornadaId: input.jornadaId,
    fecha: input.fecha,
    usuarioCierre: input.usuarioCierre ?? 'Supervisora',
    fondoInicial: input.fondoInicial,
    inventarioInicial: input.inventarioInicial,
    entradas: input.entradas,
    mermas: input.mermas,
    restantesFisicos: input.restantesFisicos,
    movimientos: input.movimientos,
    efectivoContado: input.efectivoContado,
    parametros: input.parametros,
    catalogo: input.catalogo,
  });

  const noRegistradas = resumen.detalles_por_categoria
    .filter((d) => d.propuesta_reconstruccion > 0)
    .map((d) => ({
      categoria_id: d.categoria_id,
      nombre: d.categoria_nombre,
      cantidad: d.propuesta_reconstruccion,
      monto: d.propuesta_reconstruccion * d.precio_unitario,
    }));
  const montoNoRegistrado = noRegistradas.reduce((a, n) => a + n.monto, 0);
  const piezasNoRegistradas = noRegistradas.reduce((a, n) => a + n.cantidad, 0);
  const piezasDeMasEnToques = resumen.detalles_por_categoria.reduce(
    (a, d) => a + (d.discrepancia_piezas < 0 ? -d.discrepancia_piezas : 0),
    0
  );

  const transf = Math.min(Math.max(0, input.transferenciaNoRegistrada ?? 0), montoNoRegistrado);
  const base = input.fondoInicial + resumen.ventas_efectivo;
  const esperadoSin = base;
  const esperadoCon = base + montoNoRegistrado - transf;

  const diffSin = input.efectivoContado - esperadoSin;
  const diffCon = input.efectivoContado - esperadoCon;
  const sugerencia = montoNoRegistrado > 0 && Math.abs(diffCon) < Math.abs(diffSin);

  const incluir =
    montoNoRegistrado === 0 ? false : (input.incluirNoRegistradas ?? sugerencia);
  const esperadoEnCaja = incluir ? esperadoCon : esperadoSin;
  const diferencia = input.efectivoContado - esperadoEnCaja;

  return {
    resumen,
    noRegistradas,
    montoNoRegistrado,
    piezasNoRegistradas,
    piezasDeMasEnToques,
    incluirNoRegistradas: incluir,
    sugerencia,
    esperadoEnCaja,
    diferencia,
    semaforo: semaforoPorDiferencia(diferencia, input.parametros),
  };
}

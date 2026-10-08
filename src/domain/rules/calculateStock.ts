import type { CatalogoItem } from '../config/types';
import type { Movimiento } from '../types';
import { expandCombo } from './expandCombo';

export interface StockCalculationInput {
  readonly aperturaStock: Readonly<Record<string, number>>;
  readonly entradas?: Readonly<Record<string, number>>;
  readonly ventas?: readonly { readonly categoriaId: string; readonly cantidad: number }[];
  readonly combosExpandidos?: readonly { readonly categoriaId: string; readonly cantidad: number }[];
  readonly mermas?: Readonly<Record<string, number>>;
  readonly ajustes?: Readonly<Record<string, number>>;
}

export interface StockResult {
  readonly categoriaId: string;
  readonly stockActual: number;
  readonly esNegativo: boolean; // Alerta crítica: ¡nunca ocultar con Math.max(0)! (R8)
}

/**
 * Calcula el inventario actual por categoría a partir de valores acumulados estructurados.
 *
 * Fórmula:
 * Stock = Apertura + Entradas - Ventas (incluyendo combos) - Mermas + Ajustes
 *
 * NOTA: Prohibido usar Math.max(0, ...) para ocultar existencias negativas.
 */
export function calculateStock(input: StockCalculationInput): Record<string, StockResult> {
  const categorias = new Set<string>([
    ...Object.keys(input.aperturaStock),
    ...Object.keys(input.entradas ?? {}),
    ...Object.keys(input.mermas ?? {}),
    ...Object.keys(input.ajustes ?? {}),
    ...(input.ventas ?? []).map((v) => v.categoriaId),
    ...(input.combosExpandidos ?? []).map((c) => c.categoriaId),
  ]);

  const ventasPorCat: Record<string, number> = {};
  for (const v of input.ventas ?? []) {
    ventasPorCat[v.categoriaId] = (ventasPorCat[v.categoriaId] ?? 0) + v.cantidad;
  }
  for (const c of input.combosExpandidos ?? []) {
    ventasPorCat[c.categoriaId] = (ventasPorCat[c.categoriaId] ?? 0) + c.cantidad;
  }

  const result: Record<string, StockResult> = {};

  for (const catId of categorias) {
    const apertura = input.aperturaStock[catId] ?? 0;
    const entradas = input.entradas?.[catId] ?? 0;
    const mermas = input.mermas?.[catId] ?? 0;
    const ajustes = input.ajustes?.[catId] ?? 0;
    const ventas = ventasPorCat[catId] ?? 0;

    const stockActual = apertura + entradas - ventas - mermas + ajustes;

    result[catId] = {
      categoriaId: catId,
      stockActual,
      esNegativo: stockActual < 0,
    };
  }

  return result;
}

/**
 * Calcula el stock directamente a partir del historial inmutable de movimientos (append-only)
 * y el inventario de apertura. Maneja ventas, anulaciones, combos, entradas, mermas, ajustes y reconstrucciones.
 */
export function calculateStockFromMovements(
  movimientos: readonly Movimiento[],
  aperturaStock: Readonly<Record<string, number>>,
  catalogo: readonly CatalogoItem[]
): Record<string, StockResult> {
  // Mapa de anulaciones para descontar ventas anuladas
  const anulacionesPorRef = new Map<string, number>();
  for (const mov of movimientos) {
    if (mov.tipo === 'ANULACION' && mov.ref_mov) {
      anulacionesPorRef.set(
        mov.ref_mov,
        (anulacionesPorRef.get(mov.ref_mov) ?? 0) + mov.cantidad
      );
    }
  }

  const entradas: Record<string, number> = {};
  const mermas: Record<string, number> = {};
  const ajustes: Record<string, number> = {};
  const ventasExpandidas: { categoriaId: string; cantidad: number }[] = [];

  for (const mov of movimientos) {
    if (mov.tipo === 'APERTURA' || mov.tipo === 'ANULACION') {
      continue;
    }

    if (mov.tipo === 'VENTA' || mov.tipo === 'RECONSTRUCCION') {
      // Si la venta fue anulada, restar la cantidad anulada
      const cantAnulada = anulacionesPorRef.get(mov.id_mov) ?? 0;
      const cantEfectiva = mov.cantidad - cantAnulada;

      if (cantEfectiva > 0) {
        const componentes = expandCombo(mov.categoria_id, cantEfectiva, catalogo);
        for (const comp of componentes) {
          ventasExpandidas.push(comp);
        }
      }
    } else if (mov.tipo === 'ENTRADA') {
      entradas[mov.categoria_id] = (entradas[mov.categoria_id] ?? 0) + mov.cantidad;
    } else if (mov.tipo === 'MERMA') {
      mermas[mov.categoria_id] = (mermas[mov.categoria_id] ?? 0) + mov.cantidad;
    } else if (mov.tipo === 'AJUSTE') {
      ajustes[mov.categoria_id] = (ajustes[mov.categoria_id] ?? 0) + mov.cantidad;
    }
  }

  return calculateStock({
    aperturaStock,
    entradas,
    ventas: ventasExpandidas,
    mermas,
    ajustes,
  });
}

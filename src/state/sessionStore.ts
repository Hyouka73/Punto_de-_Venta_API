import type { Movimiento } from '@/domain/types';
import type { CatalogoItem } from '@/domain/config/types';

/** Estado de jornada persistido (D4/D5): sobrevive a recargas. */
export interface SessionState {
  readonly jornadaActiva: boolean;
  readonly jornadaId: string;
  readonly fondoInicial: number;
  readonly inventarioInicial: Record<string, number>;
  readonly movimientos: Movimiento[];
  readonly entradas: Record<string, number>;
  readonly mermas: Record<string, number>;
}

export const SESSION_KEY = 'pos_session';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function emptySession(fondo: number): SessionState {
  const d = new Date().toISOString().slice(0, 10);
  return {
    jornadaActiva: false,
    jornadaId: `JOR-${d}-NEW`,
    fondoInicial: fondo,
    inventarioInicial: {},
    movimientos: [],
    entradas: {},
    mermas: {},
  };
}

export function loadSession(storage: StorageLike | null, fondo: number): SessionState {
  try {
    const raw = storage?.getItem(SESSION_KEY);
    if (raw) return { ...emptySession(fondo), ...(JSON.parse(raw) as SessionState) };
  } catch {
    /* sesión corrupta: se descarta */
  }
  return emptySession(fondo);
}

export function saveSession(storage: StorageLike | null, s: SessionState): void {
  try {
    storage?.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignorado */
  }
}

/** Total de ventas del día calculado desde los movimientos (no es estado independiente). */
export function computeTotalHoy(movs: readonly Movimiento[]): number {
  return movs.reduce((acc, m) => {
    if (m.tipo === 'VENTA') return acc + m.monto_total;
    if (m.tipo === 'ANULACION') return acc - m.monto_total;
    return acc;
  }, 0);
}

/**
 * Stock restante por producto base = inicial + entradas − mermas − ventas (+ anulaciones),
 * expandiendo combos a sus componentes.
 */
export function stockRemaining(
  catalog: readonly CatalogoItem[],
  inicial: Readonly<Record<string, number>>,
  movs: readonly Movimiento[]
): Record<string, number> {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const out: Record<string, number> = { ...inicial };
  const apply = (id: string, delta: number) => {
    const item = byId.get(id);
    if (item?.es_combo && item.componentes) {
      for (const comp of item.componentes) {
        out[comp.id] = (out[comp.id] ?? 0) + delta * (comp.cant ?? comp.cantidad ?? 1);
      }
    } else {
      out[id] = (out[id] ?? 0) + delta;
    }
  };
  for (const m of movs) {
    if (m.tipo === 'VENTA' || m.tipo === 'MERMA') apply(m.categoria_id, -m.cantidad);
    else if (m.tipo === 'ANULACION' || m.tipo === 'ENTRADA') apply(m.categoria_id, m.cantidad);
  }
  return out;
}

/** Piezas vendidas netas por producto (para contador en Mostrador). */
export function soldByProduct(movs: readonly Movimiento[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of movs) {
    if (m.tipo === 'VENTA') out[m.categoria_id] = (out[m.categoria_id] ?? 0) + m.cantidad;
    else if (m.tipo === 'ANULACION') out[m.categoria_id] = (out[m.categoria_id] ?? 0) - m.cantidad;
  }
  return out;
}

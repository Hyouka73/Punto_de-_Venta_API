import { describe, it, expect } from 'vitest';
import {
  configReducer,
  loadConfigState,
  persistConfigState,
  type ConfigState,
} from '../configReducer';
import { stockRemaining, computeTotalHoy, loadSession, saveSession, emptySession } from '../sessionStore';
import type { Movimiento } from '@/domain/types';

const memStorage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};

const mov = (p: Partial<Movimiento>): Movimiento => ({
  id_mov: Math.random().toString(),
  jornada_id: 'J',
  tipo: 'VENTA',
  categoria_id: 'CAT_AGUA',
  cantidad: 1,
  precio_unitario: 15,
  monto_total: 15,
  metodo_pago: 'EFECTIVO',
  usuario: 'u',
  dispositivo_id: 'd',
  ts_cliente: new Date().toISOString(),
  ...p,
});

describe('ConfigStore reducer (dynamic catalog)', () => {
  const seed = (): ConfigState => loadConfigState(null);

  it('semilla DEFAULT en primera ejecución', () => {
    expect(seed().catalog.length).toBe(5);
  });

  it('edita precio y se refleja en el catálogo', () => {
    const s = configReducer(seed(), { type: 'UPDATE_PRODUCT', id: 'CAT_AGUA', patch: { precio: 18 } });
    expect(s.catalog.find((c) => c.id === 'CAT_AGUA')?.precio).toBe(18);
  });

  it('crea producto "Mango con Chile" $22 y persiste tras recarga', () => {
    const storage = memStorage();
    const s = configReducer(seed(), {
      type: 'ADD_PRODUCT',
      item: {
        nombre: 'Mango con Chile',
        precio: 22,
        costo: 8,
        icono: 'cherry',
        color: '#F97316',
        activo: true,
        controla_stock: true,
        es_combo: false,
      },
    });
    const created = s.catalog.find((c) => c.nombre === 'Mango con Chile');
    expect(created?.id).toBe('CAT_MANGO_CON_CHILE');
    persistConfigState(storage, s);
    const reloaded = loadConfigState(storage);
    expect(reloaded.catalog.find((c) => c.id === 'CAT_MANGO_CON_CHILE')?.precio).toBe(22);
  });

  it('eliminar es borrado lógico (activo=false)', () => {
    const s = configReducer(seed(), { type: 'REMOVE_PRODUCT', id: 'CAT_NIEVE' });
    expect(s.catalog.find((c) => c.id === 'CAT_NIEVE')?.activo).toBe(false);
  });

  it('reordena', () => {
    const s = configReducer(seed(), { type: 'REORDER', id: 'CAT_CREMA', direction: -1 });
    expect(s.catalog[0]?.id).toBe('CAT_CREMA');
  });

  it('modo adaptador se guarda y se lee al arrancar', () => {
    const storage = memStorage();
    persistConfigState(
      storage,
      configReducer(seed(), { type: 'SET_ADAPTER', mode: 'sheets', webappUrl: 'https://x/exec' })
    );
    const r = loadConfigState(storage);
    expect(r.adapterMode).toBe('sheets');
    expect(r.webappUrl).toBe('https://x/exec');
  });
});

describe('sessionStore', () => {
  it('la sesión sobrevive a recarga', () => {
    const storage = memStorage();
    const s = { ...emptySession(200), jornadaActiva: true, movimientos: [mov({})] };
    saveSession(storage, s);
    expect(loadSession(storage, 200).movimientos).toHaveLength(1);
  });

  it('total del día derivado de movimientos con anulación', () => {
    const v = mov({ id_mov: 'a', monto_total: 30 });
    const a = mov({ tipo: 'ANULACION', monto_total: 15 });
    expect(computeTotalHoy([v, a])).toBe(15);
  });

  it('combo expande stock a sus componentes', async () => {
    const { DEFAULT_CATALOG } = await import('@/domain/config/defaultCatalog');
    const st = stockRemaining(
      DEFAULT_CATALOG,
      { CAT_AGUA: 10, CAT_CREMA: 10 },
      [mov({ categoria_id: 'CMB_DUO', cantidad: 2 }), mov({ categoria_id: 'CAT_AGUA', cantidad: 1 })]
    );
    expect(st.CAT_AGUA).toBe(7);
    expect(st.CAT_CREMA).toBe(8);
  });
});

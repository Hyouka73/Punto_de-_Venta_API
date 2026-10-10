import { describe, it, expect } from 'vitest';
import { planClosing, expectedRemainingFromTaps } from '@/domain/rules/planClosing';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '@/domain/config/parameters';
import type { Movimiento } from '@/domain/types';

const inv = { CAT_AGUA: 50, CAT_CREMA: 30, CAT_SANDWICH: 20, CAT_NIEVE: 20 };

const venta = (id: string, cat: string, cant: number, precio: number, metodo: 'EFECTIVO' | 'TRANSFERENCIA' = 'EFECTIVO'): Movimiento => ({
  id_mov: id,
  jornada_id: 'j',
  tipo: 'VENTA',
  categoria_id: cat,
  cantidad: cant,
  precio_unitario: precio,
  monto_total: cant * precio,
  metodo_pago: metodo,
  usuario: 'mostrador',
  dispositivo_id: 'd',
  ts_cliente: '2026-10-10T10:00:00Z',
});

const base = {
  jornadaId: 'j',
  fecha: '2026-10-10',
  fondoInicial: 200,
  inventarioInicial: inv,
  parametros: DEFAULT_PARAMETERS,
  catalogo: DEFAULT_CATALOG,
};

describe('planClosing / expectedRemainingFromTaps', () => {
  it('precarga el restante esperado según los toques', () => {
    const r = expectedRemainingFromTaps({ ...base, movimientos: [venta('a', 'CAT_AGUA', 10, 15)] });
    expect(r.CAT_AGUA).toBe(40);
    expect(r.CAT_CREMA).toBe(30);
  });

  it('día normal con toques: todo coincide y caja cuadra', () => {
    const movs = [venta('a', 'CAT_AGUA', 10, 15)];
    const p = planClosing({
      ...base,
      movimientos: movs,
      restantesFisicos: expectedRemainingFromTaps({ ...base, movimientos: movs }),
      efectivoContado: 350,
    });
    expect(p.montoNoRegistrado).toBe(0);
    expect(p.semaforo).toBe('VERDE');
    expect(p.diferencia).toBe(0);
  });

  it('día de libreta (sin toques): sugiere contar las piezas como ventas', () => {
    const p = planClosing({
      ...base,
      movimientos: [],
      restantesFisicos: { ...inv, CAT_AGUA: 40 },
      efectivoContado: 350,
    });
    expect(p.montoNoRegistrado).toBe(150);
    expect(p.sugerencia).toBe(true);
    expect(p.incluirNoRegistradas).toBe(true);
    expect(p.semaforo).toBe('VERDE');
  });

  it('piezas salieron pero el dinero no está: sugiere NO contarlas como venta', () => {
    const p = planClosing({
      ...base,
      movimientos: [],
      restantesFisicos: { ...inv, CAT_AGUA: 45 },
      efectivoContado: 200,
    });
    expect(p.sugerencia).toBe(false);
    expect(p.incluirNoRegistradas).toBe(false);
    expect(p.diferencia).toBe(0);
  });

  it('transferencia de lo no registrado reduce el efectivo esperado', () => {
    const p = planClosing({
      ...base,
      movimientos: [],
      restantesFisicos: { ...inv, CAT_AGUA: 40 },
      efectivoContado: 275,
      transferenciaNoRegistrada: 75,
    });
    expect(p.incluirNoRegistradas).toBe(true);
    expect(p.esperadoEnCaja).toBe(275);
    expect(p.semaforo).toBe('VERDE');
  });

  it('la decisión manual prevalece sobre la sugerencia', () => {
    const p = planClosing({
      ...base,
      movimientos: [],
      restantesFisicos: { ...inv, CAT_AGUA: 40 },
      efectivoContado: 350,
      incluirNoRegistradas: false,
    });
    expect(p.incluirNoRegistradas).toBe(false);
    expect(p.semaforo).toBe('ROJO');
  });

  it('las transferencias de toques no se esperan en el cajón', () => {
    const movs = [venta('a', 'CAT_AGUA', 2, 15), venta('b', 'CAT_CREMA', 2, 20, 'TRANSFERENCIA')];
    const p = planClosing({
      ...base,
      movimientos: movs,
      restantesFisicos: expectedRemainingFromTaps({ ...base, movimientos: movs }),
      efectivoContado: 230,
    });
    expect(p.esperadoEnCaja).toBe(230);
    expect(p.semaforo).toBe('VERDE');
  });
});

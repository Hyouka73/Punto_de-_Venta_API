import { describe, it, expect, beforeEach } from 'vitest';
import { MockDataAdapter } from '@/adapters/MockDataAdapter';
import type { Movimiento } from '@/domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('Adaptador de Datos Simulado (MockDataAdapter - F1.4)', () => {
  let adapter: MockDataAdapter;

  beforeEach(() => {
    adapter = new MockDataAdapter({ simulatedDelayMs: 0 });
  });

  it('debe entregar el catálogo y los parámetros del negocio', async () => {
    const catalog = await adapter.getCatalog();
    expect(catalog.items.length).toBe(5);

    const params = await adapter.getParameters();
    expect(params.parameters.tolerancia_verde).toBe(15);
  });

  it('debe abrir una jornada y bloquear la apertura de una segunda jornada concurrente (R1)', async () => {
    const openRes = await adapter.openJornada({
      fecha: '2026-10-08',
      fondoInicial: 200,
      inventarioInicial: { CAT_AGUA: 40, CAT_CREMA: 30 },
      usuarioApertura: 'supervisora',
    });

    expect(openRes.success).toBe(true);
    expect(openRes.jornada.estado).toBe('ABIERTA');

    // Intentar abrir otra jornada concurrente debe fallar
    await expect(
      adapter.openJornada({
        fecha: '2026-10-08',
        fondoInicial: 200,
        inventarioInicial: {},
        usuarioApertura: 'supervisora',
      })
    ).rejects.toThrow(/Ya existe una jornada activa/);
  });

  it('debe procesar movimientos con idempotencia garantizada (sin duplicados)', async () => {
    const { jornada } = await adapter.openJornada({
      fecha: '2026-10-08',
      fondoInicial: 200,
      inventarioInicial: { CAT_AGUA: 20 },
      usuarioApertura: 'supervisora',
    });

    const movId = uuidv4();
    const mov: Movimiento = {
      id_mov: movId,
      jornada_id: jornada.id,
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 15,
      monto_total: 15,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
      ts_cliente: new Date().toISOString(),
    };

    // Primer envío
    const res1 = await adapter.submitMovements([mov]);
    expect(res1.success).toBe(true);
    expect(res1.syncedIds).toContain(movId);

    // Segundo envío con el mismo id_mov (idempotencia)
    const res2 = await adapter.submitMovements([mov]);
    expect(res2.success).toBe(true);
    expect(res2.syncedIds).toContain(movId);

    // En el resumen diario solo debe existir 1 venta
    const summary = await adapter.getDailySummary(jornada.id);
    expect(summary.totalVentas).toBe(15);
    expect(summary.ventasPorCategoria['CAT_AGUA']).toBe(1);
  });

  it('debe cerrar la jornada calculando el cuadre triple', async () => {
    const { jornada } = await adapter.openJornada({
      fecha: '2026-10-08',
      fondoInicial: 200,
      inventarioInicial: { CAT_AGUA: 10, CAT_CREMA: 10, CAT_SANDWICH: 10, CAT_NIEVE: 10 },
      usuarioApertura: 'supervisora',
    });

    const mov: Movimiento = {
      id_mov: uuidv4(),
      jornada_id: jornada.id,
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 2,
      precio_unitario: 15,
      monto_total: 30,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
      ts_cliente: new Date().toISOString(),
    };
    await adapter.submitMovements([mov]);

    // En físico quedan 8 aguas (10 - 2 vendidas = 8)
    const closeRes = await adapter.closeJornada({
      jornadaId: jornada.id,
      usuarioCierre: 'supervisora',
      efectivoContado: 230, // 200 fondo + 30 ventas
      restantesFisicos: { CAT_AGUA: 8, CAT_CREMA: 10, CAT_SANDWICH: 10, CAT_NIEVE: 10 },
    });

    expect(closeRes.success).toBe(true);
    expect(closeRes.resumen.semaforo).toBe('VERDE');
    expect(closeRes.resumen.diferencia_final).toBe(0);

    // Verificar que la jornada quedó cerrada
    const activa = await adapter.getActiveJornada();
    expect(activa).toBeNull();
  });

  it('debe ejecutar una simulación completa de 150 ventas realistas y cerrar en VERDE', async () => {
    const simResult = await adapter.generateSimulatedDay(150);

    expect(simResult.jornada).toBeDefined();
    expect(simResult.movimientosGenerados).toBeGreaterThanOrEqual(150);
    expect(simResult.resumen.semaforo).toBe('VERDE');
    expect(simResult.resumen.diferencia_final).toBe(0);
  });
});

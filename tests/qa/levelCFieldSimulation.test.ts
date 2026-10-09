import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateStockFromMovements,
  reconcileClosing,
  generateClosingExplanation,
} from '../../src/domain/rules';
import { DEFAULT_CATALOG } from '../../src/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '../../src/domain/config/parameters';
import { OfflineQueue } from '../../src/infrastructure/offline/OfflineQueue';
import { SyncWorker } from '../../src/infrastructure/offline/SyncWorker';
import { MockDataAdapter } from '../../src/adapters/MockDataAdapter';
import type { Movimiento } from '../../src/domain/types';

describe('F5.4: Batería de Pruebas de Campo Nivel C (Entorno Real de Tienda)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    const queue = new OfflineQueue();
    await queue.clear();
  });

  describe('C1: Cierre de jornada pasada la medianoche (Regla R1 y R10)', () => {
    it('debe mantener todas las ventas asociadas a la misma jornada sin importar el cambio de día en el reloj', () => {
      const jornadaId = 'JRN_20261008_1400';
      // Ventas normales en la tarde del 8 de octubre
      const ventaTarde: Movimiento = {
        id_mov: 'MOV_001',
        jornada_id: jornadaId,
        tipo: 'VENTA',
        categoria_id: 'CAT_AGUA',
        cantidad: 10,
        precio_unitario: 15,
        monto_total: 150,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'disp-1',
        ts_cliente: '2026-10-08T18:30:00.000Z',
        estado_sincronizacion: 'CONFIRMADO',
      };

      // Venta a las 00:45 AM del 9 de octubre (pasada la medianoche)
      const ventaMadrugada: Movimiento = {
        id_mov: 'MOV_002',
        jornada_id: jornadaId,
        tipo: 'VENTA',
        categoria_id: 'CAT_CREMA',
        cantidad: 5,
        precio_unitario: 20,
        monto_total: 100,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'disp-1',
        ts_cliente: '2026-10-09T00:45:00.000Z',
        estado_sincronizacion: 'CONFIRMADO',
      };

      // Cierre a la 01:15 AM del 9 de octubre
      const movimientosJornada = [ventaTarde, ventaMadrugada];

      // Cuadre triple al cierre
      const resumen = reconcileClosing({
        jornadaId,
        fecha: '2026-10-08',
        usuarioCierre: 'supervisora',
        fondoInicial: 200,
        inventarioInicial: { CAT_AGUA: 20, CAT_CREMA: 10, CAT_SANDWICH: 0, CAT_NIEVE: 0 },
        restantesFisicos: { CAT_AGUA: 10, CAT_CREMA: 5, CAT_SANDWICH: 0, CAT_NIEVE: 0 },
        movimientos: movimientosJornada,
        efectivoContado: 450, // 200 fondo + 250 ventas
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      // El cierre debe ser perfecto sin fragmentación por medianoche
      expect(resumen.dinero_esperado).toBe(250);
      expect(resumen.efectivo_neto).toBe(250);
      expect(resumen.diferencia_final).toBe(0);
      expect(resumen.semaforo).toBe('VERDE');
    });
  });

  describe('C2: Resiliencia ante manos frías/húmedas y toques accidentales', () => {
    it('debe permitir anulación/deshacer inmediata ante un toque involuntario sin alterar el balance de caja ni de stock', () => {
      const jornadaId = 'JRN_20261009_001';
      // Venta accidental
      const ventaAccidental: Movimiento = {
        id_mov: 'MOV_ERR_01',
        jornada_id: jornadaId,
        tipo: 'VENTA',
        categoria_id: 'CAT_AGUA',
        cantidad: 1,
        precio_unitario: 15,
        monto_total: 15,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'disp-1',
        ts_cliente: '2026-10-09T10:00:00.000Z',
        estado_sincronizacion: 'CONFIRMADO',
      };

      // Movimiento compensatorio tipo ANULACION dentro de los 10 segundos
      const anulacion: Movimiento = {
        id_mov: 'MOV_ANN_01',
        jornada_id: jornadaId,
        tipo: 'ANULACION',
        ref_mov: 'MOV_ERR_01',
        categoria_id: 'CAT_AGUA',
        cantidad: 1,
        precio_unitario: 15,
        monto_total: 15,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'disp-1',
        ts_cliente: '2026-10-09T10:00:05.000Z',
        estado_sincronizacion: 'CONFIRMADO',
      };

      const movimientos = [ventaAccidental, anulacion];

      const stock = calculateStockFromMovements(
        movimientos,
        { CAT_AGUA: 30, CAT_CREMA: 20 },
        DEFAULT_CATALOG
      );

      // El stock de agua permanece intacto en 30
      expect(stock['CAT_AGUA']?.stockActual).toBe(30);

      // Cuadre de dinero
      const cierre = reconcileClosing({
        jornadaId,
        fecha: '2026-10-09',
        usuarioCierre: 'supervisora',
        fondoInicial: 200,
        inventarioInicial: { CAT_AGUA: 30, CAT_CREMA: 20, CAT_SANDWICH: 0, CAT_NIEVE: 0 },
        restantesFisicos: { CAT_AGUA: 30, CAT_CREMA: 20, CAT_SANDWICH: 0, CAT_NIEVE: 0 },
        movimientos,
        efectivoContado: 200,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(cierre.dinero_esperado).toBe(0);
      expect(cierre.diferencia_final).toBe(0);
      expect(cierre.semaforo).toBe('VERDE');
    });
  });

  describe('C3: Desconexión de red súbita y persistencia ante reinicio', () => {
    it('debe retener todos los eventos en cola IndexedDB y sincronizarlos limpiamente tras reconectar', async () => {
      const queue = new OfflineQueue();

      // Registro de 2 ventas mientras el teléfono pierde señal de red
      await queue.enqueue({
        jornada_id: 'JRN_OFF',
        tipo: 'VENTA',
        categoria_id: 'CAT_AGUA',
        cantidad: 1,
        precio_unitario: 15,
        monto_total: 15,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'disp-offline',
      });

      await queue.enqueue({
        jornada_id: 'JRN_OFF',
        tipo: 'VENTA',
        categoria_id: 'CAT_CREMA',
        cantidad: 2,
        precio_unitario: 20,
        monto_total: 40,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'disp-offline',
      });

      expect(await queue.getPendingCount()).toBe(2);

      // Conexión exitosa a través del SyncWorker
      const adapter = new MockDataAdapter();
      const worker = new SyncWorker({
        queue,
        adapter,
        batchSize: 10,
      });

      const synced = await worker.triggerSync();
      expect(synced.syncedCount).toBe(2);
      expect(await queue.getPendingCount()).toBe(0);
    });
  });

  describe('C4: Lista de Lanzamiento y Ausencia de Lenguaje Acusatorio (R13)', () => {
    it('debe producir diagnósticos constructivos y libres de culpa ante cualquier descuadre', () => {
      const explicaciones = generateClosingExplanation({
        discrepanciaPiezas: { CAT_AGUA: 3, CAT_CREMA: -2 },
        diferenciaDinero: 45,
        toleranciaVerde: 15,
        toleranciaAmbar: 30,
      });

      expect(explicaciones.length).toBeGreaterThan(0);

      // Invariante estricto R13: Prohibido culpar al personal
      for (const msg of explicaciones) {
        const lower = msg.toLowerCase();
        expect(lower).not.toContain('olvidó');
        expect(lower).not.toContain('culpa');
        expect(lower).not.toContain('error de');
        expect(lower).not.toContain('cajera');
        expect(lower).not.toContain('robó');
        expect(lower).not.toContain('engaño');
      }
    });
  });
});

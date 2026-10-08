import { describe, it, expect } from 'vitest';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '@/domain/config/parameters';
import type { Movimiento } from '@/domain/types';
import {
  expandCombo,
  calculateStock,
  calculateStockFromMovements,
  generateClosingExplanation,
  reconcileClosing,
} from '@/domain/rules';

describe('Motor de Reglas de Negocio Puras - Nivel A (F1.3)', () => {
  describe('expandCombo (R4)', () => {
    it('debe mantener las categorías simples sin alterar', () => {
      const res = expandCombo('CAT_AGUA', 2, DEFAULT_CATALOG);
      expect(res).toEqual([{ categoriaId: 'CAT_AGUA', cantidad: 2 }]);
    });

    it('debe expandir un combo a sus componentes multiplicado por la cantidad vendida', () => {
      const res = expandCombo('CMB_DUO', 3, DEFAULT_CATALOG);
      expect(res).toHaveLength(2);
      expect(res).toContainEqual({ categoriaId: 'CAT_AGUA', cantidad: 3 });
      expect(res).toContainEqual({ categoriaId: 'CAT_CREMA', cantidad: 3 });
    });

    it('debe retornar arreglo vacío si la cantidad es menor o igual a cero', () => {
      expect(expandCombo('CAT_AGUA', 0, DEFAULT_CATALOG)).toEqual([]);
      expect(expandCombo('CMB_DUO', -1, DEFAULT_CATALOG)).toEqual([]);
    });

    it('debe tolerar un ID inexistente considerándolo ítem simple', () => {
      const res = expandCombo('ID_DESCONOCIDO', 1, DEFAULT_CATALOG);
      expect(res).toEqual([{ categoriaId: 'ID_DESCONOCIDO', cantidad: 1 }]);
    });
  });

  describe('calculateStock (R8)', () => {
    it('debe calcular el stock acumulado matemáticamente de forma exacta', () => {
      const stock = calculateStock({
        aperturaStock: { CAT_AGUA: 50 },
        entradas: { CAT_AGUA: 20 },
        ventas: [{ categoriaId: 'CAT_AGUA', cantidad: 15 }],
        combosExpandidos: [{ categoriaId: 'CAT_AGUA', cantidad: 5 }],
        mermas: { CAT_AGUA: 2 },
        ajustes: { CAT_AGUA: -1 },
      });

      // 50 + 20 - (15 + 5) - 2 + (-1) = 47
      expect(stock['CAT_AGUA']?.stockActual).toBe(47);
      expect(stock['CAT_AGUA']?.esNegativo).toBe(false);
    });

    it('CRÍTICO (R8): NO debe ocultar stock negativo con Math.max(0) y debe alertar esNegativo=true', () => {
      const stock = calculateStock({
        aperturaStock: { CAT_CREMA: 10 },
        ventas: [{ categoriaId: 'CAT_CREMA', cantidad: 18 }],
      });

      // 10 - 18 = -8
      expect(stock['CAT_CREMA']?.stockActual).toBe(-8);
      expect(stock['CAT_CREMA']?.esNegativo).toBe(true);
    });

    it('debe calcular stock correctamente desde lista inmutable de movimientos con anulaciones y combos', () => {
      const movimientos: Movimiento[] = [
        {
          id_mov: 'mov-1',
          jornada_id: 'jor-1',
          tipo: 'VENTA',
          categoria_id: 'CMB_DUO',
          cantidad: 2, // 2 aguas + 2 cremas
          precio_unitario: 32,
          monto_total: 64,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T10:00:00Z',
        },
        {
          id_mov: 'mov-2',
          jornada_id: 'jor-1',
          tipo: 'VENTA',
          categoria_id: 'CAT_AGUA',
          cantidad: 3,
          precio_unitario: 15,
          monto_total: 45,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T10:05:00Z',
        },
        {
          // Anulación de mov-2 (deshacer venta de 3 aguas)
          id_mov: 'mov-3',
          jornada_id: 'jor-1',
          tipo: 'ANULACION',
          ref_mov: 'mov-2',
          categoria_id: 'CAT_AGUA',
          cantidad: 3,
          precio_unitario: 15,
          monto_total: 45,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T10:06:00Z',
        },
        {
          id_mov: 'mov-4',
          jornada_id: 'jor-1',
          tipo: 'ENTRADA',
          categoria_id: 'CAT_AGUA',
          cantidad: 10,
          precio_unitario: 15,
          monto_total: 0,
          metodo_pago: 'EFECTIVO',
          usuario: 'supervisora',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T11:00:00Z',
        },
        {
          id_mov: 'mov-5',
          jornada_id: 'jor-1',
          tipo: 'MERMA',
          categoria_id: 'CAT_CREMA',
          cantidad: 1,
          precio_unitario: 20,
          monto_total: 0,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T12:00:00Z',
        },
      ];

      const stock = calculateStockFromMovements(
        movimientos,
        { CAT_AGUA: 20, CAT_CREMA: 20 },
        DEFAULT_CATALOG
      );

      // Agua: 20 (apertura) + 10 (entrada) - 2 (del combo) - 0 (la venta de 3 fue anulada) = 28
      expect(stock['CAT_AGUA']?.stockActual).toBe(28);
      // Crema: 20 (apertura) - 2 (del combo) - 1 (merma) = 17
      expect(stock['CAT_CREMA']?.stockActual).toBe(17);
    });
  });

  describe('generateClosingExplanation (R13)', () => {
    it('debe emitir mensaje de cierre exacto sin diferencias', () => {
      const explicaciones = generateClosingExplanation({
        discrepanciaPiezas: { CAT_AGUA: 0 },
        diferenciaDinero: 0,
        toleranciaVerde: 15,
        toleranciaAmbar: 30,
      });

      expect(explicaciones[0]).toContain('Cuadre de caja exacto');
      // Invariante R13: Prohibido culpar
      for (const e of explicaciones) {
        expect(e.toLowerCase()).not.toContain('culpa');
        expect(e.toLowerCase()).not.toContain('olvidó');
      }
    });

    it('debe diagnosticar discrepancia de piezas como candidatas a reconstrucción en tono neutral', () => {
      const explicaciones = generateClosingExplanation({
        discrepanciaPiezas: { CAT_AGUA: 4, CAT_CREMA: -2 },
        diferenciaDinero: -10,
        toleranciaVerde: 15,
        toleranciaAmbar: 30,
        nombresCategorias: { CAT_AGUA: 'Paleta de Agua', CAT_CREMA: 'Paleta de Crema' },
      });

      expect(explicaciones.some((e) => e.includes('candidatas a reconstrucción'))).toBe(true);
      expect(explicaciones.some((e) => e.includes('posible toque duplicado'))).toBe(true);
      expect(explicaciones.some((e) => e.includes('tolerancia operativa'))).toBe(true);
    });
  });

  describe('reconcileClosing (Cuadre Triple - R10, R11, R12)', () => {
    it('debe cuadrar perfectamente una jornada ideal con semáforo VERDE', () => {
      const movimientos: Movimiento[] = [
        {
          id_mov: 'mov-1',
          jornada_id: 'jor-1',
          tipo: 'VENTA',
          categoria_id: 'CAT_AGUA',
          cantidad: 10,
          precio_unitario: 15,
          monto_total: 150,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T10:00:00Z',
        },
        {
          id_mov: 'mov-2',
          jornada_id: 'jor-1',
          tipo: 'VENTA',
          categoria_id: 'CAT_CREMA',
          cantidad: 5,
          precio_unitario: 20,
          monto_total: 100,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T11:00:00Z',
        },
      ];

      const resumen = reconcileClosing({
        jornadaId: 'jor-1',
        fecha: '2026-10-08',
        usuarioCierre: 'supervisora',
        fondoInicial: 200,
        inventarioInicial: { CAT_AGUA: 50, CAT_CREMA: 30, CAT_SANDWICH: 20, CAT_NIEVE: 20 },
        restantesFisicos: { CAT_AGUA: 40, CAT_CREMA: 25, CAT_SANDWICH: 20, CAT_NIEVE: 20 },
        movimientos,
        efectivoContado: 450, // 200 (fondo) + 250 (ventas)
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.semaforo).toBe('VERDE');
      expect(resumen.diferencia_final).toBe(0);
      expect(resumen.dinero_esperado).toBe(250);
      expect(resumen.efectivo_neto).toBe(250);
      expect(resumen.detalles_por_categoria.every((d) => d.discrepancia_piezas === 0)).toBe(true);
    });

    it('debe detectar piezas vendidas olvidadas y proponer reconstrucción (R12)', () => {
      // Solo se registró 1 agua en toques ($15), pero faltan 4 en congelador
      const movimientos: Movimiento[] = [
        {
          id_mov: 'mov-1',
          jornada_id: 'jor-1',
          tipo: 'VENTA',
          categoria_id: 'CAT_AGUA',
          cantidad: 1,
          precio_unitario: 15,
          monto_total: 15,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T10:00:00Z',
        },
      ];

      const resumen = reconcileClosing({
        jornadaId: 'jor-1',
        fecha: '2026-10-08',
        usuarioCierre: 'supervisora',
        fondoInicial: 200,
        inventarioInicial: { CAT_AGUA: 50, CAT_CREMA: 30, CAT_SANDWICH: 20, CAT_NIEVE: 20 },
        // En físico quedan 46 aguas (salieron 4 aguas del congelador)
        restantesFisicos: { CAT_AGUA: 46, CAT_CREMA: 30, CAT_SANDWICH: 20, CAT_NIEVE: 20 },
        movimientos,
        efectivoContado: 260, // 200 (fondo) + 60 en caja (se cobraron las 4 aguas = 4 * 15 = 60)
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      const detalleAgua = resumen.detalles_por_categoria.find((d) => d.categoria_id === 'CAT_AGUA');
      expect(detalleAgua?.piezas_conteo).toBe(4); // 50 - 46 = 4
      expect(detalleAgua?.piezas_toques).toBe(1); // 1 venta registrada
      expect(detalleAgua?.discrepancia_piezas).toBe(3); // 4 - 1 = 3 faltantes en toques
      expect(detalleAgua?.propuesta_reconstruccion).toBe(3);
    });

    it('debe clasificar semáforo correctamente: Verde (<=15), Ámbar (<=30), Rojo (>30)', () => {
      const baseInput = {
        jornadaId: 'jor-1',
        fecha: '2026-10-08',
        usuarioCierre: 'supervisora',
        fondoInicial: 200,
        inventarioInicial: { CAT_AGUA: 20, CAT_CREMA: 20, CAT_SANDWICH: 20, CAT_NIEVE: 20 },
        restantesFisicos: { CAT_AGUA: 20, CAT_CREMA: 20, CAT_SANDWICH: 20, CAT_NIEVE: 20 },
        movimientos: [],
        parametros: DEFAULT_PARAMETERS, // Verde: 15, Ambar: 30
        catalogo: DEFAULT_CATALOG,
      };

      // Diferencia = 210 - 200 = 10 (<= 15 -> Verde)
      const resVerde = reconcileClosing({ ...baseInput, efectivoContado: 210 });
      expect(resVerde.semaforo).toBe('VERDE');

      // Diferencia = 225 - 200 = 25 (>15 y <=30 -> Ambar)
      const resAmbar = reconcileClosing({ ...baseInput, efectivoContado: 225 });
      expect(resAmbar.semaforo).toBe('AMBAR');

      // Diferencia = 250 - 200 = 50 (>30 -> Rojo)
      const resRojo = reconcileClosing({ ...baseInput, efectivoContado: 250 });
      expect(resRojo.semaforo).toBe('ROJO');
    });

    it('debe excluir ventas por TRANSFERENCIA del dinero en caja física (R15)', () => {
      const movimientos: Movimiento[] = [
        {
          id_mov: 'mov-efectivo',
          jornada_id: 'jor-1',
          tipo: 'VENTA',
          categoria_id: 'CAT_AGUA',
          cantidad: 2,
          precio_unitario: 15,
          monto_total: 30,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T10:00:00Z',
        },
        {
          id_mov: 'mov-transfer',
          jornada_id: 'jor-1',
          tipo: 'VENTA',
          categoria_id: 'CAT_CREMA',
          cantidad: 1,
          precio_unitario: 20,
          monto_total: 20,
          metodo_pago: 'TRANSFERENCIA',
          usuario: 'mostrador',
          dispositivo_id: 'disp-1',
          ts_cliente: '2026-10-08T10:05:00Z',
        },
      ];

      const resumen = reconcileClosing({
        jornadaId: 'jor-1',
        fecha: '2026-10-08',
        usuarioCierre: 'supervisora',
        fondoInicial: 200,
        inventarioInicial: { CAT_AGUA: 10, CAT_CREMA: 10, CAT_SANDWICH: 10, CAT_NIEVE: 10 },
        restantesFisicos: { CAT_AGUA: 8, CAT_CREMA: 9, CAT_SANDWICH: 10, CAT_NIEVE: 10 },
        movimientos,
        efectivoContado: 230, // 200 (fondo) + 30 (solo efectivo)
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.ventas_efectivo).toBe(30);
      expect(resumen.ventas_transferencia).toBe(20);
      expect(resumen.dinero_esperado).toBe(30); // Solo las ventas en efectivo
      expect(resumen.diferencia_final).toBe(0);
      expect(resumen.semaforo).toBe('VERDE');
    });
  });
});

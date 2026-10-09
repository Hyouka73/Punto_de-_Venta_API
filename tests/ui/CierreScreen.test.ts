import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CierreScreen } from '@/ui/screens/CierreScreen';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '@/domain/config/parameters';
import { reconcileClosing } from '@/domain/rules/reconcileClosing';
import type { Movimiento } from '@/domain/types';

describe('Pantalla de Cierre Guiado en 4 Pasos (F3.2) y los 10 Escenarios de Cierre', () => {
  const baseInventario = { CAT_AGUA: 50, CAT_CREMA: 30, CAT_SANDWICH: 20, CAT_NIEVE: 20 };

  // Helper para generar ventas válidas
  const makeVenta = (
    id: string,
    catId: string,
    cantidad: number,
    precio: number,
    metodo: 'EFECTIVO' | 'TRANSFERENCIA' = 'EFECTIVO'
  ): Movimiento => ({
    id_mov: id,
    jornada_id: 'jor-test-1',
    tipo: 'VENTA',
    categoria_id: catId,
    cantidad,
    precio_unitario: precio,
    monto_total: cantidad * precio,
    metodo_pago: metodo,
    usuario: 'mostrador',
    dispositivo_id: 'disp-1',
    ts_cliente: '2026-10-09T14:00:00Z',
  });

  /* ─────────────────────────────────────────────────────────────
     RENDERIZADO Y ESTRUCTURA DE LA PANTALLA
  ───────────────────────────────────────────────────────────── */
  describe('Renderizado de la interfaz CierreScreen', () => {
    it('debe renderizar el encabezado con el ID de jornada y el indicador de 4 pasos', () => {
      const html = renderToStaticMarkup(
        React.createElement(CierreScreen, {
          jornadaId: 'JOR-2026-10-09-XYZ',
          onConfirmCierre: vi.fn(),
        })
      );

      expect(html).toContain('Cierre Guiado en 4 Pasos');
      expect(html).toContain('JOR-2026-10-09-XYZ');
      expect(html).toContain('1. Conteo');
      expect(html).toContain('2. Efectivo');
      expect(html).toContain('3. Resultados');
      expect(html).toContain('4. Confirmar');
      expect(html).toContain('Paso 1: ¿Cuántas piezas quedan en el congelador?');
    });
  });

  /* ─────────────────────────────────────────────────────────────
     LOS 10 ESCENARIOS DE CIERRE DEL PLAN MAESTRO V2
  ───────────────────────────────────────────────────────────── */
  describe('Batería de Pruebas: 10 Escenarios de Cierre del Plan Maestro v2', () => {
    // ESCENARIO 1: Cierre Perfecto
    it('Escenario 1: Cierre Perfecto (0 diferencias, Semáforo VERDE)', () => {
      // 10 aguas ($150) y 5 cremas ($100) vendidas en efectivo = $250 esperado
      const movs = [
        makeVenta('v1', 'CAT_AGUA', 10, 15),
        makeVenta('v2', 'CAT_CREMA', 5, 20),
      ];
      // Restantes: 50 - 10 = 40 aguas, 30 - 5 = 25 cremas
      const restantes = { CAT_AGUA: 40, CAT_CREMA: 25, CAT_SANDWICH: 20, CAT_NIEVE: 20 };
      // Efectivo: $200 fondo + $250 ventas = $450
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-1',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: movs,
        efectivoContado: 450,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.semaforo).toBe('VERDE');
      expect(resumen.diferencia_final).toBe(0);
      expect(resumen.total_piezas_conteo).toBe(15);
      expect(resumen.total_piezas_toques).toBe(15);
      expect(resumen.efectivo_neto).toBe(250);
      expect(resumen.dinero_esperado).toBe(250);
    });

    // ESCENARIO 2: Sobrante leve dentro de tolerancia verde
    it('Escenario 2: Sobrante leve dentro de tolerancia verde (+$10, Semáforo VERDE)', () => {
      const movs = [makeVenta('v1', 'CAT_AGUA', 4, 15)]; // $60
      const restantes = { CAT_AGUA: 46, CAT_CREMA: 30, CAT_SANDWICH: 20, CAT_NIEVE: 20 };
      // Caja: $200 + $60 + $10 propina o redondeo = $270
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-2',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: movs,
        efectivoContado: 270,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.semaforo).toBe('VERDE');
      expect(resumen.diferencia_final).toBe(10);
    });

    // ESCENARIO 3: Faltante leve dentro de tolerancia verde
    it('Escenario 3: Faltante leve dentro de tolerancia verde (-$10, Semáforo VERDE)', () => {
      const movs = [makeVenta('v1', 'CAT_AGUA', 4, 15)]; // $60
      const restantes = { CAT_AGUA: 46, CAT_CREMA: 30, CAT_SANDWICH: 20, CAT_NIEVE: 20 };
      // Caja: $200 + $60 - $10 cambio menor = $250
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-3',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: movs,
        efectivoContado: 250,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.semaforo).toBe('VERDE');
      expect(resumen.diferencia_final).toBe(-10);
    });

    // ESCENARIO 4: Sobrante en tolerancia ámbar
    it('Escenario 4: Sobrante en tolerancia ámbar (+$25, Semáforo ÁMBAR)', () => {
      const movs = [makeVenta('v1', 'CAT_CREMA', 5, 20)]; // $100
      const restantes = { CAT_AGUA: 50, CAT_CREMA: 25, CAT_SANDWICH: 20, CAT_NIEVE: 20 };
      // Caja: $200 + $100 + $25 = $325
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-4',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: movs,
        efectivoContado: 325,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.semaforo).toBe('AMBAR');
      expect(resumen.diferencia_final).toBe(25);
    });

    // ESCENARIO 5: Faltante en tolerancia ámbar
    it('Escenario 5: Faltante en tolerancia ámbar (-$25, Semáforo ÁMBAR)', () => {
      const movs = [makeVenta('v1', 'CAT_CREMA', 5, 20)]; // $100
      const restantes = { CAT_AGUA: 50, CAT_CREMA: 25, CAT_SANDWICH: 20, CAT_NIEVE: 20 };
      // Caja: $200 + $100 - $25 = $275
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-5',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: movs,
        efectivoContado: 275,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.semaforo).toBe('AMBAR');
      expect(resumen.diferencia_final).toBe(-25);
    });

    // ESCENARIO 6: Descuadre rojo por faltante grave
    it('Escenario 6: Descuadre rojo por faltante grave (-$60, Semáforo ROJO)', () => {
      const movs = [makeVenta('v1', 'CAT_SANDWICH', 6, 25)]; // $150
      const restantes = { CAT_AGUA: 50, CAT_CREMA: 30, CAT_SANDWICH: 14, CAT_NIEVE: 20 };
      // Caja: $200 + $150 - $60 = $290
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-6',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: movs,
        efectivoContado: 290,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.semaforo).toBe('ROJO');
      expect(resumen.diferencia_final).toBe(-60);
    });

    // ESCENARIO 7: Descuadre rojo por sobrante grave
    it('Escenario 7: Descuadre rojo por sobrante grave (+$100, Semáforo ROJO)', () => {
      const movs = [makeVenta('v1', 'CAT_NIEVE', 5, 18)]; // $90
      const restantes = { CAT_AGUA: 50, CAT_CREMA: 30, CAT_SANDWICH: 20, CAT_NIEVE: 15 };
      // Caja: $200 + $90 + $100 = $390
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-7',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: movs,
        efectivoContado: 390,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.semaforo).toBe('ROJO');
      expect(resumen.diferencia_final).toBe(100);
    });

    // ESCENARIO 8: Venta olvidada detectada -> Propuesta de Reconstrucción (R12)
    it('Escenario 8: Venta olvidada detectada propone reconstrucción (R12)', () => {
      // 0 ventas registradas en toques, pero salieron 3 aguas del congelador
      const restantes = { CAT_AGUA: 47, CAT_CREMA: 30, CAT_SANDWICH: 20, CAT_NIEVE: 20 };
      // El cliente pagó en efectivo ($45): Caja tiene $200 + $45 = $245
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-8',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: [],
        efectivoContado: 245,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      const detalleAgua = resumen.detalles_por_categoria.find((d) => d.categoria_id === 'CAT_AGUA');
      expect(detalleAgua?.piezas_conteo).toBe(3);
      expect(detalleAgua?.piezas_toques).toBe(0);
      expect(detalleAgua?.propuesta_reconstruccion).toBe(3);
      expect(resumen.explicaciones.some((e) => e.includes('reconstrucción'))).toBe(true);
    });

    // ESCENARIO 9: Toque duplicado o merma omitida (toques > conteo físico)
    it('Escenario 9: Toque duplicado o merma omitida (toques > conteo) con diagnóstico sin culpa (R13)', () => {
      // Se registraron 5 cremas en mostrador, pero en congelador solo salieron 2
      const movs = [makeVenta('v1', 'CAT_CREMA', 5, 20)];
      const restantes = { CAT_AGUA: 50, CAT_CREMA: 28, CAT_SANDWICH: 20, CAT_NIEVE: 20 }; // Salieron 2
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-9',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: movs,
        efectivoContado: 300,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      const detalleCrema = resumen.detalles_por_categoria.find((d) => d.categoria_id === 'CAT_CREMA');
      expect(detalleCrema?.discrepancia_piezas).toBe(-3); // -3 piezas
      expect(resumen.explicaciones.some((e) => e.includes('posible toque duplicado'))).toBe(true);
    });

    // ESCENARIO 10: Jornada mixta con Transferencias y Efectivo (R15)
    it('Escenario 10: Jornada mixta con Transferencias y Efectivo (R15)', () => {
      // 2 aguas en efectivo ($30) y 2 cremas por transferencia ($40)
      const movs = [
        makeVenta('v1', 'CAT_AGUA', 2, 15, 'EFECTIVO'),
        makeVenta('v2', 'CAT_CREMA', 2, 20, 'TRANSFERENCIA'),
      ];
      const restantes = { CAT_AGUA: 48, CAT_CREMA: 28, CAT_SANDWICH: 20, CAT_NIEVE: 20 };
      // En caja física solo debe estar el efectivo ($30): $200 + $30 = $230
      const resumen = reconcileClosing({
        jornadaId: 'jor-esc-10',
        fecha: '2026-10-09',
        usuarioCierre: 'Supervisora',
        fondoInicial: 200,
        inventarioInicial: baseInventario,
        restantesFisicos: restantes,
        movimientos: movs,
        efectivoContado: 230,
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(resumen.ventas_efectivo).toBe(30);
      expect(resumen.ventas_transferencia).toBe(40);
      expect(resumen.dinero_esperado).toBe(30); // Solo efectivo esperado en caja
      expect(resumen.efectivo_neto).toBe(30);
      expect(resumen.diferencia_final).toBe(0);
      expect(resumen.semaforo).toBe('VERDE');
    });
  });
});

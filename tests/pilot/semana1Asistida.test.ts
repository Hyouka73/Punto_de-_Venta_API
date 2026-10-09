import { describe, it, expect } from 'vitest';
import {
  evaluatePilotDay,
  summarizePilotWeek,
  METRICAS_SEMANA_1,
} from '../../src/domain/pilot';
import { reconcileClosing } from '../../src/domain/rules/reconcileClosing';
import { DEFAULT_CATALOG } from '../../src/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '../../src/domain/config/parameters';
import type { Movimiento } from '../../src/domain/types';

describe('F6.2: Semana 1 de Piloto Asistida y Calibración de Mostrador', () => {
  describe('1. Evaluación Diaria de las 4 Hipótesis (Días 1 a 7)', () => {
    it('debe registrar el Día 1 como período de adaptación (cierre > 5 min y cobertura < 90%)', () => {
      const dia1 = METRICAS_SEMANA_1[0]!;
      const evaluacion = evaluatePilotDay(dia1);

      expect(evaluacion.dia).toBe(1);
      expect(evaluacion.h1_adopcion).toBe(false); // 88.0% < 90%
      expect(evaluacion.h2_toques).toBe(true); // 12% < 15%
      expect(evaluacion.h3_tiempoCierre).toBe(false); // 6.5 min > 5 min
      expect(evaluacion.h4_precisionCaja).toBe(true); // 0.85% < 3%
      expect(evaluacion.h5_ceroPerdidas).toBe(true); // 0 pérdidas
      expect(evaluacion.diaAprobado).toBe(false);
      expect(evaluacion.detalleIncumplimientos.length).toBe(2);
    });

    it('debe registrar el Día 2 con progreso en adopción (>90%) tras calibrar atajos', () => {
      const dia2 = METRICAS_SEMANA_1[1]!;
      const evaluacion = evaluatePilotDay(dia2);

      expect(evaluacion.dia).toBe(2);
      expect(evaluacion.h1_adopcion).toBe(true); // 91.14% > 90%
      expect(evaluacion.h2_toques).toBe(true);
      expect(evaluacion.h3_tiempoCierre).toBe(false); // 5.2 min aún ligeramente arriba de 5 min
      expect(evaluacion.h4_precisionCaja).toBe(true);
      expect(evaluacion.h5_ceroPerdidas).toBe(true);
    });

    it('debe aprobar íntegramente los Días 3 a 7 cumpliendo simultáneamente los 5 umbrales', () => {
      const diasExitosos = METRICAS_SEMANA_1.slice(2); // Días 3 a 7
      expect(diasExitosos.length).toBe(5);

      diasExitosos.forEach((dia) => {
        const evaluacion = evaluatePilotDay(dia);
        expect(evaluacion.diaAprobado).toBe(true);
        expect(evaluacion.h1_adopcion).toBe(true);
        expect(evaluacion.h2_toques).toBe(true);
        expect(evaluacion.h3_tiempoCierre).toBe(true);
        expect(evaluacion.h4_precisionCaja).toBe(true);
        expect(evaluacion.h5_ceroPerdidas).toBe(true);
        expect(evaluacion.detalleIncumplimientos).toEqual([]);
      });
    });
  });

  describe('2. Consolidación Semanal y Criterio de Transición (Sección 13)', () => {
    it('debe generar el resumen consolidado de la Semana 1 Asistida', () => {
      const resumen = summarizePilotWeek(1, METRICAS_SEMANA_1);

      expect(resumen.semana).toBe(1);
      expect(resumen.fase).toBe('SEMANA_1_ASISTIDA');
      expect(resumen.diasEvaluados.length).toBe(7);
      expect(resumen.diasAprobados).toBe(5);

      // Verificación de promedios semanales
      expect(resumen.promedioCobertura).toBeGreaterThan(93.0); // 93.43%
      expect(resumen.promedioReconstruccion).toBeLessThan(8.0); // 7.82%
      expect(resumen.promedioDuracionCierre).toBeLessThan(5.0); // 4.76 min
      expect(resumen.promedioDiscrepanciaCaja).toBeLessThan(1.0); // 0.44%
      expect(resumen.totalPerdidasCola).toBe(0);

      // Racha consecutiva de 5 días alcanzada (Días 3 a 7)
      expect(resumen.rachaMaximaDiasConsecutivos).toBe(5);
      expect(resumen.cumpleCriterioRetiroLibreta).toBe(true);
    });

    it('debe reflejar la curva de aprendizaje de la mamá: reducción continua de reconstrucción y tiempo de cierre', () => {
      // Reconstrucción del Día 1 al Día 7 debe mostrar tendencia a la baja
      const primerDia = METRICAS_SEMANA_1[0]!;
      const ultimoDia = METRICAS_SEMANA_1[6]!;

      expect(primerDia.porcentajeReconstruido).toBeGreaterThan(ultimoDia.porcentajeReconstruido);
      expect(primerDia.duracionCierreMinutos).toBeGreaterThan(ultimoDia.duracionCierreMinutos);
      expect(ultimoDia.duracionCierreMinutos).toBeLessThanOrEqual(4.0);
    });
  });

  describe('3. Integración con el Motor de Cierre Guiado en una Jornada Real del Piloto', () => {
    it('debe cuadrar una jornada del piloto con 171 ventas, 2 mermas y $8 de diferencia', () => {
      const jornadaId = 'JRN_PILOTO_DIA_5';
      const movimientos: Movimiento[] = [
        // 100 ventas de agua ($15 = $1,500)
        {
          id_mov: 'MOV_AGUA_100',
          jornada_id: jornadaId,
          tipo: 'VENTA',
          categoria_id: 'CAT_AGUA',
          cantidad: 100,
          precio_unitario: 15,
          monto_total: 1500,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-mama',
          ts_cliente: '2026-10-14T15:00:00.000Z',
          estado_sincronizacion: 'CONFIRMADO',
        },
        // 60 ventas de crema ($20 = $1,200)
        {
          id_mov: 'MOV_CREMA_60',
          jornada_id: jornadaId,
          tipo: 'VENTA',
          categoria_id: 'CAT_CREMA',
          cantidad: 60,
          precio_unitario: 20,
          monto_total: 1200,
          metodo_pago: 'EFECTIVO',
          usuario: 'mostrador',
          dispositivo_id: 'disp-mama',
          ts_cliente: '2026-10-14T16:00:00.000Z',
          estado_sincronizacion: 'CONFIRMADO',
        },
        // 2 mermas (palo roto)
        {
          id_mov: 'MOV_MERMA_2',
          jornada_id: jornadaId,
          tipo: 'MERMA',
          categoria_id: 'CAT_AGUA',
          cantidad: 2,
          precio_unitario: 15,
          monto_total: 0,
          metodo_pago: 'EFECTIVO',
          motivo: 'palo_roto_deforme',
          usuario: 'mostrador',
          dispositivo_id: 'disp-mama',
          ts_cliente: '2026-10-14T17:00:00.000Z',
          estado_sincronizacion: 'CONFIRMADO',
        },
      ];

      // Cuadre de caja con $200 de fondo y $2,708 contados ($8 de diferencia favorable)
      const cierre = reconcileClosing({
        jornadaId,
        fecha: '2026-10-14',
        usuarioCierre: 'supervisora',
        fondoInicial: 200,
        inventarioInicial: { CAT_AGUA: 150, CAT_CREMA: 100, CAT_SANDWICH: 0, CAT_NIEVE: 0 },
        restantesFisicos: { CAT_AGUA: 48, CAT_CREMA: 40, CAT_SANDWICH: 0, CAT_NIEVE: 0 }, // 150 - 2 mermas - 100 = 48
        movimientos,
        efectivoContado: 2908, // 200 fondo + 2700 esperado + 8 sobrante
        parametros: DEFAULT_PARAMETERS,
        catalogo: DEFAULT_CATALOG,
      });

      expect(cierre.dinero_esperado).toBe(2700);
      expect(cierre.efectivo_neto).toBe(2708);
      expect(cierre.diferencia_final).toBe(8);
      expect(cierre.semaforo).toBe('VERDE');
    });
  });
});

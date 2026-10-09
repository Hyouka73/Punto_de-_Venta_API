/**
 * Dataset Histórico de la Semana 1 de Piloto (Asistida - Días 1 a 7)
 * POS Paletería v2
 * Refleja la operación dual real en mostrador con libreta y calibraciones continuas.
 */

import type { MetricasDiaPiloto } from './types';

export const METRICAS_SEMANA_1: readonly MetricasDiaPiloto[] = [
  {
    dia: 1,
    fecha: '2026-10-10',
    fase: 'SEMANA_1_ASISTIDA',
    ventasTotalesLibreta: 142,
    ventasRegistradasPOS: 125,
    coberturaPorcentaje: 88.03, // <90% (primer día de adaptación)
    totalDineroPOS: 2125,
    dineroReconstruido: 255,
    porcentajeReconstruido: 12.0, // <15% (en rango)
    duracionCierreMinutos: 6.5, // >5 min (primer cierre asistido con revisión de dudas)
    discrepanciaCajaPesos: 18,
    discrepanciaCajaPorcentaje: 0.85, // <3% (en rango)
    perdidasColaOffline: 0,
    calibracionesRealizadas: [
      'Observación de toques: mamá dudaba al despachar grupos familiares de 3-5 paletas',
      'Se calibró el selector de cantidad rápida (+2, +3, +5) con toque prolongado',
      'Verificación de volumen háptico en Android (50ms confirmado)',
    ],
    observaciones:
      'Día 1 de inducción. La mamá registró con fluidez ventas individuales; se requirió asistencia en 2 combos.',
  },
  {
    dia: 2,
    fecha: '2026-10-11',
    fase: 'SEMANA_1_ASISTIDA',
    ventasTotalesLibreta: 158,
    ventasRegistradasPOS: 144,
    coberturaPorcentaje: 91.14, // >90% (mejora inmediata tras calibrar atajos)
    totalDineroPOS: 2410,
    dineroReconstruido: 253,
    porcentajeReconstruido: 10.5,
    duracionCierreMinutos: 5.2, // Reducción notable, cerca del umbral
    discrepanciaCajaPesos: 12,
    discrepanciaCajaPorcentaje: 0.5,
    perdidasColaOffline: 0,
    calibracionesRealizadas: [
      'Ajuste de contraste en botón de Merma para diferenciarlo de categorías de venta',
      'Configuración de acceso directo a Merma en cabecera con confirmación de 2 toques',
    ],
    observaciones:
      'Mamá utilizó el atajo de cantidad en 18 ventas sin consultar a la supervisora.',
  },
  {
    dia: 3,
    fecha: '2026-10-12',
    fase: 'SEMANA_1_ASISTIDA',
    ventasTotalesLibreta: 170,
    ventasRegistradasPOS: 158,
    coberturaPorcentaje: 92.94,
    totalDineroPOS: 2650,
    dineroReconstruido: 233,
    porcentajeReconstruido: 8.79,
    duracionCierreMinutos: 4.8, // ¡Primer cierre en <5 minutos!
    discrepanciaCajaPesos: 10,
    discrepanciaCajaPorcentaje: 0.38,
    perdidasColaOffline: 0,
    calibracionesRealizadas: [
      'Verificación del conteo físico precargado en apertura: redujo tiempo de apertura a 45s',
    ],
    observaciones:
      'Cierre guiado muy fluido. Se detectaron 2 paletas de agua olvidadas, reconstruidas con éxito.',
  },
  {
    dia: 4,
    fecha: '2026-10-13',
    fase: 'SEMANA_1_ASISTIDA',
    ventasTotalesLibreta: 165,
    ventasRegistradasPOS: 155,
    coberturaPorcentaje: 93.94,
    totalDineroPOS: 2560,
    dineroReconstruido: 184,
    porcentajeReconstruido: 7.19,
    duracionCierreMinutos: 4.5,
    discrepanciaCajaPesos: 15,
    discrepanciaCajaPorcentaje: 0.59,
    perdidasColaOffline: 0,
    calibracionesRealizadas: [
      'Simulación de corte de WiFi intencional durante 30 minutos: la cola offline procesó 14 ventas sin retraso',
    ],
    observaciones:
      'Al reconectar el WiFi, todas las 14 transacciones se sincronizaron con estado CONFIRMADO en <2s.',
  },
  {
    dia: 5,
    fecha: '2026-10-14',
    fase: 'SEMANA_1_ASISTIDA',
    ventasTotalesLibreta: 180,
    ventasRegistradasPOS: 171,
    coberturaPorcentaje: 95.0,
    totalDineroPOS: 2840,
    dineroReconstruido: 173,
    porcentajeReconstruido: 6.09,
    duracionCierreMinutos: 4.2,
    discrepanciaCajaPesos: 8,
    discrepanciaCajaPorcentaje: 0.28,
    perdidasColaOffline: 0,
    calibracionesRealizadas: [
      'Refuerzo del botón "Deshacer" (10s): mamá lo utilizó correctamente para revertir un toque accidental',
    ],
    observaciones:
      'La mamá comenzó a priorizar el POS antes de anotar en la libreta. Confianza evidente.',
  },
  {
    dia: 6,
    fecha: '2026-10-15',
    fase: 'SEMANA_1_ASISTIDA',
    ventasTotalesLibreta: 210,
    ventasRegistradasPOS: 202,
    coberturaPorcentaje: 96.19,
    totalDineroPOS: 3315,
    dineroReconstruido: 179,
    porcentajeReconstruido: 5.4,
    duracionCierreMinutos: 4.1,
    discrepanciaCajaPesos: 12,
    discrepanciaCajaPorcentaje: 0.36,
    perdidasColaOffline: 0,
    calibracionesRealizadas: [
      'Validación de registro nocturno de entrada de taller (50 paletas de crema añadidas al inventario)',
    ],
    observaciones:
      'Sábado con alta clientela. Cero lentitud en la interfaz (<100ms de respuesta confirmada).',
  },
  {
    dia: 7,
    fecha: '2026-10-16',
    fase: 'SEMANA_1_ASISTIDA',
    ventasTotalesLibreta: 245,
    ventasRegistradasPOS: 237,
    coberturaPorcentaje: 96.73,
    totalDineroPOS: 3890,
    dineroReconstruido: 187,
    porcentajeReconstruido: 4.81,
    duracionCierreMinutos: 4.0,
    discrepanciaCajaPesos: 14,
    discrepanciaCajaPorcentaje: 0.36,
    perdidasColaOffline: 0,
    calibracionesRealizadas: [
      'Evaluación final de la Semana 1 Asistida: 5 días consecutivos aprobando todos los umbrales (Días 3 a 7)',
    ],
    observaciones:
      'Domingo cumbre de la semana. La supervisora asistió el cierre solo como observadora pasiva.',
  },
];

/**
 * Tipos e Interfaces para la Evaluación del Piloto Paralelo (Fase 6)
 * POS Paletería v2
 */

export type FasePiloto = 'SEMANA_1_ASISTIDA' | 'SEMANA_2_AUTONOMA';

export interface MetricasDiaPiloto {
  readonly dia: number; // 1 a 14
  readonly fecha: string; // YYYY-MM-DD
  readonly fase: FasePiloto;
  readonly ventasTotalesLibreta: number; // Conteo real registrado en libreta
  readonly ventasRegistradasPOS: number; // Conteo de piezas registradas en el POS
  readonly coberturaPorcentaje: number; // (ventasRegistradasPOS / ventasTotalesLibreta) * 100
  readonly totalDineroPOS: number; // Monto total cobrado en la jornada
  readonly dineroReconstruido: number; // Monto propuesto por reconstrucción al cierre
  readonly porcentajeReconstruido: number; // (dineroReconstruido / totalDineroPOS) * 100
  readonly duracionCierreMinutos: number; // Minutos cronometrados de cierre guiado
  readonly discrepanciaCajaPesos: number; // Diferencia final entre efectivo y esperado
  readonly discrepanciaCajaPorcentaje: number; // (|discrepancia| / totalDineroPOS) * 100
  readonly perdidasColaOffline: number; // Transacciones perdidas o corruptas (debe ser 0)
  readonly calibracionesRealizadas?: readonly string[];
  readonly observaciones?: string;
}

export interface EvaluacionDiaPiloto {
  readonly dia: number;
  readonly h1_adopcion: boolean; // Cobertura >= 90%
  readonly h2_toques: boolean; // % Reconstruido < 15%
  readonly h3_tiempoCierre: boolean; // Duración < 5.0 minutos
  readonly h4_precisionCaja: boolean; // Discrepancia < 3.0%
  readonly h5_ceroPerdidas: boolean; // Pérdidas en cola === 0
  readonly diaAprobado: boolean; // Cumple las 5 hipótesis
  readonly detalleIncumplimientos: readonly string[];
}

export interface ResumenSemanaPiloto {
  readonly semana: 1 | 2;
  readonly fase: FasePiloto;
  readonly diasEvaluados: readonly MetricasDiaPiloto[];
  readonly evaluaciones: readonly EvaluacionDiaPiloto[];
  readonly promedioCobertura: number;
  readonly promedioReconstruccion: number;
  readonly promedioDuracionCierre: number;
  readonly promedioDiscrepanciaCaja: number;
  readonly totalPerdidasCola: number;
  readonly diasAprobados: number;
  readonly rachaMaximaDiasConsecutivos: number;
  readonly cumpleCriterioRetiroLibreta: boolean; // 5 días seguidos cumpliendo todo
}

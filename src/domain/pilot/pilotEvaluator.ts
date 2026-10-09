/**
 * Evaluador Puro de Métricas del Piloto (Sección 13 y 14 del Plan Maestro v2)
 * POS Paletería v2
 * Funciones matemáticas puras sin dependencias de UI ni red.
 */

import type {
  MetricasDiaPiloto,
  EvaluacionDiaPiloto,
  ResumenSemanaPiloto,
} from './types';

export const UMBRALES_PILOTO = {
  MIN_COBERTURA_PORCENTAJE: 90.0,
  MAX_RECONSTRUCCION_PORCENTAJE: 15.0,
  MAX_DURACION_CIERRE_MINUTOS: 5.0,
  MAX_DISCREPANCIA_CAJA_PORCENTAJE: 3.0,
  MAX_PERDIDAS_COLA: 0,
  DIAS_CONSECUTIVOS_RETIRO_LIBRETA: 5,
} as const;

/**
 * Evalúa el desempeño diario frente a las 4 hipótesis y la confiabilidad técnica
 */
export function evaluatePilotDay(metricas: MetricasDiaPiloto): EvaluacionDiaPiloto {
  const h1_adopcion = metricas.coberturaPorcentaje >= UMBRALES_PILOTO.MIN_COBERTURA_PORCENTAJE;
  const h2_toques = metricas.porcentajeReconstruido < UMBRALES_PILOTO.MAX_RECONSTRUCCION_PORCENTAJE;
  const h3_tiempoCierre = metricas.duracionCierreMinutos <= UMBRALES_PILOTO.MAX_DURACION_CIERRE_MINUTOS;
  const h4_precisionCaja = metricas.discrepanciaCajaPorcentaje <= UMBRALES_PILOTO.MAX_DISCREPANCIA_CAJA_PORCENTAJE;
  const h5_ceroPerdidas = metricas.perdidasColaOffline === UMBRALES_PILOTO.MAX_PERDIDAS_COLA;

  const detalleIncumplimientos: string[] = [];
  if (!h1_adopcion) {
    detalleIncumplimientos.push(
      `H1: Cobertura de ${metricas.coberturaPorcentaje.toFixed(1)}% menor al umbral de ${UMBRALES_PILOTO.MIN_COBERTURA_PORCENTAJE}%`
    );
  }
  if (!h2_toques) {
    detalleIncumplimientos.push(
      `H2: Reconstrucción de ${metricas.porcentajeReconstruido.toFixed(1)}% supera el límite de ${UMBRALES_PILOTO.MAX_RECONSTRUCCION_PORCENTAJE}%`
    );
  }
  if (!h3_tiempoCierre) {
    detalleIncumplimientos.push(
      `H3: Cierre tomó ${metricas.duracionCierreMinutos.toFixed(1)} min (máximo permitido ${UMBRALES_PILOTO.MAX_DURACION_CIERRE_MINUTOS} min)`
    );
  }
  if (!h4_precisionCaja) {
    detalleIncumplimientos.push(
      `H4: Discrepancia de caja de ${metricas.discrepanciaCajaPorcentaje.toFixed(2)}% supera el margen de ${UMBRALES_PILOTO.MAX_DISCREPANCIA_CAJA_PORCENTAJE}%`
    );
  }
  if (!h5_ceroPerdidas) {
    detalleIncumplimientos.push(
      `Confiabilidad: Se registraron ${metricas.perdidasColaOffline} pérdidas en la cola offline`
    );
  }

  const diaAprobado = h1_adopcion && h2_toques && h3_tiempoCierre && h4_precisionCaja && h5_ceroPerdidas;

  return {
    dia: metricas.dia,
    h1_adopcion,
    h2_toques,
    h3_tiempoCierre,
    h4_precisionCaja,
    h5_ceroPerdidas,
    diaAprobado,
    detalleIncumplimientos,
  };
}

/**
 * Calcula el resumen consolidado de una semana de piloto (Semana 1 Asistida o Semana 2 Autónoma)
 */
export function summarizePilotWeek(
  semana: 1 | 2,
  dias: readonly MetricasDiaPiloto[]
): ResumenSemanaPiloto {
  if (dias.length === 0) {
    return {
      semana,
      fase: semana === 1 ? 'SEMANA_1_ASISTIDA' : 'SEMANA_2_AUTONOMA',
      diasEvaluados: [],
      evaluaciones: [],
      promedioCobertura: 0,
      promedioReconstruccion: 0,
      promedioDuracionCierre: 0,
      promedioDiscrepanciaCaja: 0,
      totalPerdidasCola: 0,
      diasAprobados: 0,
      rachaMaximaDiasConsecutivos: 0,
      cumpleCriterioRetiroLibreta: false,
    };
  }

  const evaluaciones = dias.map(evaluatePilotDay);

  const sumaCobertura = dias.reduce((acc, d) => acc + d.coberturaPorcentaje, 0);
  const sumaReconstruccion = dias.reduce((acc, d) => acc + d.porcentajeReconstruido, 0);
  const sumaDuracion = dias.reduce((acc, d) => acc + d.duracionCierreMinutos, 0);
  const sumaDiscrepancia = dias.reduce((acc, d) => acc + d.discrepanciaCajaPorcentaje, 0);
  const totalPerdidas = dias.reduce((acc, d) => acc + d.perdidasColaOffline, 0);

  const diasAprobados = evaluaciones.filter((e) => e.diaAprobado).length;

  // Cálculo de racha máxima consecutiva de días aprobados
  let rachaActual = 0;
  let rachaMaxima = 0;
  for (const ev of evaluaciones) {
    if (ev.diaAprobado) {
      rachaActual++;
      if (rachaActual > rachaMaxima) {
        rachaMaxima = rachaActual;
      }
    } else {
      rachaActual = 0;
    }
  }

  const cumpleCriterioRetiroLibreta = rachaMaxima >= UMBRALES_PILOTO.DIAS_CONSECUTIVOS_RETIRO_LIBRETA;

  return {
    semana,
    fase: semana === 1 ? 'SEMANA_1_ASISTIDA' : 'SEMANA_2_AUTONOMA',
    diasEvaluados: dias,
    evaluaciones,
    promedioCobertura: Number((sumaCobertura / dias.length).toFixed(2)),
    promedioReconstruccion: Number((sumaReconstruccion / dias.length).toFixed(2)),
    promedioDuracionCierre: Number((sumaDuracion / dias.length).toFixed(2)),
    promedioDiscrepanciaCaja: Number((sumaDiscrepancia / dias.length).toFixed(2)),
    totalPerdidasCola: totalPerdidas,
    diasAprobados,
    rachaMaximaDiasConsecutivos: rachaMaxima,
    cumpleCriterioRetiroLibreta,
  };
}

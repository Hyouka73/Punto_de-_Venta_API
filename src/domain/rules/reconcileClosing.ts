import type {
  CatalogoItem,
  ParametrosNegocio,
} from '../config/types';
import type {
  CierreDetalle,
  CierreResumen,
  Movimiento,
  SemaforoCierre,
} from '../types';
import { expandCombo } from './expandCombo';
import { generateClosingExplanation } from './generateClosingExplanation';

export interface ReconcileClosingInput {
  readonly jornadaId: string;
  readonly fecha: string;
  readonly usuarioCierre: string;
  readonly fondoInicial: number;
  readonly inventarioInicial: Readonly<Record<string, number>>; // Apertura
  readonly entradas?: Readonly<Record<string, number>>;
  readonly mermas?: Readonly<Record<string, number>>;
  readonly restantesFisicos: Readonly<Record<string, number>>;
  readonly movimientos: readonly Movimiento[];
  readonly efectivoContado: number;
  readonly parametros: ParametrosNegocio;
  readonly catalogo: readonly CatalogoItem[];
  readonly tsCierre?: string;
}

/**
 * Motor de Cuadre Triple y Cierre Guiado (R9, R10, R11, R12, R13).
 *
 * Ejecuta los 3 cuadres independientes:
 * 1. Piezas por conteo físico vs piezas restantes
 * 2. Piezas por toques de mostrador (incluyendo combos expandidos)
 * 3. Dinero contado neto vs dinero esperado en caja
 */
export function reconcileClosing(input: ReconcileClosingInput): CierreResumen {
  const {
    jornadaId,
    fecha,
    usuarioCierre,
    fondoInicial,
    inventarioInicial,
    entradas = {},
    mermas = {},
    restantesFisicos,
    movimientos,
    efectivoContado,
    parametros,
    catalogo,
    tsCierre = new Date().toISOString(),
  } = input;


  // 1. Identificar ventas anuladas mediante ref_mov
  const anulacionesPorRef = new Map<string, number>();
  for (const mov of movimientos) {
    if (mov.tipo === 'ANULACION' && mov.ref_mov) {
      anulacionesPorRef.set(
        mov.ref_mov,
        (anulacionesPorRef.get(mov.ref_mov) ?? 0) + mov.cantidad
      );
    }
  }

  // 2. Acumular piezas vendidas por toques (desglosando combos) y dinero esperado
  const piezasToquesPorCat: Record<string, number> = {};
  let ventasEfectivo = 0;
  let ventasTransferencia = 0;
  let reconstruccionesTotal = 0;
  let totalMermas = 0;
  let totalConsumoCasa = 0;

  for (const mov of movimientos) {
    if (mov.tipo === 'VENTA') {
      const cantAnulada = anulacionesPorRef.get(mov.id_mov) ?? 0;
      const cantEfectiva = mov.cantidad - cantAnulada;

      if (cantEfectiva > 0) {
        // Dinero de la venta
        const montoEfectivo = (mov.monto_total / mov.cantidad) * cantEfectiva;
        if (mov.metodo_pago === 'TRANSFERENCIA') {
          ventasTransferencia += montoEfectivo;
        } else {
          ventasEfectivo += montoEfectivo;
        }

        // Piezas físicas vendidas (expande combos a sus componentes)
        const componentes = expandCombo(mov.categoria_id, cantEfectiva, catalogo);
        for (const comp of componentes) {
          piezasToquesPorCat[comp.categoriaId] =
            (piezasToquesPorCat[comp.categoriaId] ?? 0) + comp.cantidad;
        }
      }
    } else if (mov.tipo === 'RECONSTRUCCION') {
      reconstruccionesTotal += mov.monto_total;
      const componentes = expandCombo(mov.categoria_id, mov.cantidad, catalogo);
      for (const comp of componentes) {
        piezasToquesPorCat[comp.categoriaId] =
          (piezasToquesPorCat[comp.categoriaId] ?? 0) + comp.cantidad;
      }
    } else if (mov.tipo === 'MERMA') {
      totalMermas += mov.cantidad;
      if (mov.motivo === 'consumo_casa') {
        totalConsumoCasa += mov.cantidad;
      }
    }
  }

  // 3. Generar CierreDetalle para todas las categorías controladas por stock
  const categoriasStock = catalogo.filter((c) => c.controla_stock && !c.es_combo);
  const detallesPorCategoria: CierreDetalle[] = [];
  const discrepanciasMap: Record<string, number> = {};
  const nombresMap: Record<string, string> = {};

  let totalPiezasConteo = 0;
  let totalPiezasToques = 0;

  for (const cat of categoriasStock) {
    nombresMap[cat.id] = cat.nombre;
    const ap = inventarioInicial[cat.id] ?? 0;
    const ent = entradas[cat.id] ?? 0;
    const mer = mermas[cat.id] ?? 0;
    const rest = restantesFisicos[cat.id] ?? 0;

    // Cuadre 1: Piezas por conteo físico
    const piezasConteo = ap + ent - mer - rest;
    totalPiezasConteo += piezasConteo;

    // Cuadre 2: Piezas por toques en mostrador
    const piezasToques = piezasToquesPorCat[cat.id] ?? 0;
    totalPiezasToques += piezasToques;

    // Discrepancia = Conteo - Toques
    const discrepancia = piezasConteo - piezasToques;
    discrepanciasMap[cat.id] = discrepancia;

    // Reconstrucción propuesta (si faltan toques en mostrador)
    const propuestaReconstruccion = Math.max(0, discrepancia);
    const dineroEsperadoCat = piezasToques * cat.precio;

    detallesPorCategoria.push({
      categoria_id: cat.id,
      categoria_nombre: cat.nombre,
      apertura: ap,
      entradas: ent,
      mermas: mer,
      restantes_fisicos: rest,
      piezas_conteo: piezasConteo,
      piezas_toques: piezasToques,
      discrepancia_piezas: discrepancia,
      precio_unitario: cat.precio,
      dinero_esperado: dineroEsperadoCat,
      propuesta_reconstruccion: propuestaReconstruccion,
    });
  }

  // 4. Cuadre 3: Dinero en Caja vs Dinero Esperado
  const efectivoNeto = efectivoContado - fondoInicial;
  const dineroEsperado = ventasEfectivo + reconstruccionesTotal;
  const diferenciaFinal = efectivoNeto - dineroEsperado;

  // 5. Semáforo de Cierre (R11)
  const diffAbs = Math.abs(diferenciaFinal);
  let semaforo: SemaforoCierre = 'ROJO';
  if (diffAbs <= parametros.tolerancia_verde) {
    semaforo = 'VERDE';
  } else if (diffAbs <= parametros.tolerancia_ambar) {
    semaforo = 'AMBAR';
  }

  // 6. Generar Explicaciones sin culpa (R13)
  const explicaciones = generateClosingExplanation({
    discrepanciaPiezas: discrepanciasMap,
    diferenciaDinero: diferenciaFinal,
    toleranciaVerde: parametros.tolerancia_verde,
    toleranciaAmbar: parametros.tolerancia_ambar,
    nombresCategorias: nombresMap,
  });

  return {
    jornada_id: jornadaId,
    fecha,
    ts_cierre: tsCierre,
    usuario_cierre: usuarioCierre,
    fondo_inicial: fondoInicial,
    efectivo_contado: efectivoContado,
    efectivo_neto: efectivoNeto,
    ventas_efectivo: ventasEfectivo,
    ventas_transferencia: ventasTransferencia,
    reconstrucciones_total: reconstruccionesTotal,
    dinero_esperado: dineroEsperado,
    diferencia_final: diferenciaFinal,
    semaforo,
    detalles_por_categoria: detallesPorCategoria,
    explicaciones,
    total_piezas_conteo: totalPiezasConteo,
    total_piezas_toques: totalPiezasToques,
    total_mermas: totalMermas,
    total_consumo_casa: totalConsumoCasa,
  };
}

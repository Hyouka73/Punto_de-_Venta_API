export interface ClosingExplanationInput {
  readonly discrepanciaPiezas: Readonly<Record<string, number>>; // CategoriaId -> (Piezas Conteo - Piezas Toques)
  readonly diferenciaDinero: number; // Efectivo Neto - Dinero Esperado
  readonly toleranciaVerde: number;
  readonly toleranciaAmbar: number;
  readonly nombresCategorias?: Readonly<Record<string, string>>;
}

/**
 * Genera explicaciones y diagnósticos del cierre diario sin lenguaje de culpa (R13).
 *
 * Utiliza un tono neutral, empático y estrictamente descriptivo de los hechos numéricos.
 * Prohibido el uso de lenguaje acusatorio ("la cajera olvidó", "error humano", "culpa").
 */
export function generateClosingExplanation(input: ClosingExplanationInput): string[] {
  const explicaciones: string[] = [];
  const {
    discrepanciaPiezas,
    diferenciaDinero,
    toleranciaVerde,
    toleranciaAmbar,
    nombresCategorias = {},
  } = input;

  // 1. Diagnóstico de Efectivo y Semáforo
  const diffAbs = Math.abs(diferenciaDinero);
  const diffFormateada = `$${diffAbs.toFixed(2)} MXN`;

  if (diferenciaDinero === 0) {
    explicaciones.push('Cuadre de caja exacto: el efectivo contado coincide al 100% con los registros.');
  } else if (diferenciaDinero > 0) {
    if (diffAbs <= toleranciaVerde) {
      explicaciones.push(
        `Sobrante leve de efectivo en caja de ${diffFormateada} (dentro de tolerancia normal de $${toleranciaVerde} MXN).`
      );
    } else if (diffAbs <= toleranciaAmbar) {
      explicaciones.push(
        `Sobrante moderado de efectivo en caja de ${diffFormateada} (requiere revisión de posibles propinas o cobros no registrados).`
      );
    } else {
      explicaciones.push(
        `Sobrante considerable de efectivo en caja de ${diffFormateada} por encima de la tolerancia de $${toleranciaAmbar} MXN; se recomienda cotejo minucioso.`
      );
    }
  } else {
    // diferenciaDinero < 0 (Faltante)
    if (diffAbs <= toleranciaVerde) {
      explicaciones.push(
        `Diferencia menor en caja de -${diffFormateada} (dentro de tolerancia operativa permisible de $${toleranciaVerde} MXN).`
      );
    } else if (diffAbs <= toleranciaAmbar) {
      explicaciones.push(
        `Diferencia moderada en caja de -${diffFormateada}; se sugiere verificar si hubo mermas no capturadas o redondeos.`
      );
    } else {
      explicaciones.push(
        `Diferencia en caja de -${diffFormateada} superior a la tolerancia de $${toleranciaAmbar} MXN; requiere revisión con supervisora.`
      );
    }
  }

  // 2. Diagnóstico por Piezas Físicas vs Toques Registrados
  for (const [catId, discrepancia] of Object.entries(discrepanciaPiezas)) {
    if (discrepancia === 0) continue;

    const nombre = nombresCategorias[catId] || catId;
    const piezasAbs = Math.abs(discrepancia);
    const sufijoPiezas = piezasAbs === 1 ? 'pieza' : 'piezas';

    if (discrepancia > 0) {
      // Conteo físico arrojó más salidas que los toques registrados en mostrador
      explicaciones.push(
        `Se identificaron ${piezasAbs} ${sufijoPiezas} de ${nombre} retiradas del congelador no reflejadas en los toques del mostrador (candidatas a reconstrucción).`
      );
    } else {
      // Discrepancia < 0: Más toques registrados que piezas faltantes en congelador
      explicaciones.push(
        `Se registraron ${piezasAbs} ${sufijoPiezas} adicionales de ${nombre} en el mostrador respecto a la existencia física (posible toque duplicado o merma pendiente).`
      );
    }
  }

  return explicaciones;
}

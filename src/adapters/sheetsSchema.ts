/**
 * POS Paletería v2 - Estructura y Esquema de Google Sheets
 * Define los metadatos, nombres de hojas, columnas, tipos y fórmulas maestras
 * para la base de datos distribuida en Google Sheets según el Plan Maestro v2.
 */

export interface SheetColumnDefinition {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'json' | 'datetime';
  readonly description: string;
  readonly required?: boolean;
}

export interface SheetDefinition {
  readonly name: string;
  readonly isProtected: boolean;
  readonly description: string;
  readonly columns: readonly SheetColumnDefinition[];
}

export const SHEETS_NAMES = {
  CATALOGO: 'Catálogo',
  PARAMETROS: 'Parámetros',
  MOVIMIENTOS: 'Movimientos',
  JORNADAS: 'Jornadas',
  CIERRE_DETALLE: 'Cierre_Detalle',
  CIERRES: 'Cierres',
  RESUMEN: 'Resumen',
  STOCK_CALCULADO: 'Stock_Calculado',
} as const;

export type SheetName = typeof SHEETS_NAMES[keyof typeof SHEETS_NAMES];

export const SHEETS_SCHEMA: Record<SheetName, SheetDefinition> = {
  [SHEETS_NAMES.CATALOGO]: {
    name: SHEETS_NAMES.CATALOGO,
    isProtected: false,
    description: 'Catálogo de productos, categorías y combos con precios y costos privados.',
    columns: [
      { name: 'id', type: 'string', description: 'ID único (ej. CAT_AGUA, CMB_DUO)', required: true },
      { name: 'nombre', type: 'string', description: 'Nombre para UI', required: true },
      { name: 'precio', type: 'number', description: 'Precio de venta al público en MXN', required: true },
      { name: 'costo', type: 'number', description: 'Costo unitario privado (solo admin)', required: true },
      { name: 'icono', type: 'string', description: 'Nombre de icono UI', required: true },
      { name: 'color', type: 'string', description: 'Color UI hex o Tailwind', required: true },
      { name: 'orden', type: 'number', description: 'Orden en la botonera', required: true },
      { name: 'activo', type: 'boolean', description: 'Habilitado para venta', required: true },
      { name: 'controla_stock', type: 'boolean', description: 'Descuenta inventario directamente', required: true },
      { name: 'componentes', type: 'json', description: 'JSON con desglose de combos' },
    ],
  },

  [SHEETS_NAMES.PARAMETROS]: {
    name: SHEETS_NAMES.PARAMETROS,
    isProtected: false,
    description: 'Parámetros operativos y umbrales de tolerancia del negocio.',
    columns: [
      { name: 'clave', type: 'string', description: 'Clave única del parámetro', required: true },
      { name: 'valor', type: 'string', description: 'Valor del parámetro', required: true },
      { name: 'descripcion', type: 'string', description: 'Explicación del uso del parámetro' },
    ],
  },

  [SHEETS_NAMES.MOVIMIENTOS]: {
    name: SHEETS_NAMES.MOVIMIENTOS,
    isProtected: true, // Prohibido editar manualmente - libro de solo agregación
    description: 'Libro inmutable de solo agregación (append-only ledger).',
    columns: [
      { name: 'id_mov', type: 'string', description: 'UUID v4 generado en cliente', required: true },
      { name: 'jornada_id', type: 'string', description: 'ID de la jornada activa', required: true },
      { name: 'tipo', type: 'string', description: 'VENTA | ANULACION | MERMA | ENTRADA | AJUSTE | RECONSTRUCCION | APERTURA', required: true },
      { name: 'categoria_id', type: 'string', description: 'Clave de categoría o combo', required: true },
      { name: 'cantidad', type: 'number', description: 'Cantidad de unidades', required: true },
      { name: 'precio_unitario', type: 'number', description: 'Precio unitario congelado', required: true },
      { name: 'monto_total', type: 'number', description: 'Importe monetario total', required: true },
      { name: 'metodo_pago', type: 'string', description: 'EFECTIVO | TRANSFERENCIA', required: true },
      { name: 'ref_mov', type: 'string', description: 'Referencia a id_mov previo si es anulación' },
      { name: 'motivo', type: 'string', description: 'Motivo de merma o anulación' },
      { name: 'usuario', type: 'string', description: 'Rol o usuario emisor', required: true },
      { name: 'dispositivo_id', type: 'string', description: 'Identificador del dispositivo cliente' },
      { name: 'ts_cliente', type: 'datetime', description: 'Marca de tiempo cliente ISO 8601', required: true },
      { name: 'ts_servidor', type: 'datetime', description: 'Marca de tiempo servidor ISO 8601', required: true },
      { name: 'estado', type: 'string', description: 'CONFIRMADO | ANULADO', required: true },
      { name: 'nota', type: 'string', description: 'Observaciones opcionales' },
    ],
  },

  [SHEETS_NAMES.JORNADAS]: {
    name: SHEETS_NAMES.JORNADAS,
    isProtected: false,
    description: 'Historial de jornadas de negocio delimitadas por apertura y cierre.',
    columns: [
      { name: 'jornada_id', type: 'string', description: 'ID único de jornada', required: true },
      { name: 'fecha_negocio', type: 'string', description: 'Fecha comercial YYYY-MM-DD', required: true },
      { name: 'estado', type: 'string', description: 'ABIERTA | CERRADA', required: true },
      { name: 'ts_apertura', type: 'datetime', description: 'Fecha/hora de apertura', required: true },
      { name: 'fondo_inicial', type: 'number', description: 'Fondo de caja en apertura', required: true },
      { name: 'ts_cierre', type: 'datetime', description: 'Fecha/hora de cierre' },
      { name: 'usuario_apertura', type: 'string', description: 'Usuario que abrió', required: true },
      { name: 'usuario_cierre', type: 'string', description: 'Usuario que cerró' },
      { name: 'total_ventas_dinero', type: 'number', description: 'Venta total registrada' },
      { name: 'diferencia_caja', type: 'number', description: 'Diferencia final de efectivo' },
    ],
  },

  [SHEETS_NAMES.CIERRE_DETALLE]: {
    name: SHEETS_NAMES.CIERRE_DETALLE,
    isProtected: false,
    description: 'Desglose analítico de piezas y cuadre por categoría al cierre de jornada.',
    columns: [
      { name: 'jornada_id', type: 'string', description: 'ID de la jornada', required: true },
      { name: 'categoria_id', type: 'string', description: 'Categoría auditada', required: true },
      { name: 'stock_apertura', type: 'number', description: 'Stock al inicio', required: true },
      { name: 'entradas', type: 'number', description: 'Entradas recibidas', required: true },
      { name: 'mermas', type: 'number', description: 'Mermas registradas', required: true },
      { name: 'stock_restante_conteo', type: 'number', description: 'Conteo físico restante', required: true },
      { name: 'piezas_conteo', type: 'number', description: 'Apertura + Entradas - Mermas - Restantes', required: true },
      { name: 'piezas_toques', type: 'number', description: 'Piezas registradas en toques', required: true },
      { name: 'piezas_diferencia', type: 'number', description: 'Piezas conteo - Piezas toques', required: true },
      { name: 'reconstruidas', type: 'number', description: 'Piezas reconstruidas', required: true },
    ],
  },

  [SHEETS_NAMES.CIERRES]: {
    name: SHEETS_NAMES.CIERRES,
    isProtected: false,
    description: 'Consolidado financiero del cuadre triple de cada cierre.',
    columns: [
      { name: 'jornada_id', type: 'string', description: 'ID de la jornada', required: true },
      { name: 'dinero_toques', type: 'number', description: 'Total vendido en toques', required: true },
      { name: 'dinero_reconstruido', type: 'number', description: 'Total de reconstrucción', required: true },
      { name: 'dinero_esperado_total', type: 'number', description: 'Dinero esperado global', required: true },
      { name: 'efectivo_contado', type: 'number', description: 'Efectivo físico en caja', required: true },
      { name: 'fondo_inicial', type: 'number', description: 'Fondo inicial restado', required: true },
      { name: 'efectivo_neto', type: 'number', description: 'Efectivo contado - Fondo inicial', required: true },
      { name: 'diferencia_final', type: 'number', description: 'Efectivo neto - Dinero esperado', required: true },
      { name: 'semaforo', type: 'string', description: 'VERDE | AMBAR | ROJO', required: true },
      { name: 'observaciones', type: 'string', description: 'Diagnóstico o notas del cierre' },
    ],
  },

  [SHEETS_NAMES.RESUMEN]: {
    name: SHEETS_NAMES.RESUMEN,
    isProtected: false,
    description: 'Tablero dinámico de fórmulas para supervisión y monitoreo en tiempo real.',
    columns: [
      { name: 'indicador', type: 'string', description: 'Nombre de la métrica', required: true },
      { name: 'formula_o_valor', type: 'string', description: 'Fórmula de cálculo', required: true },
      { name: 'unidad', type: 'string', description: 'MXN, Piezas, Estado' },
      { name: 'descripcion', type: 'string', description: 'Interpretación del indicador' },
    ],
  },

  [SHEETS_NAMES.STOCK_CALCULADO]: {
    name: SHEETS_NAMES.STOCK_CALCULADO,
    isProtected: false,
    description: 'Cálculo analítico dinámico de existencias en tiempo real por categoría.',
    columns: [
      { name: 'categoria_id', type: 'string', description: 'ID de la categoría', required: true },
      { name: 'nombre', type: 'string', description: 'Nombre de categoría', required: true },
      { name: 'apertura', type: 'number', description: 'Stock inicial de jornada activa', required: true },
      { name: 'entradas', type: 'number', description: 'Entradas acumuladas', required: true },
      { name: 'ventas_directas', type: 'number', description: 'Ventas directas en piezas', required: true },
      { name: 'ventas_combos', type: 'number', description: 'Piezas descontadas vía combos', required: true },
      { name: 'total_ventas', type: 'number', description: 'Suma de ventas directas y combos', required: true },
      { name: 'mermas', type: 'number', description: 'Mermas acumuladas', required: true },
      { name: 'ajustes', type: 'number', description: 'Ajustes manuales de inventario', required: true },
      { name: 'stock_actual', type: 'number', description: 'Apertura + Entradas - TotalVentas - Mermas + Ajustes', required: true },
      { name: 'alerta', type: 'string', description: 'Alerta si stock_actual < 0 (prohibido ocultar con Math.max)', required: true },
    ],
  },
};

/**
 * Fórmulas maestras estándar de Google Sheets para la hoja Resumen
 */
export const RESUMEN_FORMULAS = [
  {
    indicador: 'Total Ventas en Dinero (Confirmadas)',
    formula: '=SUMIFS(Movimientos!G2:G, Movimientos!C2:C, "VENTA", Movimientos!O2:O, "CONFIRMADO")',
    unidad: 'MXN',
    descripcion: 'Suma de importes monetarios de ventas efectivas confirmadas',
  },
  {
    indicador: 'Total Ventas en Piezas (Directas)',
    formula: '=SUMIFS(Movimientos!E2:E, Movimientos!C2:C, "VENTA", Movimientos!O2:O, "CONFIRMADO")',
    unidad: 'Piezas',
    descripcion: 'Suma de unidades vendidas directamente',
  },
  {
    indicador: 'Total Mermas en Piezas',
    formula: '=SUMIFS(Movimientos!E2:E, Movimientos!C2:C, "MERMA", Movimientos!O2:O, "CONFIRMADO")',
    unidad: 'Piezas',
    descripcion: 'Unidades dadas de baja por defecto o daño',
  },
  {
    indicador: 'Total Entradas en Piezas',
    formula: '=SUMIFS(Movimientos!E2:E, Movimientos!C2:C, "ENTRADA", Movimientos!O2:O, "CONFIRMADO")',
    unidad: 'Piezas',
    descripcion: 'Unidades ingresadas de taller o almacén',
  },
  {
    indicador: 'Total Ventas Reconstruidas',
    formula: '=SUMIFS(Movimientos!E2:E, Movimientos!C2:C, "RECONSTRUCCION", Movimientos!O2:O, "CONFIRMADO")',
    unidad: 'Piezas',
    descripcion: 'Unidades detectadas y reconstruidas en cierre',
  },
  {
    indicador: 'Jornadas Registradas',
    formula: '=COUNTA(Jornadas!A2:A)',
    unidad: 'Jornadas',
    descripcion: 'Número total de jornadas históricas en base de datos',
  },
];

/**
 * POS Paletería v2 — Script de Inicialización y Estructura Maestra de Google Sheets
 * 
 * Este script configura de manera automatizada las 8 hojas del libro de cálculo maestro:
 * 1. Catálogo
 * 2. Parámetros
 * 3. Movimientos (Protegida contra edición manual)
 * 4. Jornadas
 * 5. Cierre_Detalle
 * 6. Cierres
 * 7. Resumen (Con fórmulas automáticas)
 * 8. Stock_Calculado (Con fórmulas dinámicas y alertas de stock negativo)
 */

var PALETTE = {
  HEADER_BG: '#0284C7', // Azul primario cálido
  HEADER_FG: '#FFFFFF',
  ACCENT_BG: '#F0F9FF',
  PROTECTED_BG: '#FEF3C7', // Ámbar suave para hojas protegidas
  ALERT_RED: '#FEE2E2',
  TEXT_DARK: '#0F172A',
};

/**
 * Función principal para inicializar o auditar el libro maestro completo.
 * Puede ejecutarse de forma idempotente: si las hojas ya existen, asegura encabezados y fórmulas.
 */
function setupMasterSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Logger.log('Iniciando configuración maestra de Google Sheets para POS Paletería v2...');

  setupSheetCatalogo(ss);
  setupSheetParametros(ss);
  setupSheetMovimientos(ss);
  setupSheetJornadas(ss);
  setupSheetCierreDetalle(ss);
  setupSheetCierres(ss);
  setupSheetResumen(ss);
  setupSheetStockCalculado(ss);

  // Proteger la hoja Movimientos para mantener la integridad append-only
  protectSheetMovimientos(ss);

  Logger.log('¡Estructura de Google Sheets completada exitosamente al 100%!');
}

/**
 * Helper para obtener o crear una hoja por nombre
 */
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Helper para estilizar encabezados de tabla
 */
function styleHeaders(sheet, headers) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setBackground(PALETTE.HEADER_BG);
  range.setFontColor(PALETTE.HEADER_FG);
  range.setFontWeight('bold');
  range.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

/**
 * 1. Hoja Catálogo
 */
function setupSheetCatalogo(ss) {
  var sheet = getOrCreateSheet(ss, 'Catálogo');
  var headers = [
    'id', 'nombre', 'precio', 'costo', 'icono',
    'color', 'orden', 'activo', 'controla_stock', 'componentes'
  ];
  styleHeaders(sheet, headers);

  // Semilla si está vacía
  if (sheet.getLastRow() <= 1) {
    var defaultCatalog = [
      ['CAT_AGUA', 'Paleta de Agua', 15, 6, 'droplets', '#38BDF8', 1, true, true, ''],
      ['CAT_CREMA', 'Paleta de Crema', 20, 9, 'ice-cream', '#FDE047', 2, true, true, ''],
      ['CAT_SANDWICH', 'Sándwich Helado', 25, 12, 'cookie', '#F59E0B', 3, true, true, ''],
      ['CAT_NIEVE', 'Nieve (Vaso)', 18, 7, 'sparkles', '#FB7185', 4, true, true, ''],
      ['CMB_DUO', 'Combo Dúo (Agua + Crema)', 32, 15, 'sparkles', '#A855F7', 5, true, false, '[{"id":"CAT_AGUA","cant":1},{"id":"CAT_CREMA","cant":1}]']
    ];
    sheet.getRange(2, 1, defaultCatalog.length, headers.length).setValues(defaultCatalog);
    sheet.getRange(2, 3, defaultCatalog.length, 2).setNumberFormat('$#,##0.00'); // Moneda precio y costo
  }
}

/**
 * 2. Hoja Parámetros
 */
function setupSheetParametros(ss) {
  var sheet = getOrCreateSheet(ss, 'Parámetros');
  var headers = ['clave', 'valor', 'descripcion'];
  styleHeaders(sheet, headers);

  if (sheet.getLastRow() <= 1) {
    var defaultParams = [
      ['tolerancia_verde', '15', 'Margen máximo en MXN para semáforo verde'],
      ['tolerancia_ambar', '30', 'Margen máximo en MXN para semáforo ámbar'],
      ['fondo_caja_default', '200', 'Fondo en efectivo sugerido al abrir jornada'],
      ['ventana_deshacer_min', '10', 'Minutos permitidos para deshacer venta sin PIN'],
      ['timezone', 'America/Mexico_City', 'Zona horaria oficial del negocio'],
      ['schema_version', '2.0.0', 'Versión del esquema de base de datos']
    ];
    sheet.getRange(2, 1, defaultParams.length, headers.length).setValues(defaultParams);
  }
}

/**
 * 3. Hoja Movimientos (Append-only)
 */
function setupSheetMovimientos(ss) {
  var sheet = getOrCreateSheet(ss, 'Movimientos');
  var headers = [
    'id_mov', 'jornada_id', 'tipo', 'categoria_id', 'cantidad',
    'precio_unitario', 'monto_total', 'metodo_pago', 'ref_mov',
    'motivo', 'usuario', 'dispositivo_id', 'ts_cliente', 'ts_servidor',
    'estado', 'nota'
  ];
  styleHeaders(sheet, headers);
}

/**
 * 4. Hoja Jornadas
 */
function setupSheetJornadas(ss) {
  var sheet = getOrCreateSheet(ss, 'Jornadas');
  var headers = [
    'jornada_id', 'fecha_negocio', 'estado', 'ts_apertura', 'fondo_inicial',
    'ts_cierre', 'usuario_apertura', 'usuario_cierre', 'total_ventas_dinero', 'diferencia_caja'
  ];
  styleHeaders(sheet, headers);
}

/**
 * 5. Hoja Cierre_Detalle
 */
function setupSheetCierreDetalle(ss) {
  var sheet = getOrCreateSheet(ss, 'Cierre_Detalle');
  var headers = [
    'jornada_id', 'categoria_id', 'stock_apertura', 'entradas', 'mermas',
    'stock_restante_conteo', 'piezas_conteo', 'piezas_toques', 'piezas_diferencia', 'reconstruidas'
  ];
  styleHeaders(sheet, headers);
}

/**
 * 6. Hoja Cierres
 */
function setupSheetCierres(ss) {
  var sheet = getOrCreateSheet(ss, 'Cierres');
  var headers = [
    'jornada_id', 'dinero_toques', 'dinero_reconstruido', 'dinero_esperado_total',
    'efectivo_contado', 'fondo_inicial', 'efectivo_neto', 'diferencia_final',
    'semaforo', 'observaciones'
  ];
  styleHeaders(sheet, headers);
}

/**
 * 7. Hoja Resumen con Fórmulas Automáticas
 */
function setupSheetResumen(ss) {
  var sheet = getOrCreateSheet(ss, 'Resumen');
  var headers = ['indicador', 'formula_o_valor', 'unidad', 'descripcion'];
  styleHeaders(sheet, headers);

  var resumenRows = [
    [
      'Total Ventas en Dinero (Confirmadas)',
      '=SUMIFS(Movimientos!G2:G, Movimientos!C2:C, "VENTA", Movimientos!O2:O, "CONFIRMADO")',
      'MXN',
      'Suma de importes monetarios de ventas confirmadas'
    ],
    [
      'Total Ventas en Piezas (Directas)',
      '=SUMIFS(Movimientos!E2:E, Movimientos!C2:C, "VENTA", Movimientos!O2:O, "CONFIRMADO")',
      'Piezas',
      'Suma de unidades de paletas y productos vendidos'
    ],
    [
      'Total Mermas en Piezas',
      '=SUMIFS(Movimientos!E2:E, Movimientos!C2:C, "MERMA", Movimientos!O2:O, "CONFIRMADO")',
      'Piezas',
      'Unidades dadas de baja por daño o descongelamiento'
    ],
    [
      'Total Entradas en Piezas',
      '=SUMIFS(Movimientos!E2:E, Movimientos!C2:C, "ENTRADA", Movimientos!O2:O, "CONFIRMADO")',
      'Piezas',
      'Unidades ingresadas a stock desde taller'
    ],
    [
      'Total Ventas Reconstruidas',
      '=SUMIFS(Movimientos!E2:E, Movimientos!C2:C, "RECONSTRUCCION", Movimientos!O2:O, "CONFIRMADO")',
      'Piezas',
      'Unidades faltantes reconstruidas en cierre'
    ],
    [
      'Jornadas Registradas',
      '=COUNTA(Jornadas!A2:A)',
      'Jornadas',
      'Total de jornadas en la base de datos'
    ]
  ];

  sheet.getRange(2, 1, resumenRows.length, headers.length).setValues(resumenRows);
  sheet.getRange(2, 2, 1, 1).setNumberFormat('$#,##0.00');
  sheet.autoResizeColumns(1, 4);
}

/**
 * 8. Hoja Stock_Calculado con Fórmulas Dinámicas
 */
function setupSheetStockCalculado(ss) {
  var sheet = getOrCreateSheet(ss, 'Stock_Calculado');
  var headers = [
    'categoria_id', 'nombre', 'apertura', 'entradas', 'ventas_directas',
    'ventas_combos', 'total_ventas', 'mermas', 'ajustes', 'stock_actual', 'alerta'
  ];
  styleHeaders(sheet, headers);

  // Categorías base con control de stock directo
  var categorias = [
    ['CAT_AGUA', 'Paleta de Agua'],
    ['CAT_CREMA', 'Paleta de Crema'],
    ['CAT_SANDWICH', 'Sándwich Helado'],
    ['CAT_NIEVE', 'Nieve (Vaso)']
  ];

  var rows = [];
  for (var i = 0; i < categorias.length; i++) {
    var rowIdx = i + 2;
    var catId = categorias[i][0];
    var nombre = categorias[i][1];

    // Fórmulas que consultan la hoja Movimientos
    // Columna C=Movimientos!C (tipo), D=Movimientos!D (categoria_id), E=Movimientos!E (cantidad), O=Movimientos!O (estado)
    var formulaEntradas = '=SUMIFS(Movimientos!$E$2:$E, Movimientos!$C$2:$C, "ENTRADA", Movimientos!$D$2:$D, "' + catId + '", Movimientos!$O$2:$O, "CONFIRMADO")';
    var formulaVentasDirectas = '=SUMIFS(Movimientos!$E$2:$E, Movimientos!$C$2:$C, "VENTA", Movimientos!$D$2:$D, "' + catId + '", Movimientos!$O$2:$O, "CONFIRMADO")';
    
    // Combos: si catId es CAT_AGUA o CAT_CREMA, suma ventas del combo CMB_DUO
    var formulaCombos = (catId === 'CAT_AGUA' || catId === 'CAT_CREMA')
      ? '=SUMIFS(Movimientos!$E$2:$E, Movimientos!$C$2:$C, "VENTA", Movimientos!$D$2:$D, "CMB_DUO", Movimientos!$O$2:$O, "CONFIRMADO")'
      : '0';

    var formulaTotalVentas = '=E' + rowIdx + ' + F' + rowIdx;
    var formulaMermas = '=SUMIFS(Movimientos!$E$2:$E, Movimientos!$C$2:$C, "MERMA", Movimientos!$D$2:$D, "' + catId + '", Movimientos!$O$2:$O, "CONFIRMADO")';
    var formulaAjustes = '=SUMIFS(Movimientos!$E$2:$E, Movimientos!$C$2:$C, "AJUSTE", Movimientos!$D$2:$D, "' + catId + '", Movimientos!$O$2:$O, "CONFIRMADO")';
    
    // Stock actual = Apertura(C) + Entradas(D) - TotalVentas(G) - Mermas(H) + Ajustes(I)
    // R8: El stock jamás se oculta con Math.max(0, ...), los negativos deben ser visibles
    var formulaStockActual = '=C' + rowIdx + ' + D' + rowIdx + ' - G' + rowIdx + ' - H' + rowIdx + ' + I' + rowIdx;
    var formulaAlerta = '=IF(J' + rowIdx + ' < 0, "ALERTA: STOCK NEGATIVO", "OK")';

    rows.push([
      catId,
      nombre,
      0, // Apertura inicial (se actualiza por jornada)
      formulaEntradas,
      formulaVentasDirectas,
      formulaCombos,
      formulaTotalVentas,
      formulaMermas,
      formulaAjustes,
      formulaStockActual,
      formulaAlerta
    ]);
  }

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * Protección de la hoja Movimientos para evitar modificaciones accidentales o destructivas.
 */
function protectSheetMovimientos(ss) {
  var sheet = ss.getSheetByName('Movimientos');
  if (!sheet) return;

  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  if (protections.length === 0) {
    var protection = sheet.protect().setDescription('Hoja protegida contra edición manual (Solo Apps Script)');
    var me = Session.getEffectiveUser();
    protection.addEditor(me);
    protection.removeEditors(protection.getEditors());
    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  }
}

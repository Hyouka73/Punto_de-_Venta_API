/**
 * POS Paletería v2 — Backend Serverless Google Apps Script (Code.gs)
 * 
 * Implementación de la API HTTP con:
 * - LockService atómico (espera real de 10 segundos).
 * - MimeType.TEXT para evitar preflight OPTIONS de CORS.
 * - Deduplicación idempotente por id_mov en lote.
 * - Validación de PIN en PropertiesService (nunca en celdas).
 * - Exclusión de costos y márgenes en lectura pública de catálogo.
 * - Gobernanza de solo-agregación (append-only ledger).
 */

/**
 * Endpoint HTTP GET
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

/**
 * Endpoint HTTP POST
 */
function doPost(e) {
  return handleRequest(e, 'POST');
}

/**
 * Manejador principal de peticiones con bloqueo atómico
 */
function handleRequest(e, method) {
  var lock = LockService.getScriptLock();
  var lockAcquired = false;

  try {
    // Espera real de hasta 10 segundos para concurrencia atómica
    lockAcquired = lock.tryLock(10000);
    if (!lockAcquired) {
      return jsonResponse({
        success: false,
        error: 'El servidor está ocupado procesando otra transacción. Por favor, reintenta en unos momentos.',
        code: 'LOCK_TIMEOUT'
      });
    }

    var payload = {};
    if (method === 'POST') {
      if (e && e.postData && e.postData.contents) {
        payload = JSON.parse(e.postData.contents);
      }
    } else {
      payload = (e && e.parameter) ? e.parameter : {};
    }

    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = {};

    switch (action) {
      case 'GET_CATALOG':
        result = handleGetCatalog(ss);
        break;

      case 'GET_PARAMETERS':
        result = handleGetParameters(ss);
        break;

      case 'GET_ACTIVE_JORNADA':
        result = handleGetActiveJornada(ss);
        break;

      case 'OPEN_JORNADA':
        result = handleOpenJornada(ss, payload);
        break;

      case 'SUBMIT_MOVEMENTS':
        result = handleSubmitMovements(ss, payload);
        break;

      case 'CLOSE_JORNADA':
        result = handleCloseJornada(ss, payload);
        break;

      case 'VALIDATE_PIN':
        result = handleValidatePin(payload);
        break;

      case 'GET_DAILY_SUMMARY':
        result = handleGetDailySummary(ss, payload);
        break;

      default:
        result = {
          success: false,
          error: 'Acción no reconocida: ' + action,
          code: 'INVALID_ACTION'
        };
    }

    return jsonResponse(result);

  } catch (err) {
    Logger.log('Error en handleRequest: ' + err.toString());
    return jsonResponse({
      success: false,
      error: err.toString(),
      code: 'SERVER_ERROR'
    });
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

/**
 * Genera respuesta HTTP en formato texto plano (text/plain)
 * para evitar preflight OPTIONS de CORS en navegadores y PWAs.
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 1. GET_CATALOG: Retorna catálogo público excluyendo estrictamente 'costo' y margen.
 */
function handleGetCatalog(ss) {
  var sheet = ss.getSheetByName('Catálogo');
  if (!sheet) {
    return { success: false, error: 'Hoja Catálogo no encontrada' };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, items: [], version: '2.0.0' };
  }

  var headers = data[0];
  var idIdx = headers.indexOf('id');
  var nomIdx = headers.indexOf('nombre');
  var precioIdx = headers.indexOf('precio');
  var iconoIdx = headers.indexOf('icono');
  var colorIdx = headers.indexOf('color');
  var ordenIdx = headers.indexOf('orden');
  var activoIdx = headers.indexOf('activo');
  var controlaStockIdx = headers.indexOf('controla_stock');
  var componentesIdx = headers.indexOf('componentes');

  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var activo = row[activoIdx] === true || String(row[activoIdx]).toUpperCase() === 'TRUE';
    if (!activo) continue;

    var componentes = undefined;
    if (componentesIdx >= 0 && row[componentesIdx]) {
      try {
        componentes = JSON.parse(row[componentesIdx]);
      } catch (e) {
        componentes = undefined;
      }
    }

    items.push({
      id: String(row[idIdx]),
      nombre: String(row[nomIdx]),
      precio: Number(row[precioIdx]),
      // NOTA DE SEGURIDAD: costo y margen son estrictamente excluidos del payload
      icono: iconoIdx >= 0 ? String(row[iconoIdx]) : 'ice-cream',
      color: colorIdx >= 0 ? String(row[colorIdx]) : '#38BDF8',
      orden: ordenIdx >= 0 ? Number(row[ordenIdx]) : i,
      activo: activo,
      controla_stock: controlaStockIdx >= 0 ? (row[controlaStockIdx] === true || String(row[controlaStockIdx]).toUpperCase() === 'TRUE') : true,
      es_combo: componentes !== undefined && Array.isArray(componentes) && componentes.length > 0,
      componentes: componentes
    });
  }

  // Ordenar por 'orden'
  items.sort(function(a, b) { return a.orden - b.orden; });

  return { success: true, items: items, version: '2.0.0' };
}

/**
 * 2. GET_PARAMETERS: Retorna parámetros operativos
 */
function handleGetParameters(ss) {
  var sheet = ss.getSheetByName('Parámetros');
  if (!sheet) {
    return {
      success: true,
      parameters: {
        tolerancia_verde: 15,
        tolerancia_ambar: 30,
        fondo_caja_default: 200,
        ventana_deshacer_min: 10,
        timezone: 'America/Mexico_City',
        schema_version: '2.0.0'
      }
    };
  }

  var data = sheet.getDataRange().getValues();
  var params = {};
  for (var i = 1; i < data.length; i++) {
    var clave = String(data[i][0]);
    var valor = data[i][1];
    if (clave === 'tolerancia_verde' || clave === 'tolerancia_ambar' || clave === 'fondo_caja_default' || clave === 'ventana_deshacer_min') {
      params[clave] = Number(valor);
    } else {
      params[clave] = valor;
    }
  }

  return { success: true, parameters: params };
}

/**
 * 3. GET_ACTIVE_JORNADA: Consulta si hay una jornada abierta
 */
function handleGetActiveJornada(ss) {
  var sheet = ss.getSheetByName('Jornadas');
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, jornada: null };
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var estadoIdx = headers.indexOf('estado');
  var idIdx = headers.indexOf('jornada_id');
  var fechaIdx = headers.indexOf('fecha_negocio');
  var tsApIdx = headers.indexOf('ts_apertura');
  var fondoIdx = headers.indexOf('fondo_inicial');
  var userApIdx = headers.indexOf('usuario_apertura');

  // Buscar última jornada abierta
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][estadoIdx]).toUpperCase() === 'ABIERTA') {
      var row = data[i];
      return {
        success: true,
        jornada: {
          id: String(row[idIdx]),
          fecha: String(row[fechaIdx]),
          estado: 'ABIERTA',
          tsApertura: String(row[tsApIdx]),
          fondoInicial: Number(row[fondoIdx]),
          usuarioApertura: String(row[userApIdx])
        }
      };
    }
  }

  return { success: true, jornada: null };
}

/**
 * 4. OPEN_JORNADA: Apertura de jornada e inserción de stock inicial
 */
function handleOpenJornada(ss, payload) {
  var active = handleGetActiveJornada(ss);
  if (active.jornada) {
    return {
      success: false,
      error: 'Ya existe una jornada abierta actualmente (R1): ' + active.jornada.id,
      code: 'JORNADA_ALREADY_OPEN'
    };
  }

  var sheetJornadas = ss.getSheetByName('Jornadas');
  var sheetMov = ss.getSheetByName('Movimientos');
  var nowIso = new Date().toISOString();
  var jornadaId = 'JRN_' + Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyyMMdd_HHmmss');

  var fechaNegocio = payload.fecha || Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd');
  var fondoInicial = Number(payload.fondoInicial || 200);
  var usuario = payload.usuarioApertura || 'supervisora';

  // Registrar en Jornadas
  sheetJornadas.appendRow([
    jornadaId,
    fechaNegocio,
    'ABIERTA',
    nowIso,
    fondoInicial,
    '', // ts_cierre
    usuario,
    '', // usuario_cierre
    0,  // total_ventas_dinero
    0   // diferencia_caja
  ]);

  // Si se enviaron stocks iniciales, registrarlos como movimientos de APERTURA
  var inventarioInicial = payload.inventarioInicial || {};
  var movRows = [];
  for (var catId in inventarioInicial) {
    var cant = Number(inventarioInicial[catId]);
    if (cant > 0) {
      movRows.push([
        'MOV_AP_' + Utilities.getUuid(),
        jornadaId,
        'APERTURA',
        catId,
        cant,
        0,
        0,
        'EFECTIVO',
        '',
        'stock_inicial',
        usuario,
        payload.dispositivoId || 'GAS',
        nowIso,
        nowIso,
        'CONFIRMADO',
        'Apertura de jornada'
      ]);
    }
  }

  if (movRows.length > 0) {
    sheetMov.getRange(sheetMov.getLastRow() + 1, 1, movRows.length, movRows[0].length).setValues(movRows);
  }

  return {
    success: true,
    jornada: {
      id: jornadaId,
      fecha: fechaNegocio,
      estado: 'ABIERTA',
      tsApertura: nowIso,
      fondoInicial: fondoInicial,
      usuarioApertura: usuario
    }
  };
}

/**
 * 5. SUBMIT_MOVEMENTS: Recepción idempotente de lote de movimientos con desduplicación
 */
function handleSubmitMovements(ss, payload) {
  var sheet = ss.getSheetByName('Movimientos');
  var movements = payload.movements || [];
  if (!Array.isArray(movements) || movements.length === 0) {
    return { success: true, syncedIds: [] };
  }

  // Lectura de los últimos 1000 IDs para deduplicación idempotente
  var lastRow = sheet.getLastRow();
  var existingIds = {};
  if (lastRow > 1) {
    var sampleSize = Math.min(lastRow - 1, 1000);
    var startRow = Math.max(2, lastRow - sampleSize + 1);
    var range = sheet.getRange(startRow, 1, sampleSize, 1);
    var values = range.getValues();
    for (var i = 0; i < values.length; i++) {
      existingIds[String(values[i][0])] = true;
    }
  }

  var nowServer = new Date().toISOString();
  var rowsToInsert = [];
  var syncedIds = [];

  for (var j = 0; j < movements.length; j++) {
    var m = movements[j];
    var idMov = String(m.id_mov || m.id);

    if (existingIds[idMov]) {
      // Ya existía en servidor: confirmar recepción sin duplicar fila
      syncedIds.push(idMov);
      continue;
    }

    // Regla R17: Comprobar desfase de reloj (>15 min)
    var tsCli = m.ts_cliente || nowServer;
    var relojDesfasado = false;
    try {
      var diffMs = Math.abs(new Date(nowServer).getTime() - new Date(tsCli).getTime());
      if (diffMs > 15 * 60 * 1000) {
        relojDesfasado = true;
      }
    } catch (e) {
      relojDesfasado = false;
    }

    var notaFinal = (m.nota || '') + (relojDesfasado ? ' [RELOJ_DESFASADO]' : '');

    rowsToInsert.push([
      idMov,
      m.jornada_id || m.jornadaId,
      m.tipo,
      m.categoria_id || m.categoriaId,
      Number(m.cantidad || 1),
      Number(m.precio_unitario || m.precioUnitario || 0),
      Number(m.monto_total || m.montoTotal || 0),
      m.metodo_pago || m.metodoPago || 'EFECTIVO',
      m.ref_mov || m.refMov || '',
      m.motivo || '',
      m.usuario || 'mostrador',
      m.dispositivo_id || m.dispositivoId || '',
      tsCli,
      nowServer,
      m.estado || 'CONFIRMADO',
      notaFinal.trim()
    ]);

    existingIds[idMov] = true;
    syncedIds.push(idMov);
  }

  if (rowsToInsert.length > 0) {
    sheet.getRange(lastRow + 1, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
  }

  return { success: true, syncedIds: syncedIds };
}

/**
 * 6. CLOSE_JORNADA: Cierre guiado y liquidación de jornada
 */
function handleCloseJornada(ss, payload) {
  var sheetJornadas = ss.getSheetByName('Jornadas');
  var sheetCierres = ss.getSheetByName('Cierres');
  var sheetDetalle = ss.getSheetByName('Cierre_Detalle');
  var sheetMov = ss.getSheetByName('Movimientos');
  var nowIso = new Date().toISOString();

  var jornadaId = payload.jornadaId;
  if (!jornadaId) {
    return { success: false, error: 'jornadaId es requerido para el cierre' };
  }

  // Actualizar fila en Jornadas
  var jData = sheetJornadas.getDataRange().getValues();
  var rowIndex = -1;
  var fondoInicial = 0;
  for (var i = 1; i < jData.length; i++) {
    if (String(jData[i][0]) === jornadaId) {
      rowIndex = i + 1;
      fondoInicial = Number(jData[i][4]);
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'No se encontró la jornada: ' + jornadaId };
  }

  var efectivoContado = Number(payload.efectivoContado || 0);
  var efectivoNeto = efectivoContado - fondoInicial;

  // Registrar en Cierres
  var dineroToques = Number(payload.dineroToques || 0);
  var dineroReconstruido = Number(payload.dineroReconstruido || 0);
  var dineroEsperadoTotal = dineroToques + dineroReconstruido;
  var diferenciaFinal = efectivoNeto - dineroEsperadoTotal;

  var semaforo = 'VERDE';
  var absDiff = Math.abs(diferenciaFinal);
  if (absDiff > 30) {
    semaforo = 'ROJO';
  } else if (absDiff > 15) {
    semaforo = 'AMBAR';
  }

  sheetCierres.appendRow([
    jornadaId,
    dineroToques,
    dineroReconstruido,
    dineroEsperadoTotal,
    efectivoContado,
    fondoInicial,
    efectivoNeto,
    diferenciaFinal,
    semaforo,
    payload.notaCierre || ''
  ]);

  // Actualizar estado en Jornadas
  sheetJornadas.getRange(rowIndex, 3).setValue('CERRADA');
  sheetJornadas.getRange(rowIndex, 6).setValue(nowIso);
  sheetJornadas.getRange(rowIndex, 8).setValue(payload.usuarioCierre || 'supervisora');
  sheetJornadas.getRange(rowIndex, 9).setValue(dineroEsperadoTotal);
  sheetJornadas.getRange(rowIndex, 10).setValue(diferenciaFinal);

  // Registrar Cierre_Detalle si se proporcionaron restantes
  var restantes = payload.restantesFisicos || {};
  var detalleRows = [];
  for (var cat in restantes) {
    detalleRows.push([
      jornadaId,
      cat,
      0, // apertura
      0, // entradas
      0, // mermas
      Number(restantes[cat] || 0),
      0, // piezas_conteo
      0, // piezas_toques
      0, // piezas_diferencia
      0  // reconstruidas
    ]);
  }
  if (detalleRows.length > 0) {
    sheetDetalle.getRange(sheetDetalle.getLastRow() + 1, 1, detalleRows.length, detalleRows[0].length).setValues(detalleRows);
  }

  return {
    success: true,
    resumen: {
      jornadaId: jornadaId,
      efectivoNeto: efectivoNeto,
      dineroEsperadoTotal: dineroEsperadoTotal,
      diferenciaFinal: diferenciaFinal,
      semaforo: semaforo
    }
  };
}

/**
 * 7. VALIDATE_PIN: Validación segura de PIN en ScriptProperties con bloqueo tras 3 intentos
 */
function handleValidatePin(payload) {
  var props = PropertiesService.getScriptProperties();
  var rol = String(payload.rol || 'SUPERVISORA').toUpperCase();
  var pinIngresado = String(payload.pin || '');

  // Claves de intentos en ScriptProperties
  var failKey = 'FAIL_COUNT_' + rol;
  var lockKey = 'LOCKED_UNTIL_' + rol;

  var now = new Date().getTime();
  var lockedUntil = Number(props.getProperty(lockKey) || 0);

  if (now < lockedUntil) {
    var segRestantes = Math.ceil((lockedUntil - now) / 1000);
    return {
      success: false,
      error: 'Acceso bloqueado por intentos fallidos. Intenta nuevamente en ' + segRestantes + ' segundos.',
      code: 'PIN_LOCKED',
      segundosRestantes: segRestantes
    };
  }

  // Obtener PIN oficial configurado en ScriptProperties (con defaults seguros)
  var secretProp = (rol === 'ADMIN') ? 'PIN_ADMIN' : 'PIN_SUPERVISORA';
  var officialPin = props.getProperty(secretProp);
  if (!officialPin) {
    officialPin = (rol === 'ADMIN') ? '123456' : '1234'; // Default inicial de fábrica
  }

  if (pinIngresado === officialPin) {
    // Éxito: resetear contador de fallos
    props.deleteProperty(failKey);
    return { success: true, valido: true, rol: rol };
  } else {
    // Fallo: incrementar contador
    var fails = Number(props.getProperty(failKey) || 0) + 1;
    if (fails >= 3) {
      // Bloquear por 5 minutos (300,000 ms)
      props.setProperty(lockKey, String(now + 300000));
      props.deleteProperty(failKey);
      return {
        success: false,
        valido: false,
        error: '3 intentos incorrectos. PIN bloqueado por 5 minutos.',
        code: 'PIN_LOCKED'
      };
    } else {
      props.setProperty(failKey, String(fails));
      return {
        success: false,
        valido: false,
        intentosRestantes: 3 - fails,
        error: 'PIN incorrecto. Te quedan ' + (3 - fails) + ' intento(s).'
      };
    }
  }
}

/**
 * 8. GET_DAILY_SUMMARY: Retorna el resumen consolidado
 */
function handleGetDailySummary(ss, payload) {
  var jornadaId = payload.jornadaId;
  var sheetMov = ss.getSheetByName('Movimientos');
  var totalVentas = 0;
  var ventasPorCategoria = {};

  if (sheetMov && sheetMov.getLastRow() > 1) {
    var data = sheetMov.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var jId = String(row[1]);
      var tipo = String(row[2]);
      var cat = String(row[3]);
      var monto = Number(row[6] || 0);
      var estado = String(row[14]);

      if (estado === 'CONFIRMADO' && (!jornadaId || jId === jornadaId)) {
        if (tipo === 'VENTA' || tipo === 'RECONSTRUCCION') {
          totalVentas += monto;
          ventasPorCategoria[cat] = (ventasPorCategoria[cat] || 0) + Number(row[4] || 1);
        }
      }
    }
  }

  return {
    success: true,
    totalVentas: totalVentas,
    ventasPorCategoria: ventasPorCategoria
  };
}

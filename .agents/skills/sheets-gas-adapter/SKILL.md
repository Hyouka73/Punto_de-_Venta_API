---
name: sheets-gas-adapter
description: Definición de interfaz IDataAdapter, implementación completa de MockDataAdapter y template Code.gs de Google Apps Script.
---

# HABILIDAD: ADAPTADOR DE DATOS GOOGLE SHEETS & APPS SCRIPT

Esta habilidad proporciona a **AntiGravity** el código y las interfaces necesarias para conectar el POS con Google Sheets o simularlo en local.

---

## 🔌 Interfaz `IDataAdapter`

```typescript
export interface IDataAdapter {
  getCatalog(): Promise<CatalogResponse>;
  getParameters(): Promise<ParametersResponse>;
  getActiveJornada(): Promise<Jornada | null>;
  openJornada(data: OpenJornadaDTO): Promise<{ success: boolean; jornada: Jornada }>;
  closeJornada(data: CloseJornadaDTO): Promise<{ success: boolean; resumen: CierreResumen }>;
  submitMovements(movements: Movimiento[]): Promise<{ success: boolean; syncedIds: string[] }>;
  getDailySummary(jornadaId: string): Promise<DailySummaryResponse>;
}
```

---

## 💻 Template de Google Apps Script (`Code.gs`)

```javascript
/**
 * POS Paletería v2 — Backend Google Apps Script (Code.gs)
 */
function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  var lock = LockService.getScriptLock();
  try {
    // Espera real de hasta 10 segundos para concurrencia atómica
    lock.waitLock(10000);
    
    var data = method === 'POST' ? JSON.parse(e.postData.contents) : e.parameter;
    var action = data.action;
    var result = {};

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'GET_CATALOG') {
      result = getCatalog(ss);
    } else if (action === 'SUBMIT_MOVEMENTS') {
      result = submitMovements(ss, data.movements);
    } else if (action === 'OPEN_JORNADA') {
      result = openJornada(ss, data);
    } else if (action === 'CLOSE_JORNADA') {
      result = closeJornada(ss, data);
    } else {
      result = { error: 'Accion no reconocida' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.TEXT); // text/plain evita preflight CORS
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

function submitMovements(ss, movements) {
  var sheet = ss.getSheetByName('Movimientos');
  var syncedIds = [];
  
  // Lectura de IDs recientes para deduplicación idempotente
  var lastRow = sheet.getLastRow();
  var existingIds = {};
  if (lastRow > 1) {
    var range = sheet.getRange(Math.max(2, lastRow - 500), 1, Math.min(lastRow - 1, 500), 1);
    var values = range.getValues();
    for (var i = 0; i < values.length; i++) {
      existingIds[values[i][0]] = true;
    }
  }

  var nowServer = new Date().toISOString();
  var rowsToInsert = [];

  for (var j = 0; j < movements.length; j++) {
    var m = movements[j];
    if (existingIds[m.id_mov]) {
      syncedIds.push(m.id_mov); // Ya existe, confirma sin duplicar
      continue;
    }
    rowsToInsert.push([
      m.id_mov,
      m.jornada_id,
      m.tipo,
      m.categoria_id,
      m.cantidad,
      m.precio_unitario,
      m.monto_total,
      m.metodo_pago,
      m.ref_mov || '',
      m.motivo || '',
      m.usuario,
      m.dispositivo_id,
      m.ts_cliente,
      nowServer,
      'CONFIRMADO',
      m.nota || ''
    ]);
    syncedIds.push(m.id_mov);
  }

  if (rowsToInsert.length > 0) {
    sheet.getRange(lastRow + 1, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
  }

  return { success: true, syncedIds: syncedIds };
}
```

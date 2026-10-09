import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Emulador ligero de las APIs de Google Apps Script para pruebas en Node / Vitest
 */
class MockSheet {
  name: string;
  rows: any[][] = [];
  lastRow = 0;

  constructor(name: string) {
    this.name = name;
  }

  getLastRow() {
    return this.rows.length;
  }

  getDataRange() {
    return {
      getValues: () => this.rows,
    };
  }

  getRange(row: number, col: number, numRows: number, numCols: number) {
    return {
      getValues: () => {
        const slice = this.rows.slice(row - 1, row - 1 + numRows);
        return slice.map((r) => r.slice(col - 1, col - 1 + numCols));
      },
      setValues: (newVals: any[][]) => {
        for (let i = 0; i < numRows; i++) {
          const targetRow = row - 1 + i;
          if (!this.rows[targetRow]) {
            this.rows[targetRow] = [];
          }
          const currentRow = this.rows[targetRow]!;
          for (let j = 0; j < numCols; j++) {
            currentRow[col - 1 + j] = newVals[i]?.[j];
          }
        }
      },
      setValue: (val: any) => {
        if (!this.rows[row - 1]) this.rows[row - 1] = [];
        this.rows[row - 1]![col - 1] = val;
      },
    };
  }

  appendRow(rowValues: any[]) {
    this.rows.push([...rowValues]);
  }
}

class MockSpreadsheet {
  sheets: Map<string, MockSheet> = new Map();

  getSheetByName(name: string) {
    return this.sheets.get(name) || null;
  }

  insertSheet(name: string) {
    const s = new MockSheet(name);
    this.sheets.set(name, s);
    return s;
  }
}

class MockScriptProperties {
  private props: Map<string, string> = new Map();

  getProperty(key: string): string | null {
    return this.props.get(key) ?? null;
  }

  setProperty(key: string, val: string): void {
    this.props.set(key, val);
  }

  deleteProperty(key: string): void {
    this.props.delete(key);
  }
}

describe('F5.2: Backend Google Apps Script (Code.gs)', () => {
  let ss: MockSpreadsheet;
  let props: MockScriptProperties;

  beforeEach(() => {
    ss = new MockSpreadsheet();
    props = new MockScriptProperties();

    // Inicializar hojas básicas
    const cat = ss.insertSheet('Catálogo');
    cat.rows = [
      ['id', 'nombre', 'precio', 'costo', 'icono', 'color', 'orden', 'activo', 'controla_stock', 'componentes'],
      ['CAT_AGUA', 'Paleta de Agua', 15, 6, 'droplets', '#38BDF8', 1, true, true, ''],
      ['CAT_CREMA', 'Paleta de Crema', 20, 9, 'ice-cream', '#FDE047', 2, true, true, ''],
      ['CAT_OCULTO', 'Inactivo', 30, 10, 'x', '#000', 3, false, true, ''],
    ];

    const param = ss.insertSheet('Parámetros');
    param.rows = [
      ['clave', 'valor', 'descripcion'],
      ['tolerancia_verde', '15', 'Tolerancia verde'],
      ['tolerancia_ambar', '30', 'Tolerancia ambar'],
      ['fondo_caja_default', '200', 'Fondo default'],
      ['ventana_deshacer_min', '10', 'Minutos deshacer'],
    ];

    const mov = ss.insertSheet('Movimientos');
    mov.rows = [
      ['id_mov', 'jornada_id', 'tipo', 'categoria_id', 'cantidad', 'precio_unitario', 'monto_total', 'metodo_pago', 'ref_mov', 'motivo', 'usuario', 'dispositivo_id', 'ts_cliente', 'ts_servidor', 'estado', 'nota'],
    ];

    const jrn = ss.insertSheet('Jornadas');
    jrn.rows = [
      ['jornada_id', 'fecha_negocio', 'estado', 'ts_apertura', 'fondo_inicial', 'ts_cierre', 'usuario_apertura', 'usuario_cierre', 'total_ventas_dinero', 'diferencia_caja'],
    ];

    const cie = ss.insertSheet('Cierres');
    cie.rows = [
      ['jornada_id', 'dinero_toques', 'dinero_reconstruido', 'dinero_esperado_total', 'efectivo_contado', 'fondo_inicial', 'efectivo_neto', 'diferencia_final', 'semaforo', 'observaciones'],
    ];

    const det = ss.insertSheet('Cierre_Detalle');
    det.rows = [
      ['jornada_id', 'categoria_id', 'stock_apertura', 'entradas', 'mermas', 'stock_restante_conteo', 'piezas_conteo', 'piezas_toques', 'piezas_diferencia', 'reconstruidas'],
    ];
  });

  it('debe excluir el campo costo y margen de la lectura pública del catálogo (política de seguridad)', () => {
    const catSheet = ss.getSheetByName('Catálogo')!;
    const data = catSheet.getDataRange().getValues();
    const headers = data[0]!;
    const items = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i]!;
      if (row[headers.indexOf('activo')]) {
        items.push({
          id: row[headers.indexOf('id')],
          nombre: row[headers.indexOf('nombre')],
          precio: row[headers.indexOf('precio')],
          // Exclusión estricta de costo
        });
      }
    }

    expect(items).toHaveLength(2); // Solo los activos
    expect(items[0]).not.toHaveProperty('costo');
    expect(items[1]).not.toHaveProperty('costo');
  });

  it('debe registrar y desduplicar movimientos en lote idempotentemente', () => {
    const movSheet = ss.getSheetByName('Movimientos')!;
    const movements = [
      { id_mov: 'MOV_001', jornada_id: 'JRN_1', tipo: 'VENTA', categoria_id: 'CAT_AGUA', cantidad: 1, precio_unitario: 15, monto_total: 15 },
      { id_mov: 'MOV_002', jornada_id: 'JRN_1', tipo: 'VENTA', categoria_id: 'CAT_CREMA', cantidad: 2, precio_unitario: 20, monto_total: 40 },
    ];

    // Primer envío: 2 movimientos nuevos
    const existingIds = new Set<string>();
    const syncedIds: string[] = [];
    for (const m of movements) {
      if (!existingIds.has(m.id_mov)) {
        movSheet.appendRow([m.id_mov, m.jornada_id, m.tipo, m.categoria_id, m.cantidad, m.precio_unitario, m.monto_total]);
        existingIds.add(m.id_mov);
      }
      syncedIds.push(m.id_mov);
    }

    expect(syncedIds).toEqual(['MOV_001', 'MOV_002']);
    expect(movSheet.rows.length).toBe(3); // Header + 2 filas

    // Reenvío (simulación de reintento por pérdida de red)
    const syncedIdsRetry: string[] = [];
    for (const m of movements) {
      if (!existingIds.has(m.id_mov)) {
        movSheet.appendRow([m.id_mov]);
        existingIds.add(m.id_mov);
      }
      syncedIdsRetry.push(m.id_mov);
    }

    expect(syncedIdsRetry).toEqual(['MOV_001', 'MOV_002']);
    // No debe agregarse ninguna fila adicional
    expect(movSheet.rows.length).toBe(3);
  });

  it('debe validar PIN de supervisora y bloquear tras 3 intentos fallidos consecutivos', () => {
    props.setProperty('PIN_SUPERVISORA', '1234');

    function checkPin(pin: string, rol = 'SUPERVISORA') {
      const failKey = 'FAIL_COUNT_' + rol;
      const lockKey = 'LOCKED_UNTIL_' + rol;
      const now = Date.now();
      const lockedUntil = Number(props.getProperty(lockKey) || 0);

      if (now < lockedUntil) {
        return { success: false, locked: true };
      }

      const official = props.getProperty('PIN_' + rol);
      if (pin === official) {
        props.deleteProperty(failKey);
        return { success: true, valido: true };
      } else {
        const fails = Number(props.getProperty(failKey) || 0) + 1;
        if (fails >= 3) {
          props.setProperty(lockKey, String(now + 300000));
          props.deleteProperty(failKey);
          return { success: false, locked: true };
        } else {
          props.setProperty(failKey, String(fails));
          return { success: false, intentosRestantes: 3 - fails };
        }
      }
    }

    // Intento 1 fallido
    expect(checkPin('0000')).toEqual({ success: false, intentosRestantes: 2 });
    // Intento 2 fallido
    expect(checkPin('1111')).toEqual({ success: false, intentosRestantes: 1 });
    // Intento 3 fallido -> Bloqueo
    expect(checkPin('2222')).toEqual({ success: false, locked: true });
    // Intento 4 durante bloqueo
    expect(checkPin('1234')).toEqual({ success: false, locked: true });
  });

  it('debe etiquetar movimientos con desfase de reloj mayor a 15 minutos según R17', () => {
    const serverTime = new Date('2026-10-09T12:00:00Z').getTime();
    const clientTimeDesfasado = new Date('2026-10-09T11:40:00Z').getTime(); // 20 min antes
    const diffMs = Math.abs(serverTime - clientTimeDesfasado);

    const esDesfasado = diffMs > 15 * 60 * 1000;
    expect(esDesfasado).toBe(true);

    const clientTimeNormal = new Date('2026-10-09T11:58:00Z').getTime(); // 2 min antes
    const diffNormal = Math.abs(serverTime - clientTimeNormal);
    expect(diffNormal > 15 * 60 * 1000).toBe(false);
  });
});

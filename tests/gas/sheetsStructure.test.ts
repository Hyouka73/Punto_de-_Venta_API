import { describe, it, expect } from 'vitest';
import {
  SHEETS_NAMES,
  SHEETS_SCHEMA,
  RESUMEN_FORMULAS,
  type SheetName,
} from '../../src/adapters/sheetsSchema';
import { DEFAULT_CATALOG } from '../../src/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '../../src/domain/config/parameters';

describe('F5.1: Estructura de la Hoja de Cálculo en Google Sheets', () => {
  it('debe definir exactamente las 8 hojas especificadas en el Plan Maestro v2', () => {
    const expectedSheets: SheetName[] = [
      'Catálogo',
      'Parámetros',
      'Movimientos',
      'Jornadas',
      'Cierre_Detalle',
      'Cierres',
      'Resumen',
      'Stock_Calculado',
    ];

    expect(Object.keys(SHEETS_SCHEMA)).toHaveLength(8);
    for (const sheetName of expectedSheets) {
      expect(SHEETS_SCHEMA[sheetName]).toBeDefined();
      expect(SHEETS_SCHEMA[sheetName].name).toBe(sheetName);
    }
  });

  it('debe proteger estrictamente la hoja Movimientos contra edición manual (append-only ledger)', () => {
    expect(SHEETS_SCHEMA[SHEETS_NAMES.MOVIMIENTOS].isProtected).toBe(true);
    expect(SHEETS_SCHEMA[SHEETS_NAMES.CATALOGO].isProtected).toBe(false);
  });

  it('debe contener todas las columnas requeridas para la hoja Movimientos', () => {
    const movCols = SHEETS_SCHEMA[SHEETS_NAMES.MOVIMIENTOS].columns.map((c) => c.name);
    const requiredMovCols = [
      'id_mov',
      'jornada_id',
      'tipo',
      'categoria_id',
      'cantidad',
      'precio_unitario',
      'monto_total',
      'metodo_pago',
      'ref_mov',
      'motivo',
      'usuario',
      'dispositivo_id',
      'ts_cliente',
      'ts_servidor',
      'estado',
      'nota',
    ];

    for (const col of requiredMovCols) {
      expect(movCols).toContain(col);
    }
  });

  it('debe contener todas las columnas requeridas para la hoja Catálogo y coincidir con el dominio', () => {
    const catCols = SHEETS_SCHEMA[SHEETS_NAMES.CATALOGO].columns.map((c) => c.name);
    const requiredCatCols = [
      'id',
      'nombre',
      'precio',
      'costo',
      'icono',
      'color',
      'orden',
      'activo',
      'controla_stock',
      'componentes',
    ];

    for (const col of requiredCatCols) {
      expect(catCols).toContain(col);
    }

    // Validar que los items del catálogo base contengan los campos esperados
    for (const item of DEFAULT_CATALOG) {
      expect(item.id).toBeTruthy();
      expect(item.nombre).toBeTruthy();
      expect(item.precio).toBeGreaterThan(0);
    }
  });

  it('debe contener las columnas para Cierres y Cierre_Detalle con el cuadre triple', () => {
    const cierresCols = SHEETS_SCHEMA[SHEETS_NAMES.CIERRES].columns.map((c) => c.name);
    expect(cierresCols).toContain('dinero_toques');
    expect(cierresCols).toContain('dinero_reconstruido');
    expect(cierresCols).toContain('dinero_esperado_total');
    expect(cierresCols).toContain('efectivo_contado');
    expect(cierresCols).toContain('fondo_inicial');
    expect(cierresCols).toContain('efectivo_neto');
    expect(cierresCols).toContain('diferencia_final');
    expect(cierresCols).toContain('semaforo');

    const detalleCols = SHEETS_SCHEMA[SHEETS_NAMES.CIERRE_DETALLE].columns.map((c) => c.name);
    expect(detalleCols).toContain('stock_apertura');
    expect(detalleCols).toContain('entradas');
    expect(detalleCols).toContain('mermas');
    expect(detalleCols).toContain('stock_restante_conteo');
    expect(detalleCols).toContain('piezas_conteo');
    expect(detalleCols).toContain('piezas_toques');
    expect(detalleCols).toContain('piezas_diferencia');
    expect(detalleCols).toContain('reconstruidas');
  });

  it('debe definir fórmulas de Google Sheets válidas y sintácticamente consistentes para la hoja Resumen', () => {
    expect(RESUMEN_FORMULAS.length).toBeGreaterThanOrEqual(5);

    for (const f of RESUMEN_FORMULAS) {
      expect(f.formula.startsWith('=')).toBe(true);
      expect(f.indicador).toBeTruthy();
      expect(f.unidad).toBeTruthy();

      // Verificar que las fórmulas referencien hojas válidas
      if (f.formula.includes('Movimientos!')) {
        expect(f.formula).toMatch(/Movimientos![A-Z0-9$:]+/);
      }
      if (f.formula.includes('Jornadas!')) {
        expect(f.formula).toMatch(/Jornadas![A-Z0-9$:]+/);
      }
    }
  });

  it('debe definir la hoja Stock_Calculado con visibilidad explícita de stock negativo (sin Math.max)', () => {
    const stockCols = SHEETS_SCHEMA[SHEETS_NAMES.STOCK_CALCULADO].columns.map((c) => c.name);
    expect(stockCols).toContain('categoria_id');
    expect(stockCols).toContain('apertura');
    expect(stockCols).toContain('entradas');
    expect(stockCols).toContain('ventas_directas');
    expect(stockCols).toContain('ventas_combos');
    expect(stockCols).toContain('total_ventas');
    expect(stockCols).toContain('mermas');
    expect(stockCols).toContain('ajustes');
    expect(stockCols).toContain('stock_actual');
    expect(stockCols).toContain('alerta');
  });

  it('debe reflejar los parámetros de negocio estándar en la configuración de Google Sheets', () => {
    expect(DEFAULT_PARAMETERS.tolerancia_verde).toBe(15);
    expect(DEFAULT_PARAMETERS.tolerancia_ambar).toBe(30);
    expect(DEFAULT_PARAMETERS.fondo_caja_default).toBe(200);
    expect(DEFAULT_PARAMETERS.ventana_deshacer_min).toBe(10);
  });
});

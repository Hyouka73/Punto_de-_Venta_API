import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SheetsAppsScriptAdapter,
  createDataAdapter,
  MockDataAdapter,
} from '../../src/adapters';
import type { Movimiento } from '../../src/domain/types';

describe('F5.3: Implementación de SheetsAppsScriptAdapter', () => {
  const dummyUrl = 'https://script.google.com/macros/s/AKfycbx_dummy/exec';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('debe conmutar dinámicamente entre MockDataAdapter y SheetsAppsScriptAdapter', () => {
    const mockInst = createDataAdapter('mock');
    expect(mockInst).toBeInstanceOf(MockDataAdapter);

    const sheetsInst = createDataAdapter('sheets');
    expect(sheetsInst).toBeInstanceOf(SheetsAppsScriptAdapter);
  });

  it('debe arrojar error si se intenta realizar una petición sin URL configurada', async () => {
    const adapter = new SheetsAppsScriptAdapter({ webappUrl: '' });
    await expect(adapter.getCatalog()).rejects.toThrow(
      'La URL del backend de Google Apps Script no está configurada'
    );
  });

  it('debe enviar peticiones POST con Content-Type: text/plain para evitar preflight CORS', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true, items: [{ id: 'CAT_AGUA', nombre: 'Agua', precio: 15 }] }),
    });

    const adapter = new SheetsAppsScriptAdapter({
      webappUrl: dummyUrl,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const result = await adapter.getCatalog();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('CAT_AGUA');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(calledUrl).toBe(dummyUrl);
    expect(calledInit.method).toBe('POST');
    expect(calledInit.headers['Content-Type']).toContain('text/plain');
    expect(calledInit.redirect).toBe('follow');

    const bodyObj = JSON.parse(calledInit.body as string);
    expect(bodyObj.action).toBe('GET_CATALOG');
  });

  it('debe enviar lote de movimientos y recibir confirmación de desduplicación', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true, syncedIds: ['MOV_001', 'MOV_002'] }),
    });

    const adapter = new SheetsAppsScriptAdapter({
      webappUrl: dummyUrl,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const sampleMovements: Movimiento[] = [
      {
        id_mov: 'MOV_001',
        jornada_id: 'JRN_100',
        tipo: 'VENTA',
        categoria_id: 'CAT_AGUA',
        cantidad: 1,
        precio_unitario: 15,
        monto_total: 15,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'tel-1',
        ts_cliente: new Date().toISOString(),
        estado_sincronizacion: 'CONFIRMADO',
      },
      {
        id_mov: 'MOV_002',
        jornada_id: 'JRN_100',
        tipo: 'VENTA',
        categoria_id: 'CAT_CREMA',
        cantidad: 2,
        precio_unitario: 20,
        monto_total: 40,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'tel-1',
        ts_cliente: new Date().toISOString(),
        estado_sincronizacion: 'CONFIRMADO',
      },
    ];

    const res = await adapter.submitMovements(sampleMovements);
    expect(res.success).toBe(true);
    expect(res.syncedIds).toEqual(['MOV_001', 'MOV_002']);

    const callInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
    const bodyObj = JSON.parse(callInit.body as string);
    expect(bodyObj.action).toBe('SUBMIT_MOVEMENTS');
    expect(bodyObj.movements).toHaveLength(2);
  });

  it('debe manejar apertura y cierre de jornada contra Google Apps Script', async () => {
    const mockFetch = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(init.body);
      if (body.action === 'OPEN_JORNADA') {
        return {
          ok: true,
          text: async () => JSON.stringify({
            success: true,
            jornada: {
              id: 'JRN_NEW_01',
              fecha: '2026-10-09',
              estado: 'ABIERTA',
              ts_apertura: '2026-10-09T08:00:00Z',
              fondo_inicial: 200,
              usuario_apertura: 'supervisora',
              inventario_inicial: {},
            },
          }),
        };
      }
      if (body.action === 'CLOSE_JORNADA') {
        return {
          ok: true,
          text: async () => JSON.stringify({
            success: true,
            resumen: {
              jornada_id: 'JRN_NEW_01',
              fecha: '2026-10-09',
              ts_cierre: '2026-10-09T22:00:00Z',
              usuario_cierre: 'supervisora',
              fondo_inicial: 200,
              efectivo_contado: 700,
              efectivo_neto: 500,
              ventas_efectivo: 500,
              ventas_transferencia: 0,
              reconstrucciones_total: 0,
              dinero_esperado: 500,
              diferencia_final: 0,
              semaforo: 'VERDE',
              detalles_por_categoria: [],
              explicaciones: ['Cuadre exacto'],
              total_piezas_conteo: 20,
              total_piezas_toques: 20,
              total_mermas: 0,
              total_consumo_casa: 0,
            },
          }),
        };
      }
      return { ok: false, status: 400 };
    });

    const adapter = new SheetsAppsScriptAdapter({
      webappUrl: dummyUrl,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const openRes = await adapter.openJornada({
      fecha: '2026-10-09',
      fondoInicial: 200,
      inventarioInicial: { CAT_AGUA: 50 },
      usuarioApertura: 'supervisora',
    });
    expect(openRes.success).toBe(true);
    expect(openRes.jornada.id).toBe('JRN_NEW_01');

    const closeRes = await adapter.closeJornada({
      jornadaId: 'JRN_NEW_01',
      usuarioCierre: 'supervisora',
      efectivoContado: 700,
      restantesFisicos: { CAT_AGUA: 20 },
    });
    expect(closeRes.success).toBe(true);
    expect(closeRes.resumen.semaforo).toBe('VERDE');
    expect(closeRes.resumen.diferencia_final).toBe(0);
  });

  it('debe validar PIN de supervisora o administrador', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true, valido: true, rol: 'SUPERVISORA' }),
    });

    const adapter = new SheetsAppsScriptAdapter({
      webappUrl: dummyUrl,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const pinRes = await adapter.validatePin('1234', 'SUPERVISORA');
    expect(pinRes.success).toBe(true);
    expect(pinRes.valido).toBe(true);
    expect(pinRes.rol).toBe('SUPERVISORA');
  });

  it('debe propagar errores de servidor descriptivos sin fallar silenciosamente', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: false, error: 'Ya existe una jornada abierta actualmente' }),
    });

    const adapter = new SheetsAppsScriptAdapter({
      webappUrl: dummyUrl,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    await expect(
      adapter.openJornada({
        fecha: '2026-10-09',
        fondoInicial: 200,
        inventarioInicial: {},
        usuarioApertura: 'supervisora',
      })
    ).rejects.toThrow('Ya existe una jornada abierta actualmente');
  });
});

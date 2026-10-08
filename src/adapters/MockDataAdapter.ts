import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_CATALOG } from '../domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '../domain/config/parameters';
import type { CatalogoItem, ParametrosNegocio } from '../domain/config/types';
import type {
  CatalogResponse,
  CloseJornadaDTO,
  DailySummaryResponse,
  IDataAdapter,
  OpenJornadaDTO,
  ParametersResponse,
} from '../domain/ports/IDataAdapter';
import { calculateStockFromMovements } from '../domain/rules/calculateStock';
import { expandCombo } from '../domain/rules/expandCombo';
import { reconcileClosing } from '../domain/rules/reconcileClosing';
import type { CierreResumen, Jornada, Movimiento } from '../domain/types';

export interface MockDataAdapterOptions {
  simulatedDelayMs?: number;
  simulateFailures?: boolean;
}

/**
 * Adaptador de Datos Simulado en Memoria (MockDataAdapter).
 *
 * Implementa IDataAdapter para desarrollo 100% local sin depender de red ni Google Sheets.
 * Mantiene la regla inmutable de solo-agregación (append-only) y deduplicación por UUID v4.
 */
export class MockDataAdapter implements IDataAdapter {
  private catalog: CatalogoItem[] = [...DEFAULT_CATALOG];
  private parameters: ParametrosNegocio = { ...DEFAULT_PARAMETERS };
  private movements: Movimiento[] = [];
  private activeJornada: Jornada | null = null;
  private closedJornadas: Map<string, { jornada: Jornada; resumen: CierreResumen }> = new Map();

  private delayMs: number;
  private simulateFailures: boolean;

  constructor(options?: MockDataAdapterOptions) {
    this.delayMs = options?.simulatedDelayMs ?? 0;
    this.simulateFailures = options?.simulateFailures ?? false;
  }

  private async simulateNetwork(): Promise<void> {
    if (this.simulateFailures) {
      throw new Error('Fallo de red simulado (MockDataAdapter)');
    }
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
  }

  public setDelay(delayMs: number): void {
    this.delayMs = delayMs;
  }

  public setSimulateFailures(fail: boolean): void {
    this.simulateFailures = fail;
  }

  public async getCatalog(): Promise<CatalogResponse> {
    await this.simulateNetwork();
    return {
      items: [...this.catalog],
      version: this.parameters.schema_version,
    };
  }

  public async getParameters(): Promise<ParametersResponse> {
    await this.simulateNetwork();
    return {
      parameters: { ...this.parameters },
    };
  }

  public async getActiveJornada(): Promise<Jornada | null> {
    await this.simulateNetwork();
    return this.activeJornada ? { ...this.activeJornada } : null;
  }

  public async openJornada(data: OpenJornadaDTO): Promise<{ success: boolean; jornada: Jornada }> {
    await this.simulateNetwork();

    if (this.activeJornada && this.activeJornada.estado === 'ABIERTA') {
      throw new Error('Ya existe una jornada activa abierta. Complete el cierre primero (R1).');
    }

    const jornadaId = `JOR-${data.fecha}-${Date.now().toString(36).toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const nuevaJornada: Jornada = {
      id: jornadaId,
      fecha: data.fecha,
      estado: 'ABIERTA',
      ts_apertura: nowIso,
      fondo_inicial: data.fondoInicial,
      usuario_apertura: data.usuarioApertura,
      inventario_inicial: { ...data.inventarioInicial },
      nota_apertura: data.notaApertura,
    };

    this.activeJornada = nuevaJornada;

    // Registrar movimiento de apertura inmutable
    const movApertura: Movimiento = {
      id_mov: uuidv4(),
      jornada_id: jornadaId,
      tipo: 'APERTURA',
      categoria_id: 'SISTEMA',
      cantidad: 0,
      precio_unitario: 0,
      monto_total: data.fondoInicial,
      metodo_pago: 'EFECTIVO',
      usuario: data.usuarioApertura,
      dispositivo_id: 'DISP-MOCK',
      ts_cliente: nowIso,
      ts_servidor: nowIso,
      estado_sincronizacion: 'CONFIRMADO',
      nota: data.notaApertura,
    };

    this.movements.push(movApertura);

    return { success: true, jornada: nuevaJornada };
  }

  public async submitMovements(
    movements: readonly Movimiento[]
  ): Promise<{ success: boolean; syncedIds: string[] }> {
    await this.simulateNetwork();

    const existingIds = new Set(this.movements.map((m) => m.id_mov));
    const syncedIds: string[] = [];
    const nowServer = new Date().toISOString();

    for (const mov of movements) {
      if (existingIds.has(mov.id_mov)) {
        // Idempotencia: Si ya fue registrado, lo confirmamos sin duplicarlo
        syncedIds.push(mov.id_mov);
        continue;
      }

      const confirmedMov: Movimiento = {
        ...mov,
        ts_servidor: nowServer,
        estado_sincronizacion: 'CONFIRMADO',
      };

      this.movements.push(confirmedMov);
      existingIds.add(mov.id_mov);
      syncedIds.push(mov.id_mov);
    }

    return { success: true, syncedIds };
  }

  public async closeJornada(
    data: CloseJornadaDTO
  ): Promise<{ success: boolean; resumen: CierreResumen }> {
    await this.simulateNetwork();

    if (!this.activeJornada || this.activeJornada.id !== data.jornadaId) {
      throw new Error(`Jornada con ID ${data.jornadaId} no está activa o ya fue cerrada.`);
    }

    const nowIso = new Date().toISOString();
    const movsJornada = this.movements.filter((m) => m.jornada_id === data.jornadaId);

    const resumen = reconcileClosing({
      jornadaId: data.jornadaId,
      fecha: this.activeJornada.fecha,
      usuarioCierre: data.usuarioCierre,
      fondoInicial: this.activeJornada.fondo_inicial,
      inventarioInicial: this.activeJornada.inventario_inicial,
      entradas: data.entradas,
      mermas: data.mermas,
      restantesFisicos: data.restantesFisicos,
      movimientos: movsJornada,
      efectivoContado: data.efectivoContado,
      parametros: this.parameters,
      catalogo: this.catalog,
      tsCierre: nowIso,
    });

    const jornadaCerrada: Jornada = {
      ...this.activeJornada,
      estado: 'CERRADA',
      ts_cierre: nowIso,
      usuario_cierre: data.usuarioCierre,
      nota_cierre: data.notaCierre,
    };

    this.closedJornadas.set(data.jornadaId, {
      jornada: jornadaCerrada,
      resumen,
    });

    this.activeJornada = null;

    return { success: true, resumen };
  }

  public async getDailySummary(jornadaId: string): Promise<DailySummaryResponse> {
    await this.simulateNetwork();

    const jornada =
      this.activeJornada?.id === jornadaId
        ? this.activeJornada
        : this.closedJornadas.get(jornadaId)?.jornada;

    if (!jornada) {
      throw new Error(`Jornada ${jornadaId} no encontrada.`);
    }

    const movsJornada = this.movements.filter((m) => m.jornada_id === jornadaId);
    let totalVentas = 0;
    const ventasPorCategoria: Record<string, number> = {};

    for (const m of movsJornada) {
      if (m.tipo === 'VENTA' || m.tipo === 'RECONSTRUCCION') {
        totalVentas += m.monto_total;
        const comps = expandCombo(m.categoria_id, m.cantidad, this.catalog);
        for (const c of comps) {
          ventasPorCategoria[c.categoriaId] =
            (ventasPorCategoria[c.categoriaId] ?? 0) + c.cantidad;
        }
      }
    }

    const stockActual = calculateStockFromMovements(
      movsJornada,
      jornada.inventario_inicial,
      this.catalog
    );

    const resumenCierre = this.closedJornadas.get(jornadaId)?.resumen;

    return {
      jornada,
      totalVentas,
      ventasPorCategoria,
      resumenCierre,
      stockActual,
    };
  }

  /**
   * Generador de jornada simulada (150 ventas realistas, combos, mermas y entradas)
   * para pruebas automatizadas de estrés y validación sin dependencias externas.
   */
  public async generateSimulatedDay(ventasCount: number = 150): Promise<{
    jornada: Jornada;
    movimientosGenerados: number;
    resumen: CierreResumen;
  }> {
    // 1. Apertura con stock suficiente
    const inventarioInicial: Record<string, number> = {
      CAT_AGUA: 100,
      CAT_CREMA: 100,
      CAT_SANDWICH: 60,
      CAT_NIEVE: 50,
    };

    const { jornada } = await this.openJornada({
      fecha: '2026-10-08',
      fondoInicial: 200,
      inventarioInicial,
      usuarioApertura: 'supervisora',
      notaApertura: 'Apertura de simulación',
    });

    // 2. Generar 150 ventas distribuidas
    const categoriasIds = ['CAT_AGUA', 'CAT_CREMA', 'CAT_SANDWICH', 'CAT_NIEVE', 'CMB_DUO'];
    const catalogMap = new Map(this.catalog.map((c) => [c.id, c]));

    const movimientosSimulados: Movimiento[] = [];
    const baseTime = Date.now();

    for (let i = 0; i < ventasCount; i++) {
      const catId = categoriasIds[i % categoriasIds.length]!;
      const cat = catalogMap.get(catId)!;
      const isTransfer = i % 15 === 0; // Cada 15 ventas, una por transferencia

      const mov: Movimiento = {
        id_mov: uuidv4(),
        jornada_id: jornada.id,
        tipo: 'VENTA',
        categoria_id: catId,
        cantidad: 1,
        precio_unitario: cat.precio,
        monto_total: cat.precio,
        metodo_pago: isTransfer ? 'TRANSFERENCIA' : 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'DISP-MOCK-01',
        ts_cliente: new Date(baseTime + i * 60_000).toISOString(),
      };

      movimientosSimulados.push(mov);
    }

    // Agregar 2 anulaciones de ventas previas
    const venta1 = movimientosSimulados[5]!;
    const venta2 = movimientosSimulados[20]!;
    movimientosSimulados.push({
      id_mov: uuidv4(),
      jornada_id: jornada.id,
      tipo: 'ANULACION',
      ref_mov: venta1.id_mov,
      categoria_id: venta1.categoria_id,
      cantidad: venta1.cantidad,
      precio_unitario: venta1.precio_unitario,
      monto_total: venta1.monto_total,
      metodo_pago: venta1.metodo_pago,
      usuario: 'mostrador',
      dispositivo_id: 'DISP-MOCK-01',
      ts_cliente: new Date(baseTime + 100 * 60_000).toISOString(),
    });
    movimientosSimulados.push({
      id_mov: uuidv4(),
      jornada_id: jornada.id,
      tipo: 'ANULACION',
      ref_mov: venta2.id_mov,
      categoria_id: venta2.categoria_id,
      cantidad: venta2.cantidad,
      precio_unitario: venta2.precio_unitario,
      monto_total: venta2.monto_total,
      metodo_pago: venta2.metodo_pago,
      usuario: 'mostrador',
      dispositivo_id: 'DISP-MOCK-01',
      ts_cliente: new Date(baseTime + 105 * 60_000).toISOString(),
    });

    // Agregar 1 merma y 1 entrada
    movimientosSimulados.push({
      id_mov: uuidv4(),
      jornada_id: jornada.id,
      tipo: 'MERMA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 15,
      monto_total: 0,
      metodo_pago: 'EFECTIVO',
      motivo: 'palo_roto_deforme',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-MOCK-01',
      ts_cliente: new Date(baseTime + 110 * 60_000).toISOString(),
    });

    movimientosSimulados.push({
      id_mov: uuidv4(),
      jornada_id: jornada.id,
      tipo: 'ENTRADA',
      categoria_id: 'CAT_CREMA',
      cantidad: 20,
      precio_unitario: 20,
      monto_total: 0,
      metodo_pago: 'EFECTIVO',
      usuario: 'supervisora',
      dispositivo_id: 'DISP-MOCK-01',
      ts_cliente: new Date(baseTime + 120 * 60_000).toISOString(),
    });

    // Simular envío por lotes (3 lotes como cortes de red)
    const chunkSize = 50;
    for (let i = 0; i < movimientosSimulados.length; i += chunkSize) {
      const chunk = movimientosSimulados.slice(i, i + chunkSize);
      await this.submitMovements(chunk);
    }

    // Calcular existencias para realizar un cierre perfecto
    const stockActual = calculateStockFromMovements(
      this.movements.filter((m) => m.jornada_id === jornada.id),
      inventarioInicial,
      this.catalog
    );

    const restantesFisicos: Record<string, number> = {};
    for (const [k, v] of Object.entries(stockActual)) {
      restantesFisicos[k] = v.stockActual;
    }

    // Calcular efectivo en caja: fondo + ventas efectivas en efectivo
    await this.getDailySummary(jornada.id);
    let efectivoEsperadoEnCaja = jornada.fondo_inicial;

    const anuladosSet = new Set([venta1.id_mov, venta2.id_mov]);
    for (const m of movimientosSimulados) {
      if (m.tipo === 'VENTA' && !anuladosSet.has(m.id_mov) && m.metodo_pago === 'EFECTIVO') {
        efectivoEsperadoEnCaja += m.monto_total;
      }
    }

    // Cierre
    const { resumen } = await this.closeJornada({
      jornadaId: jornada.id,
      usuarioCierre: 'supervisora',
      efectivoContado: efectivoEsperadoEnCaja,
      restantesFisicos,
    });

    return {
      jornada,
      movimientosGenerados: movimientosSimulados.length,
      resumen,
    };
  }
}

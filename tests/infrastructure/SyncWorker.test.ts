import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineQueue } from '@/infrastructure/offline/OfflineQueue';
import { SyncWorker } from '@/infrastructure/offline/SyncWorker';
import { MockDataAdapter } from '@/adapters/MockDataAdapter';

describe('Sincronizador Monohilo y Resiliencia Offline - Nivel B (F2.3)', () => {
  let queue: OfflineQueue;
  let adapter: MockDataAdapter;
  let worker: SyncWorker;

  beforeEach(async () => {
    queue = new OfflineQueue();
    await queue.clear();
    adapter = new MockDataAdapter({ simulatedDelayMs: 0 });

    // Iniciar jornada en el adaptador para aceptar movimientos
    await adapter.openJornada({
      fecha: '2026-10-08',
      fondoInicial: 200,
      inventarioInicial: { CAT_AGUA: 100, CAT_CREMA: 100 },
      usuarioApertura: 'supervisora',
    });

    worker = new SyncWorker({
      queue,
      adapter,
      batchSize: 10,
      baseRetryDelayMs: 50,
      pollIntervalMs: 1000,
    });
  });

  it('debe transmitir movimientos encolados y retirarlos tras confirmación exitosa', async () => {
    // Encolar 3 ventas en modo offline
    for (let i = 0; i < 3; i++) {
      await queue.enqueue({
        jornada_id: 'JOR-TEST',
        tipo: 'VENTA',
        categoria_id: 'CAT_AGUA',
        cantidad: 1,
        precio_unitario: 15,
        monto_total: 15,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'DISP-01',
      });
    }

    expect(await queue.getPendingCount()).toBe(3);

    // Disparar sincronización
    const result = await worker.triggerSync();
    expect(result.syncedCount).toBe(3);
    expect(result.remainingCount).toBe(0);

    // La cola local debe quedar vacía
    expect(await queue.getPendingCount()).toBe(0);
  });

  it('Garantía de Mutex Monohilo: peticiones simultáneas concurrentes no se duplican', async () => {
    // Configurar retraso artificial en el adaptador para emular latencia de red
    adapter.setDelay(80);

    await queue.enqueue({
      jornada_id: 'JOR-TEST',
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 15,
      monto_total: 15,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
    });

    // Disparar 5 sincronizaciones simultáneas concurrentes
    const promises = [
      worker.triggerSync(),
      worker.triggerSync(),
      worker.triggerSync(),
      worker.triggerSync(),
      worker.triggerSync(),
    ];

    const results = await Promise.all(promises);

    // Solo una debe haber realizado el envío (syncedCount = 1), las demás bloqueadas por Mutex
    const totalSynced = results.reduce((sum, r) => sum + r.syncedCount, 0);
    expect(totalSynced).toBe(1);

    adapter.setDelay(0);
  });

  it('PRUEBA DE NIVEL B: 20 ventas acumuladas sin red y reconexión masiva sin duplicados', async () => {
    // 1. Simular caída de red prolongada
    worker.setOnline(false);

    // Registrar 20 ventas en la cola local
    for (let i = 0; i < 20; i++) {
      await queue.enqueue({
        jornada_id: 'JOR-TEST',
        tipo: 'VENTA',
        categoria_id: i % 2 === 0 ? 'CAT_AGUA' : 'CAT_CREMA',
        cantidad: 1,
        precio_unitario: i % 2 === 0 ? 15 : 20,
        monto_total: i % 2 === 0 ? 15 : 20,
        metodo_pago: 'EFECTIVO',
        usuario: 'mostrador',
        dispositivo_id: 'DISP-MOCK-01',
        ts_cliente: new Date(Date.now() + i * 1000).toISOString(),
      });
    }

    expect(await queue.getPendingCount()).toBe(20);

    // Intentar sincronizar sin red debe no enviar nada
    const resOffline = await worker.triggerSync();
    expect(resOffline.syncedCount).toBe(0);
    expect(resOffline.remainingCount).toBe(20);

    // 2. Reconexión de red: se activa online
    worker.setOnline(true);

    // Esperar a que los lotes de 10 en 10 se procesen por completo
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Validar que toda la cola se sincronizó
    expect(await queue.getPendingCount()).toBe(0);

    const status = await worker.getStatus();
    expect(status.isOnline).toBe(true);
    expect(status.pendingCount).toBe(0);
    expect(status.consecutiveFailures).toBe(0);
  });

  it('debe incrementar contador de fallas ante errores de red del adaptador', async () => {
    adapter.setSimulateFailures(true);

    await queue.enqueue({
      jornada_id: 'JOR-TEST',
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 15,
      monto_total: 15,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
    });

    await worker.triggerSync();

    const status = await worker.getStatus();
    expect(status.consecutiveFailures).toBe(1);
    expect(status.lastError).toContain('Fallo de red simulado');

    // La venta debe seguir en la cola esperando reintento
    expect(await queue.getPendingCount()).toBe(1);

    adapter.setSimulateFailures(false);
  });
});

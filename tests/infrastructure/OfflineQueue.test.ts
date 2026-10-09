import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineQueue } from '@/infrastructure/offline/OfflineQueue';

describe('Cola Offline con IndexedDB e Idempotencia (OfflineQueue - F2.2)', () => {
  let queue: OfflineQueue;

  beforeEach(async () => {
    queue = new OfflineQueue();
    await queue.clear();
  });

  it('debe encolar un movimiento generando automáticamente un UUID v4 e ISO timestamp', async () => {
    const item = await queue.enqueue({
      jornada_id: 'JOR-2026-10-08-01',
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 15,
      monto_total: 15,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
    });

    expect(item.id_mov).toBeDefined();
    // Validar formato UUID v4
    expect(item.id_mov).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(item.sync_status).toBe('PENDING');
    expect(item.retry_count).toBe(0);
    expect(item.ts_cliente).toBeDefined();
  });

  it('debe recuperar elementos pendientes en orden cronológico ascendente (FIFO)', async () => {
    const t1 = '2026-10-08T10:00:00.000Z';
    const t2 = '2026-10-08T10:05:00.000Z';
    const t3 = '2026-10-08T10:10:00.000Z';

    // Insertar en desorden
    await queue.enqueue({
      jornada_id: 'JOR-1',
      tipo: 'VENTA',
      categoria_id: 'CAT_CREMA',
      cantidad: 1,
      precio_unitario: 20,
      monto_total: 20,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
      ts_cliente: t2,
    });

    await queue.enqueue({
      jornada_id: 'JOR-1',
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 15,
      monto_total: 15,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
      ts_cliente: t1,
    });

    await queue.enqueue({
      jornada_id: 'JOR-1',
      tipo: 'VENTA',
      categoria_id: 'CAT_SANDWICH',
      cantidad: 1,
      precio_unitario: 25,
      monto_total: 25,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
      ts_cliente: t3,
    });

    const pending = await queue.getPending(10);
    expect(pending.length).toBe(3);
    expect(pending[0]?.ts_cliente).toBe(t1);
    expect(pending[1]?.ts_cliente).toBe(t2);
    expect(pending[2]?.ts_cliente).toBe(t3);
  });

  it('debe cambiar el estado a SYNCING y manejar reintentos tras fallo con markFailed', async () => {
    const item = await queue.enqueue({
      jornada_id: 'JOR-1',
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 15,
      monto_total: 15,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
    });

    await queue.markSyncing([item.id_mov]);
    let retrieved = await queue.getMovement(item.id_mov);
    expect(retrieved?.sync_status).toBe('SYNCING');

    // Al fallar, incrementa retry_count y vuelve a PENDING
    await queue.markFailed([item.id_mov], 'Timeout de red');
    retrieved = await queue.getMovement(item.id_mov);
    expect(retrieved?.sync_status).toBe('PENDING');
    expect(retrieved?.retry_count).toBe(1);
    expect(retrieved?.last_error).toBe('Timeout de red');
  });

  it('debe retirar de la cola estrictamente los elementos confirmados por el servidor (removeSynced)', async () => {
    const item1 = await queue.enqueue({
      jornada_id: 'JOR-1',
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 15,
      monto_total: 15,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
    });

    const item2 = await queue.enqueue({
      jornada_id: 'JOR-1',
      tipo: 'VENTA',
      categoria_id: 'CAT_CREMA',
      cantidad: 1,
      precio_unitario: 20,
      monto_total: 20,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
    });

    expect(await queue.getPendingCount()).toBe(2);

    // Servidor solo confirma item1
    await queue.removeSynced([item1.id_mov]);

    expect(await queue.getMovement(item1.id_mov)).toBeUndefined();
    expect(await queue.getMovement(item2.id_mov)).toBeDefined();
    expect(await queue.getPendingCount()).toBe(1);
  });

  it('debe filtrar movimientos por jornada correctamente', async () => {
    await queue.enqueue({
      jornada_id: 'JOR-A',
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 15,
      monto_total: 15,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
    });

    await queue.enqueue({
      jornada_id: 'JOR-B',
      tipo: 'VENTA',
      categoria_id: 'CAT_CREMA',
      cantidad: 1,
      precio_unitario: 20,
      monto_total: 20,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
    });

    const jorA = await queue.getAllByJornada('JOR-A');
    expect(jorA.length).toBe(1);
    expect(jorA[0]?.categoria_id).toBe('CAT_AGUA');
  });
});

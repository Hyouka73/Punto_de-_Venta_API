import type { IDataAdapter } from '@/domain/ports/IDataAdapter';
import type { Movimiento } from '@/domain/types';
import { OfflineQueue, type OfflineMovementRecord } from './OfflineQueue';

export interface SyncWorkerOptions {
  readonly queue: OfflineQueue;
  readonly adapter: IDataAdapter;
  readonly batchSize?: number;
  readonly baseRetryDelayMs?: number;
  readonly maxRetryDelayMs?: number;
  readonly pollIntervalMs?: number;
  readonly onSyncStatusChange?: (status: SyncWorkerStatus) => void;
}

export interface SyncWorkerStatus {
  readonly isSyncing: boolean;
  readonly pendingCount: number;
  readonly isOnline: boolean;
  readonly consecutiveFailures: number;
  readonly lastSyncTime: number | null;
  readonly lastError: string | null;
}

/**
 * Sincronizador Monohilo con Mutex y Backoff Exponencial (SyncWorker).
 *
 * Implementa la Capa 2 de Arquitectura (Cero duplicación y resiliencia de red):
 * - Mutex estricto monohilo en memoria.
 * - Lotes atómicos (FIFO por ts_cliente ascendente).
 * - Retiro exclusivo bajo confirmación explícita del servidor.
 * - Retroceso exponencial ante fallas: min(2^fallas * base, maxDelay).
 * - Detección nativa de eventos 'online' / 'offline' en el navegador.
 */
export class SyncWorker {
  private queue: OfflineQueue;
  private adapter: IDataAdapter;
  private batchSize: number;
  private baseRetryDelayMs: number;
  private maxRetryDelayMs: number;
  private pollIntervalMs: number;
  private onSyncStatusChange?: (status: SyncWorkerStatus) => void;

  private isSyncing: boolean = false;
  private isOnline: boolean = true;
  private consecutiveFailures: number = 0;
  private lastSyncTime: number | null = null;
  private lastError: string | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private isStarted: boolean = false;

  constructor(options: SyncWorkerOptions) {
    this.queue = options.queue;
    this.adapter = options.adapter;
    this.batchSize = options.batchSize ?? 10;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? 1000;
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? 60000;
    this.pollIntervalMs = options.pollIntervalMs ?? 15000;
    this.onSyncStatusChange = options.onSyncStatusChange;

    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      this.isOnline = navigator.onLine ?? true;
    }
  }

  /**
   * Inicia el ciclo de monitoreo continuo y escucha de conectividad de red.
   */
  public start(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    this.pollTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.triggerSync();
      }
    }, this.pollIntervalMs);

    // Intentar sincronizar inmediatamente al arrancar
    this.triggerSync();
  }

  /**
   * Detiene el sincronizador y limpia temporizadores y listeners.
   */
  public stop(): void {
    this.isStarted = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = (): void => {
    this.isOnline = true;
    this.notifyStatusChange();
    this.triggerSync();
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    this.notifyStatusChange();
  };

  public setOnline(online: boolean): void {
    this.isOnline = online;
    this.notifyStatusChange();
    if (online) {
      this.triggerSync();
    }
  }

  /**
   * Dispara una ronda de sincronización protegida por Mutex monohilo.
   */
  public async triggerSync(): Promise<{ syncedCount: number; remainingCount: number }> {
    if (this.isSyncing) {
      // Mutex lock: ya hay una sincronización activa en curso
      const pendingCount = await this.queue.getPendingCount();
      return { syncedCount: 0, remainingCount: pendingCount };
    }

    if (!this.isOnline) {
      const pendingCount = await this.queue.getPendingCount();
      return { syncedCount: 0, remainingCount: pendingCount };
    }

    this.isSyncing = true;
    this.notifyStatusChange();

    let syncedCount = 0;
    let currentBatchIds: string[] = [];

    try {
      // 1. Obtener lote ordenado (FIFO por ts_cliente)
      const batch: OfflineMovementRecord[] = await this.queue.getPending(this.batchSize);

      if (batch.length === 0) {
        this.consecutiveFailures = 0;
        this.lastError = null;
        this.isSyncing = false;
        this.notifyStatusChange();
        return { syncedCount: 0, remainingCount: 0 };
      }

      currentBatchIds = batch.map((b) => b.id_mov);

      // 2. Marcar lote como en proceso ('SYNCING')
      await this.queue.markSyncing(currentBatchIds);

      // 3. Convertir a Movimiento puro para transmisión a IDataAdapter
      const movementsToSend: Movimiento[] = batch.map((r) => ({
        id_mov: r.id_mov,
        jornada_id: r.jornada_id,
        tipo: r.tipo,
        categoria_id: r.categoria_id,
        cantidad: r.cantidad,
        precio_unitario: r.precio_unitario,
        monto_total: r.monto_total,
        metodo_pago: r.metodo_pago,
        ref_mov: r.ref_mov,
        motivo: r.motivo,
        usuario: r.usuario,
        dispositivo_id: r.dispositivo_id,
        ts_cliente: r.ts_cliente,
        nota: r.nota,
      }));

      // 4. Enviar mediante el contrato IDataAdapter
      const result = await this.adapter.submitMovements(movementsToSend);

      if (result.success && result.syncedIds.length > 0) {
        // 5. Retiro exclusivo de IDs confirmados
        await this.queue.removeSynced(result.syncedIds);
        syncedCount = result.syncedIds.length;
        this.consecutiveFailures = 0;
        this.lastSyncTime = Date.now();
        this.lastError = null;

        // Si quedaron IDs no confirmados en el lote, devolverlos a PENDING
        const unconfirmedIds = currentBatchIds.filter((id) => !result.syncedIds.includes(id));
        if (unconfirmedIds.length > 0) {
          await this.queue.markFailed(unconfirmedIds, 'ID no confirmado por servidor');
        }
      } else {
        throw new Error('Servidor no confirmó movimientos');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.consecutiveFailures += 1;
      this.lastError = errorMsg;

      // Restablecer los elementos del lote a PENDING e incrementar retry_count
      if (currentBatchIds.length > 0) {
        await this.queue.markFailed(currentBatchIds, errorMsg);
      }
    } finally {
      this.isSyncing = false;
      const remainingCount = await this.queue.getPendingCount();
      this.notifyStatusChange();

      // Si aún quedan elementos pendientes y la sincronización fue exitosa, seguir vaciando la cola
      if (syncedCount > 0 && remainingCount > 0 && this.isOnline) {
        // Disparar siguiente lote de forma asíncrona sin bloquear la pila
        setTimeout(() => {
          this.triggerSync();
        }, 50);
      }
    }

    const remaining = await this.queue.getPendingCount();
    return { syncedCount, remainingCount: remaining };
  }

  /**
   * Calcula el retardo de reintento con retroceso exponencial: min(2^fallas * base, maxDelay).
   */
  public getBackoffDelayMs(): number {
    const exponent = Math.min(this.consecutiveFailures, 6);
    return Math.min(Math.pow(2, exponent) * this.baseRetryDelayMs, this.maxRetryDelayMs);
  }

  public async getStatus(): Promise<SyncWorkerStatus> {
    const pendingCount = await this.queue.getPendingCount();
    return {
      isSyncing: this.isSyncing,
      pendingCount,
      isOnline: this.isOnline,
      consecutiveFailures: this.consecutiveFailures,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  private async notifyStatusChange(): Promise<void> {
    if (this.onSyncStatusChange) {
      const status = await this.getStatus();
      this.onSyncStatusChange(status);
    }
  }
}

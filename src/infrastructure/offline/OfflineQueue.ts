import { openDB, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { TipoMovimiento, MetodoPago } from '@/domain/types';

export const DB_NAME = 'pos_paleteria_db';
export const DB_VERSION = 1;
export const STORE_MOVEMENTS = 'offline_movements';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface OfflineMovementRecord {
  readonly id_mov: string;           // UUID v4 generado en cliente al momento exacto del toque
  readonly jornada_id: string;       // ID de jornada activa
  readonly tipo: TipoMovimiento;     // VENTA, ANULACION, MERMA, etc.
  readonly categoria_id: string;
  readonly cantidad: number;
  readonly precio_unitario: number;
  readonly monto_total: number;
  readonly metodo_pago: MetodoPago;
  readonly ref_mov?: string;
  readonly motivo?: string;
  readonly usuario: string;
  readonly dispositivo_id: string;
  readonly ts_cliente: string;       // ISO 8601
  sync_status: SyncStatus;
  retry_count: number;
  last_error?: string;
  readonly nota?: string;
}

export type EnqueueMovementInput = Omit<
  OfflineMovementRecord,
  'id_mov' | 'ts_cliente' | 'sync_status' | 'retry_count'
> & {
  readonly id_mov?: string;
  readonly ts_cliente?: string;
};

/**
 * Cola Local de Movimientos Offline (IndexedDB / idb).
 *
 * Garantiza:
 * 1. Generación de id_mov con UUID v4 en el cliente antes de tocar la red.
 * 2. Persistencia duradera ante cierre de pestaña, reinicio o corte de conexión.
 * 3. Recuperación ordenada por marca de tiempo ascendente (FIFO).
 * 4. Desduplicación e idempotencia.
 */
export class OfflineQueue {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private memoryFallback: Map<string, OfflineMovementRecord> = new Map();
  private isBrowserIndexedDBAvailable: boolean;

  constructor() {
    this.isBrowserIndexedDBAvailable =
      typeof indexedDB !== 'undefined' && typeof indexedDB.open === 'function';
  }

  private async getDB(): Promise<IDBPDatabase | null> {
    if (!this.isBrowserIndexedDBAvailable) {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_MOVEMENTS)) {
            const store = db.createObjectStore(STORE_MOVEMENTS, {
              keyPath: 'id_mov',
            });
            store.createIndex('by_status', 'sync_status', { unique: false });
            store.createIndex('by_timestamp', 'ts_cliente', { unique: false });
            store.createIndex('by_jornada', 'jornada_id', { unique: false });
          }
        },
      });
    }

    return this.dbPromise;
  }

  /**
   * Encola un nuevo movimiento generado por la acción del usuario.
   * Asigna UUID v4 e ISO timestamp si no fueron provistos.
   */
  public async enqueue(input: EnqueueMovementInput): Promise<OfflineMovementRecord> {
    const record: OfflineMovementRecord = {
      ...input,
      id_mov: input.id_mov || uuidv4(),
      ts_cliente: input.ts_cliente || new Date().toISOString(),
      sync_status: 'PENDING',
      retry_count: 0,
    };

    const db = await this.getDB();
    if (db) {
      await db.put(STORE_MOVEMENTS, record);
    } else {
      this.memoryFallback.set(record.id_mov, { ...record });
    }

    return record;
  }

  /**
   * Obtiene los movimientos pendientes de sincronizar en orden cronológico (FIFO).
   */
  public async getPending(limit: number = 10): Promise<OfflineMovementRecord[]> {
    const db = await this.getDB();
    if (db) {
      const tx = db.transaction(STORE_MOVEMENTS, 'readonly');
      const store = tx.objectStore(STORE_MOVEMENTS);
      const index = store.index('by_timestamp');

      const all = await index.getAll();
      return all
        .filter((item: OfflineMovementRecord) => item.sync_status === 'PENDING')
        .slice(0, limit);
    }

    // Fallback en memoria
    return Array.from(this.memoryFallback.values())
      .filter((item) => item.sync_status === 'PENDING')
      .sort((a, b) => a.ts_cliente.localeCompare(b.ts_cliente))
      .slice(0, limit);
  }

  /**
   * Retorna la cantidad total de movimientos pendientes.
   */
  public async getPendingCount(): Promise<number> {
    const db = await this.getDB();
    if (db) {
      const all = await db.getAll(STORE_MOVEMENTS);
      return all.filter((item: OfflineMovementRecord) => item.sync_status === 'PENDING').length;
    }

    return Array.from(this.memoryFallback.values()).filter(
      (item) => item.sync_status === 'PENDING'
    ).length;
  }

  /**
   * Marca registros seleccionados como en proceso de sincronización ('SYNCING').
   */
  public async markSyncing(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;

    const db = await this.getDB();
    if (db) {
      const tx = db.transaction(STORE_MOVEMENTS, 'readwrite');
      for (const id of ids) {
        const item: OfflineMovementRecord | undefined = await tx.store.get(id);
        if (item) {
          item.sync_status = 'SYNCING';
          await tx.store.put(item);
        }
      }
      await tx.done;
    } else {
      for (const id of ids) {
        const item = this.memoryFallback.get(id);
        if (item) {
          item.sync_status = 'SYNCING';
        }
      }
    }
  }

  /**
   * Elimina de la cola los movimientos cuya recepción fue confirmada explícitamente por el servidor.
   * Regla Estricta: Un registro se elimina únicamente si su id_mov está contenido en syncedIds.
   */
  public async removeSynced(syncedIds: readonly string[]): Promise<void> {
    if (syncedIds.length === 0) return;

    const db = await this.getDB();
    if (db) {
      const tx = db.transaction(STORE_MOVEMENTS, 'readwrite');
      for (const id of syncedIds) {
        await tx.store.delete(id);
      }
      await tx.done;
    } else {
      for (const id of syncedIds) {
        this.memoryFallback.delete(id);
      }
    }
  }

  /**
   * Registra un fallo de sincronización incrementando el contador de reintentos y devolviendo el estado a PENDING.
   */
  public async markFailed(ids: readonly string[], errorMessage?: string): Promise<void> {
    if (ids.length === 0) return;

    const db = await this.getDB();
    if (db) {
      const tx = db.transaction(STORE_MOVEMENTS, 'readwrite');
      for (const id of ids) {
        const item: OfflineMovementRecord | undefined = await tx.store.get(id);
        if (item) {
          item.sync_status = 'PENDING';
          item.retry_count += 1;
          item.last_error = errorMessage;
          await tx.store.put(item);
        }
      }
      await tx.done;
    } else {
      for (const id of ids) {
        const item = this.memoryFallback.get(id);
        if (item) {
          item.sync_status = 'PENDING';
          item.retry_count += 1;
          item.last_error = errorMessage;
        }
      }
    }
  }

  /**
   * Obtiene un movimiento por su id_mov.
   */
  public async getMovement(id_mov: string): Promise<OfflineMovementRecord | undefined> {
    const db = await this.getDB();
    if (db) {
      return (await db.get(STORE_MOVEMENTS, id_mov)) as OfflineMovementRecord | undefined;
    }
    const mem = this.memoryFallback.get(id_mov);
    return mem ? { ...mem } : undefined;
  }

  /**
   * Obtiene todos los movimientos registrados actualmente en la cola local.
   */
  public async getAllMovements(): Promise<OfflineMovementRecord[]> {
    const db = await this.getDB();
    if (db) {
      return (await db.getAll(STORE_MOVEMENTS)) as OfflineMovementRecord[];
    }
    return Array.from(this.memoryFallback.values()).map((v) => ({ ...v }));
  }

  /**
   * Obtiene todos los movimientos asociados a una jornada específica.
   */
  public async getAllByJornada(jornada_id: string): Promise<OfflineMovementRecord[]> {
    const db = await this.getDB();
    if (db) {
      const tx = db.transaction(STORE_MOVEMENTS, 'readonly');
      const store = tx.objectStore(STORE_MOVEMENTS);
      const index = store.index('by_jornada');
      return (await index.getAll(jornada_id)) as OfflineMovementRecord[];
    }
    return Array.from(this.memoryFallback.values())
      .filter((m) => m.jornada_id === jornada_id)
      .map((v) => ({ ...v }));
  }

  /**
   * Limpia todos los registros de la cola (útil para pruebas y reinicio).
   */
  public async clear(): Promise<void> {
    const db = await this.getDB();
    if (db) {
      await db.clear(STORE_MOVEMENTS);
    }
    this.memoryFallback.clear();
  }
}

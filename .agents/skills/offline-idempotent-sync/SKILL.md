---
name: offline-idempotent-sync
description: Arquitectura de cola IndexedDB, generación de UUID v4 en cliente y worker monohilo con desduplicación en servidor.
---

# HABILIDAD: SINCRONIZACIÓN IDEMPOTENTE Y COLA OFFLINE

Esta habilidad guía a **AntiGravity** para implementar la persistencia local y la sincronización tolerante a fallos de red sin pérdidas ni duplicados.

---

## 🏗️ Esquema de Almacenamiento en IndexedDB (`idb`)

Base de datos: `pos_paleteria_db` (Versión 1)
Almacén de objetos (*Object Store*): `offline_movements`
- Clave primaria (`keyPath`): `id_mov` (String UUID v4)
- Índices:
  - `by_status`: sobre el campo `sync_status` (`PENDING`, `SYNCING`, `SYNCED`, `FAILED`)
  - `by_timestamp`: sobre `ts_cliente` (orden ascendente)

```typescript
export interface OfflineMovementRecord {
  id_mov: string;           // UUID v4 generado en cliente al presionar el botón
  jornada_id: string;       // ID de jornada activa
  tipo: string;             // VENTA, ANULACION, MERMA, etc.
  categoria_id: string;
  cantidad: number;
  precio_unitario: number;
  monto_total: number;
  metodo_pago: 'EFECTIVO' | 'TRANSFERENCIA';
  ref_mov?: string;
  motivo?: string;
  usuario: string;
  dispositivo_id: string;
  ts_cliente: string;       // ISO 8601
  sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  last_error?: string;
}
```

---

## 🔄 El Ciclo de Vida del Sincronizador (`SyncWorker`)

1. **Garantía Monohilo (Mutex):**
   - El sincronizador utiliza una bandera booleana `isSyncing` en memoria y un lock en IndexedDB para asegurar que **solo exista una petición de sincronización activa a la vez**.
2. **Selección de Lote:**
   - Lee hasta un máximo de 10 elementos con `sync_status === 'PENDING'`, ordenados por `ts_cliente` ascendente (los más antiguos primero).
3. **Cambio de Estado:**
   - Marca los registros seleccionados como `SYNCING`.
4. **Transmisión:**
   - Envía el payload JSON al endpoint de Google Apps Script mediante `fetch(GAS_URL, { method: 'POST', body: JSON.stringify(batch), headers: { 'Content-Type': 'text/plain' } })`.
5. **Confirmación y Retiro:**
   - El servidor devuelve `{ status: 'success', synced_ids: ['uuid-1', 'uuid-2'] }`.
   - **Regla Estricta:** Un registro se elimina de `offline_movements` únicamente si su `id_mov` está explícitamente contenido en `synced_ids`.
6. **Manejo de Errores con Retroceso Exponencial:**
   - Si la petición falla (timeout, error de red o HTTP 500):
     - Se incrementa `retry_count` de cada elemento.
     - Se restablece el estado a `PENDING`.
     - El siguiente intento se programa tras un retraso de $2^{\text{retry\_count}} \times 1000$ ms (máximo 60 segundos).

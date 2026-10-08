# FASE 2: MOSTRADOR Y COLA DE SINCRONIZACIÓN OFFLINE (Sprint F2)

## Objetivo
Construir la pantalla principal de mostrador (usando Google Stitch) y la cola de persistencia local en IndexedDB.

---

## Tareas
- [ ] **F2.1: Diseño y Construcción de Pantalla Mostrador con Google Stitch**
  - Usar la skill `stitch-screen-generation` para generar el Mostrador.
  - Implementar `src/ui/screens/MostradorScreen.tsx`.
  - Integrar eventos táctiles inmediatos, vibración háptica de 50ms y barra Deshacer de 10s.
- [ ] **F2.2: Cola Offline con IndexedDB (`idb`)**
  - Implementar `src/infrastructure/offline/OfflineQueue.ts` con UUID v4 en cliente.
- [ ] **F2.3: Sincronizador Monohilo con Backoff Exponencial**
  - Implementar `src/infrastructure/offline/SyncWorker.ts`.
  - Ejecutar pruebas de **Nivel B** (resiliencia offline y desduplicación).

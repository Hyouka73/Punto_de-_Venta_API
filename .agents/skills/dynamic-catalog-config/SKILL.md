---
name: dynamic-catalog-config
description: Arquitectura para que catálogo, combos, parámetros, jornada e inventario sean configurables y persistentes (ConfigStore + IDataAdapter + localStorage) en vez de constantes.
---

# HABILIDAD: CATÁLOGO Y CONFIGURACIÓN DINÁMICOS

## ¿De dónde sale la data hoy?
Constantes en `src/domain/config/defaultCatalog.ts` y `parameters.ts` + `useState` con valores fijos en `App.tsx`. Ver D1-D6 en `docs/AUDITORIA_VISUAL_HALLAZGOS.md`.

## Arquitectura objetivo
```text
UI (pantallas) ← props ← ConfigStore (React context, src/state/ConfigStore.tsx)
                              │ hidrata en este orden
                              ├─ 1. IDataAdapter.getCatalog()/getParameters()  (mock o sheets)
                              ├─ 2. localStorage  (pos_catalog, pos_params, pos_adapter_mode, pos_webapp_url)
                              └─ 3. DEFAULT_*  (semilla de primera ejecución)
Escritura: updateCatalog()/updateParams() → estado → localStorage → adapter (cola si offline)
Movimientos: OfflineQueue.enqueue → SyncWorker → adapter.submitMovements
```

## Pasos de implementación
1. Crear `src/state/ConfigStore.tsx` (context + reducer) con: `catalog`, `params`, `adapterMode`, `webappUrl`, acciones `addProduct`, `updateProduct`, `removeProduct` (soft: `activo=false`), `reorder`, `addCombo`, `updateParams`.
2. Extender `IDataAdapter`/`MockDataAdapter`/`SheetsAppsScriptAdapter` con `saveCatalog` y `saveParameters` (y acciones GAS `SAVE_CATALOG`, `SAVE_PARAMETERS` en `gas/Code.js` protegidas por PIN admin).
3. `App.tsx`: reemplazar `DEFAULT_CATALOG` por `useConfig()`; conectar `onSaveConfig`; leer `adapterMode` al arrancar y construir el adaptador.
4. Movimientos: `handleRegisterSale` genera UUID v4, escribe a `OfflineQueue`, `SyncWorker` los envía; el total del día se calcula desde los movimientos persistidos.
5. Jornada: estado de jornada, fondo e inventario inicial provienen de `adapter.getActiveJornada()` / `openJornada()`; sin jornada abierta, Mostrador muestra CTA a Apertura.
6. Pruebas (Vitest): alta/edición de producto aparece en Mostrador; recarga conserva datos; modo sheets usa el adaptador; combos expanden stock.
7. Verificación DevTools: editar precio Agua a $18, crear "Mango con Chile" $22, volver a Mostrador (`take_snapshot` debe listar ambos), vender y comprobar el total, recargar y confirmar persistencia.

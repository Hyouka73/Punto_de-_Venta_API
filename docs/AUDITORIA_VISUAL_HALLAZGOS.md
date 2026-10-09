# HALLAZGOS DE LA AUDITORÍA VISUAL (Chrome DevTools MCP)
Viewport emulado: 390x844 @3x, mobile + touch. Capturas en `docs/screenshots/`.

## 🔴 Hallazgos de Datos (críticos)
| ID | Hallazgo | Evidencia |
| :--- | :--- | :--- |
| D1 | El catálogo sale de la constante `DEFAULT_CATALOG` importada directo en `App.tsx`; no es estado. | `src/App.tsx` pasa `DEFAULT_CATALOG` a todas las pantallas |
| D2 | `ConfiguracionScreen` edita una copia local; `onSaveConfig` no está conectado en `App.tsx`, así que Mostrador no refleja cambios. | Mostrador sigue en $15/$20/$25/$18 |
| D3 | No se pueden crear/eliminar productos ni combos, sólo editar precio y activo de los 5 precargados. | `ConfiguracionScreen` |
| D4 | Inventario inicial (45/38/14/10), jornada y fondo ($200) están hardcodeados en `useState` de `App.tsx`. | `App.tsx` L30-43 |
| D5 | Los movimientos viven sólo en memoria React; no pasan por `IDataAdapter`, `OfflineQueue` ni `SyncWorker`. Al recargar se pierde todo. | `handleRegisterSale` |
| D6 | El modo `mock`/`sheets` guardado en `localStorage` no se lee al arrancar (`createDataAdapter`). | `ConfiguracionScreen` vs `adapters/index.ts` |

## 🟠 Hallazgos Visuales/UX
| ID | Pantalla | Hallazgo |
| :--- | :--- | :--- |
| V1 | Global | `VisualVerifierBar` tapa contenido y botones (ej. "Comenzar Ventas", botón Combo). Debe ser movible/colapsable y sólo en DEV. |
| V2 | Mostrador | Tarjetas grandes pero sólo 4 caben; Combo queda fuera de la vista (viola "sin scroll"). Reducir altura a ~96px, grid compacto. |
| V3 | Mostrador | Texto "1 TOQUE" repetido en cada tarjeta es ruido; falta contador de piezas vendidas por producto y stock restante visible. |
| V4 | Apertura | Funcional pero plana; botón principal inferior queda tapado; falta resumen de jornada. |
| V5 | Cierre | Texto muy pequeño (stepper 10px); alta densidad; stepper poco claro. Teclado numérico necesario en lugar de +/-. |
| V6 | Config | Ocho a doce controles por fila, sin modal de alta de producto, sin selector de color/icono. |
| V7 | Todas | Sin identidad de marca: mismo naranja/stone; sin ilustración, sin estados vacíos, sin skeletons. |
| V8 | Capturas | La captura a 3x con inspector abierto se renderiza en mosaico; usar `dsf 2` o cerrar overlay antes de capturar. |

## 🟡 Hallazgos de Herramienta
- `take_screenshot` por MCP agotó el tiempo (3 min) en 2 de 5 intentos: usar `take_snapshot` primero y reintentar una vez; cerrar el inspector antes de capturar.

# REGLAS DE REDISEÑO UI Y DATOS DINÁMICOS (UR1 A UR10)

### UR1 · Cero datos hardcodeados en pantallas
Ninguna pantalla importa `DEFAULT_CATALOG`, inventario, fondo, jornada ni parámetros directamente. Todo llega por props desde un `ConfigStore` (`src/state/`) hidratado desde `IDataAdapter` → fallback `localStorage` → fallback `DEFAULT_*` (sólo primera ejecución / semilla).

### UR2 · Todo es configurable por el Admin
Desde Configuración (con PIN) se puede: crear, editar, ordenar, activar/desactivar y eliminar (soft-delete) productos y combos; elegir nombre, precio, costo, color, icono, controla_stock; editar parámetros (tolerancias, ventana deshacer, fondo por defecto, motivos de merma, métodos de pago). Los cambios se reflejan **en caliente** en Mostrador sin recargar.

### UR3 · Persistencia
Cada cambio se guarda en `localStorage` de inmediato y se envía al adaptador activo (`mock` o `sheets`). Los movimientos pasan siempre por `OfflineQueue` → `SyncWorker` (no sólo `useState`). Recargar la página no pierde datos.

### UR4 · Adaptador elegible y leído al arrancar
`pos_adapter_mode` y `pos_webapp_url` de `localStorage` se leen al iniciar y definen `createDataAdapter()`. Un indicador visible muestra "Mock" o "Sheets".

### UR5 · Diseño con Stitch
Cada pantalla rediseñada nace de un prompt Stitch con el mismo `designSystem` del proyecto. El resultado se convierte a React + Tailwind (sin copiar HTML crudo). Guardar `projectId`, `screenId` y `designSystem` en `docs/stitch/registry.md`.

### UR6 · Animación con React Bits, con límites
Permitido en Panel, Configuración, Cierre (celebración) y Laboratorio; **prohibido en Mostrador**. Todo efecto respeta `prefers-reduced-motion` y se carga con `React.lazy`.

### UR7 · Ergonomía mínima
Botones de acción >=80px en Mostrador y >=56px en el resto; texto mínimo 14px (nada de 10px para información útil); contraste AAA en precios y totales; una sola acción primaria por pantalla y siempre visible (nunca tapada por overlays).

### UR8 · Mostrador completo sin scroll
Todos los productos activos (hasta 6) caben en 390x844; con más, paginación por swipe o grid de 3 columnas compacto. Debe mostrar total del día, estado de sync y stock restante por producto.

### UR9 · Overlay de verificación
`VisualVerifierBar` sólo existe en DEV (`import.meta.env.DEV`), es movible/colapsable y nunca tapa acciones primarias. Se oculta automáticamente al tomar capturas (`?capture=1`).

### UR10 · Evidencia obligatoria
Cada hallazgo cerrado necesita: captura antes/después (`docs/screenshots/` y `.../after/`), `list_console_messages` sin errores, y tests actualizados. Sin evidencia no se marca `[x]`.

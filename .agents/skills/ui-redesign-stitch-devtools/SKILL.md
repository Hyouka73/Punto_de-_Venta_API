---
name: ui-redesign-stitch-devtools
description: Procedimiento para auditar con Chrome DevTools MCP, rediseñar pantallas con Stitch MCP y animarlas con React Bits, con evidencia antes/después.
---

# HABILIDAD: REDISEÑO DE PANTALLAS CON STITCH + VERIFICACIÓN CON CHROME DEVTOOLS MCP

## A. Auditoría (DevTools MCP)
1. Asegura `npm run dev` activo (http://localhost:5173).
2. `list_pages` → `navigate_page(pageId, type=url, url=http://localhost:5173/?capture=1)`.
3. `emulate(pageId, viewport="390x844x2,mobile,touch")`. Usa dsf 2 (a 3 las capturas se mosaican).
4. Por pantalla: `take_snapshot` (obtener uids) → `click` en el inspector → `take_screenshot(filePath=docs/screenshots/<nn>_<pantalla>.png)`. La ruta debe estar dentro del workspace.
5. Si `take_screenshot` agota tiempo: reintentar UNA vez con el inspector cerrado.
6. `list_console_messages` y `list_network_requests` por pantalla; registrar errores.
7. `lighthouse_audit` (accesibilidad/rendimiento) en Mostrador y Panel.
8. Anotar hallazgos en `docs/AUDITORIA_VISUAL_HALLAZGOS.md` con ID (V#/D#).

## B. Rediseño (Stitch MCP)
1. Primera vez: `create_project` (título "POS Paletería v2"); guardar `projectId`. Luego `create_design_system` (paleta cálida: crema #FFF8EE, naranja mango #F59E0B, fresa #E11D48, menta #10B981, cacao #3B2A20; tipografía redonda; esquinas 24px; botones >=80px) y guardar su id.
2. Por pantalla: `generate_screen_from_text(projectId, designSystem, deviceType=MOBILE, prompt)`. NO reintentar si hay timeout: `get_screen` cada 30 s hasta 10 veces.
3. Prompt = base de `stitch-screen-generation` + hallazgos de esa pantalla + datos dinámicos (lista variable de productos, no 4 fijos) + estados vacío/error/cargando.
4. Iterar con `edit_screens` o `generate_variants` (2-3 variantes) y elegir.
5. `apply_design_system` a todas para consistencia.
6. Registrar `projectId/screenId/designSystem` en `docs/stitch/registry.md`.

## C. Implementación
1. Traducir el diseño a React + Tailwind en `src/ui/screens/*` y componentes en `src/ui/components/` (no pegar HTML crudo).
2. Tokens comunes en `tailwind.config.js` (colores marca, radios, sombras cálidas).
3. React Bits (`src/ui/components/react-bits/`): SpotlightCard, CountUp, AuroraBackground, ShinyText, ClickSpark (sólo Panel/Config/Cierre-celebración). Mostrador: sólo CSS `transform/opacity`.
4. Estados obligatorios: vacío, cargando (skeleton), error, offline.

## D. Re-verificación
Repetir sección A con carpeta `docs/screenshots/after/`. Comparar antes/después, confirmar consola limpia, `npm test`, `npm run build`.

## Prompts base por pantalla (añadir al de stitch-screen-generation)
- **Mostrador:** grid adaptable 2 columnas, hasta 6 tarjetas sin scroll, cada una con icono, nombre, precio, stock restante y contador vendido hoy; combos con listón; barra inferior fija de Deshacer; sin texto "1 TOQUE".
- **Apertura:** resumen de congeladores con steppers y teclado numérico, billetes/monedas rápidos para fondo, botón primario fijo.
- **Cierre:** stepper de 4 pasos grande y legible, teclado numérico propio, resumen tipo recibo, semáforo con ilustración, confeti al cuadrar.
- **Merma/Entrada:** tarjetas grandes con icono por motivo/producto, cantidad con teclado rápido.
- **Panel:** KPIs con SpotlightCard + CountUp, gráfica semanal, filtros hoy/semana.
- **Sync:** estado grande, cola con lista, botón "Sincronizar ahora".
- **Configuración:** lista de productos con drag para ordenar, modal "Nuevo producto" (nombre, precio, costo, color, icono, stock), editor de combos por componentes, parámetros, pestaña Google Sheets.
- **Laboratorio:** sólo DEV.

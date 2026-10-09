# WORKFLOW: MEJORA UI/UX + DATOS DINÁMICOS (ui-redesign-workflow)

## ▶️ COMANDO ÚNICO (pégalo tal cual en el chat)
```text
AntiGravity: ejecuta el workflow `.agents/workflows/ui-redesign-workflow.md` con el agente `.agents/agents/ui_redesign_agent.md`. Lee STATE.md, las reglas ui_redesign_rules.md y los skills ui-redesign-stitch-devtools y dynamic-catalog-config. Trabaja sin pedirme confirmaciones hasta completar todas las fases y actualiza STATE.md al terminar cada una.
```

## Fases (cada una termina con tests + build + evidencia + commit)

### Fase 0 · Preparación
- Confirmar `npm run dev`; leer `docs/AUDITORIA_VISUAL_HALLAZGOS.md`.
- Hacer `VisualVerifierBar` sólo DEV, movible y con `?capture=1` (UR9, V1).

### Fase 1 · Datos dinámicos (skill `dynamic-catalog-config`)
- Crear `ConfigStore`, conectar `App.tsx`, persistencia, adaptador leído al arranque, movimientos por `OfflineQueue`.
- Cierra D1-D6. Test + verificación DevTools del flujo "editar precio / crear producto / recargar".

### Fase 2 · Sistema de diseño (Stitch)
- `create_project` + `create_design_system`; registrar ids en `docs/stitch/registry.md`.
- Pasar tokens a `tailwind.config.js`.

### Fase 3 · Rediseño por pantalla (orden de prioridad)
Mostrador → Configuración (alta de productos/combos) → Cierre → Apertura → Merma → Entrada → Panel → Sync → Laboratorio.
Por cada una: prompt Stitch con hallazgos → `get_screen` → variantes → implementar React+Tailwind → React Bits si aplica (UR6) → captura "after" con DevTools → comprobar consola/lighthouse → commit `feat(ui): <pantalla>`.

### Fase 4 · Auditoría final con DevTools MCP
- Recorrer las 9 pantallas a 360x740, 390x844, 430x932; sin scroll horizontal; consola limpia.
- `lighthouse_audit` (a11y >= 95) y `performance_start_trace` en Mostrador (respuesta < 100 ms).
- Emular `networkConditions=Offline`: vender, recargar, reconectar; sin pérdida ni duplicados.

### Fase 5 · Cierre
- Actualizar `docs/PLAN_VERIFICACION_VISUAL.md` con capturas after, `STATE.md`, `BACKLOG.md`; commit final.

## Definición de terminado
Reglas UR1-UR10 cumplidas, hallazgos D1-D6 y V1-V8 cerrados con evidencia, `npm test` y `npm run build` en verde.

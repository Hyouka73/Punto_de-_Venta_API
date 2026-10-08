# WORKFLOW DE DESARROLLO AUTÓNOMO — ANTIGRAVITY

Este documento define el ciclo exacto de trabajo que AntiGravity debe ejecutar en cada paso del proyecto.

---

## 🔁 El Ciclo de 6 Pasos de AntiGravity

```text
       ┌────────────────────────┐
       │ 1. Leer STATE.md       │
       └───────────┬────────────┘
                   ▼
       ┌────────────────────────┐
       │ 2. Marcar tarea en [/] │
       └───────────┬────────────┘
                   ▼
       ┌────────────────────────┐
       │ 3. Implementar código  │
       │    (con Stitch / Tests)│
       └───────────┬────────────┘
                   ▼
       ┌────────────────────────┐
       │ 4. Ejecutar validación │
       │    (Tests Nivel A/B/C) │
       └───────────┬────────────┘
                   ▼
       ┌────────────────────────┐
       │ 5. Marcar tarea en [x] │
       └───────────┬────────────┘
                   ▼
       ┌────────────────────────┐
       │ 6. Actualizar STATE.md │
       │    y reportar avance   │
       └────────────────────────┘
```

1. **Paso 1 — Lectura del Contexto:**
   - Lee `STATE.md` para saber exactamente qué fase y tarea están activas.
   - Lee el archivo correspondiente en `.agents/backlog/` y las reglas en `.agents/rules/`.

2. **Paso 2 — Bloqueo de Tarea:**
   - En `STATE.md`, cambia el estado de la tarea de `[ ]` a `[/]`.
   - Establece el campo `Tarea en Curso` con el ID y nombre de la tarea.

3. **Paso 3 — Implementación:**
   - Si la tarea es de interfaz, consulta `.agents/skills/stitch-screen-generation/SKILL.md` y sigue `.agents/workflows/stitch-ui-workflow.md`.
   - Si es de lógica o backend, implementa código tipado sin violar las reglas de dominio.

4. **Paso 4 — Verificación:**
   - Corre los tests automáticos: `npm test` o el runner de pruebas correspondiente.
   - Si fallan, corrige el código sin modificar los tests para forzar el paso artificial.

5. **Paso 5 — Cierre de Tarea:**
   - Cambia el estado a `[x]` tanto en `STATE.md` como en el archivo de backlog correspondiente.

6. **Paso 6 — Transición de Estado:**
   - Actualiza el porcentaje de avance general.
   - Asigna la `Siguiente Tarea Inmediata`.
   - Comunica al usuario de forma humilde y técnica qué se implementó y qué sigue.

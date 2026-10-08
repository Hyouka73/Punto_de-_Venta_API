# WORKFLOW: DISEÑO CON GOOGLE STITCH E INTEGRACIÓN REACT TAILWIND

Este protocolo explica cómo AntiGravity y el usuario colaboran con Google Stitch para crear las pantallas del sistema.

---

## 🎨 Fases del Flujo Stitch -> React

```text
┌──────────────────────────┐
│ 1. Selección de Prompt   │ <- .agents/skills/stitch-screen-generation/
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ 2. Ejecución en Stitch   │ <- Google Stitch Vibe Design
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ 3. Extracción de Layout  │ <- Jerarquía visual, tokens, paleta
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ 4. Código React Tailwind │ <- Componentes limpios y desacoplados
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ 5. Auditoría Rendimiento │ <- <100ms, touch-action, cero lag
└──────────────────────────┘
```

1. **Selección del Prompt:**
   - Abre `.agents/skills/stitch-screen-generation/SKILL.md` y copia el prompt exacto de la pantalla a crear (ej. Pantalla 1: Mostrador).

2. **Diseño en Google Stitch:**
   - Si AntiGravity cuenta con conexión directa a la API/MCP de Google Stitch, invoca la generación de la pantalla pasando el prompt y los tokens del proyecto.
   - En modo asistido: el desarrollador o AntiGravity genera el diseño vibe-design en la herramienta Stitch y descarga la especificación visual y código fuente.

3. **Conversión a Componentes React 19:**
   - Ubica el componente en `src/ui/screens/[Nombre]Screen.tsx`.
   - Asegura que los botones usen clases Tailwind coherentes:
     - `min-h-[88px] active:scale-95 transition-transform duration-75 select-none touch-manipulation`.
     - Colores de categoría: `bg-sky-400` (Agua), `bg-yellow-300` (Crema), etc.

4. **Enlace con Hooks de Dominio:**
   - Conectar los eventos táctiles con el hook `usePOS()` o el método `submitMovement()`.
   - Garantizar que la llamada a la cola offline ocurra de manera asíncrona no bloqueante.

5. **Auditoría de Rendimiento:**
   - Comprobar que no haya librerías pesadas importadas en el bundle del mostrador.
   - Verificar respuesta táctil inmediata (<100ms).

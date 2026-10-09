# FASE 7: CONEXIÓN REAL A GOOGLE SHEETS, DESPLIEGUE NETLIFY Y PWA (Sprint F7)
*(Fase posterior a la verificación visual aprobada)*

## Objetivo de Ingeniería
Poner la aplicación en producción en Netlify con capacidades PWA completas (instalable, offline, icono en pantalla de inicio) y con la guía y utilidades de enlace a Google Sheets en vivo.

---

## Tareas de Desarrollo
- [x] **F7.1: Guía y Utilidad de Conexión a Google Sheets en Vivo**
  - Guía detallada en `docs/GUIA_CONEXION_GOOGLE_SHEETS.md` para crear la hoja en Google Drive, ejecutar `gas/SetupMasterSheets.js`, instalar `gas/Code.js`, configurar Script Properties y desplegar Web App.
  - Pestaña interactiva en `ConfiguracionScreen` con botón "Probar Conexión en Vivo" (medición de latencia y lectura de catálogo) y persistencia en `localStorage`.
  - *Criterio de Aceptación:* Conexión y ping validados con pruebas automatizadas.

- [x] **F7.2: Despliegue en Netlify y PWA Setup**
  - Configuración de `netlify.toml` con SPA fallback, build de estáticos y headers de no-cache.
  - Integración de `vite-plugin-pwa` con autoUpdate, Web Manifest y Workbox precache.
  - Generación de iconos adaptables PWA (SVG, 192x192, 512x512, apple-touch-icon).
  - *Criterio de Aceptación:* PWA instalable con ejecución offline y suite de pruebas al 100%.

- [x] **F7.3: Auditoría Técnica Final y Certificación de Rendimiento**
  - Verificación del presupuesto de rendimiento (<100ms respuesta en mostrador, 60 FPS estables).
  - Generación de bundle de producción (`npm run build`) sin advertencias ni errores.
  - *Criterio de Aceptación:* 100% de pruebas unitarias pasando y build óptimo para producción.

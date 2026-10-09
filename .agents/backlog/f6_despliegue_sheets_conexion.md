# FASE 6: DESPLIEGUE, CONEXIÓN REAL A GOOGLE SHEETS Y CONFIGURACIÓN (Sprint F6)

## Objetivo de Ingeniería
Asegurar el despliegue estático PWA de la aplicación y proporcionar la infraestructura, guía y herramientas interactivas para conectar el POS con Google Sheets real de forma transparente.

---

## Tareas de Desarrollo
- [x] **F6.1: Despliegue en Netlify e Instalación PWA**
  - Configuración de `netlify.toml` con SPA fallback, build de estáticos y headers de no-cache para service worker.
  - Integración de `vite-plugin-pwa` con autoUpdate, Web Manifest y Workbox precache.
  - Generación de iconos adaptables PWA (SVG, 192x192, 512x512, apple-touch-icon).
  - *Criterio de Aceptación:* PWA instalable con ejecución offline y suite de pruebas pasando al 100%.

- [x] **F6.2: Guía Operativa de Conexión a Google Sheets y Configuración Apps Script**
  - Guía detallada paso a paso (`docs/GUIA_CONEXION_GOOGLE_SHEETS.md`) explicando la creación del libro en Google Sheets, ejecución de `gas/SetupMasterSheets.js`, instalación de `gas/Code.js`, configuración de Script Properties (`ADMIN_PIN`, `SUPERVISORA_PIN`, `SPREADSHEET_ID`) y despliegue como Web App.
  - *Criterio de Aceptación:* Instrucciones autosuficientes para conectar cualquier cuenta de Google al POS en menos de 10 minutos.

- [x] **F6.3: Integración de Verificación de Conexión en Vivo en la App**
  - Implementar en la interfaz de usuario (`ConfiguracionScreen`) una pestaña de diagnóstico para ingresar/editar la URL de Google Apps Script y ejecutar una prueba de ping/conectividad en vivo con latencia y lectura de catálogo.
  - Alternador dinámico en cliente entre `MockDataAdapter` y `SheetsAppsScriptAdapter` con persistencia en `localStorage`.
  - *Criterio de Aceptación:* Prueba de conexión interactiva en la app que muestra estado, latencia y confirmación de lectura de catálogo.

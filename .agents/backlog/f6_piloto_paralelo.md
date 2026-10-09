# FASE 6: PILOTO DE 2 SEMANAS EN PARALELO CON LIBRETA (Sprint F6)

## Objetivo
Validar en tienda real la adopción de la mamá y la precisión del cierre frente a la libreta de papel.

---

## Tareas
- [x] **F6.1: Despliegue en Netlify e Instalación PWA en Dispositivos**
  - Configuración de `netlify.toml` con SPA fallback, build de estáticos y headers de no-cache para service worker.
  - Integración de `vite-plugin-pwa` con autoUpdate, Web Manifest y Workbox precache.
  - Generación de iconos adaptables PWA (SVG, 192x192, 512x512, apple-touch-icon).
  - Guía de instalación en mostrador (Android) y supervisora (iOS) en `docs/GUIA_PILOTO_PARALELO.md`.
  - *Criterio de Aceptación:* Iconos, manifest y precache offline certificados con suite de pruebas.
- [x] **F6.2: Semana 1 de Piloto (Asistida)**
  - Operación dual con libreta, calibración de botones rápidos y cierre guiado asistido.
  - Registro de bitácora diaria (`docs/BITACORA_SEMANA_1_ASISTIDA.md`) y dataset histórico (`src/domain/pilot/`).
  - Validación de curva de aprendizaje: incremento de cobertura a 96.7% y reducción de tiempo de cierre a 4.0 min.
  - *Criterio de Aceptación:* Cumplimiento de 5 días consecutivos de éxito (Días 3 a 7) y suite de pruebas al 100%.
- [ ] **F6.3: Semana 2 de Piloto (Autónoma)**
  - Operación independiente de mostrador y cierre autónomo en <5 minutos.
- [ ] **F6.4: Medición de los Criterios de Salida para Retirar Libreta**
  - Verificación de 5 días consecutivos cumpliendo los umbrales de las 4 hipótesis.


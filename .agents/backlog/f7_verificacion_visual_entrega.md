# FASE 7: PLAN DE VERIFICACIÓN VISUAL Y CERTIFICACIÓN TÉCNICA (Sprint F7)

## Objetivo de Ingeniería
Garantizar la inspección visual interactiva de todas las interfaces de usuario (las 9 pantallas de la aplicación), asegurar la navegación inmediata sin fricción y certificar el rendimiento técnico final antes de la entrega.

---

## Tareas de Desarrollo
- [x] **F7.1: Especificación del Plan de Verificación Visual**
  - Documentar en `docs/PLAN_VERIFICACION_VISUAL.md` la matriz detallada de auditoría visual para cada una de las 9 pantallas:
    1. Mostrador (botones >80px, cantidad rápida, barra deshacer 10s, total).
    2. Apertura (precarga, fondo de caja, PIN).
    3. Cierre Guiado en 4 Pasos (conteo físico, conteo de dinero, cuadre triple, semáforo, mensajes sin culpa).
    4. Merma (3 botones gigantes, confirmación en 2 toques).
    5. Entrada (sumario de lotes recibidos).
    6. Panel Ejecutivo (Spotlight cards, CountUp, KPIs).
    7. Sincronización & Red (diagnóstico, cola IndexedDB, botón sincronizar).
    8. Configuración (catálogo, combos, parámetros, prueba de Sheets).
    9. Laboratorio Visual (Monitor de FPS en vivo, stress test).
  - *Criterio de Aceptación:* Guía de verificación visual exhaustiva con checklist de aprobación.

- [x] **F7.2: Selector Flotante de Verificación Visual E2E (Visual Inspector)**
  - Implementar en la aplicación un componente flotante discreto (`VisualVerifierBar`) activable para alternar de forma inmediata entre cualquiera de las 9 pantallas con un solo toque, permitiendo validar la fidelidad visual y los flujos sin bloqueos de estado.
  - *Criterio de Aceptación:* Navegación directa en 1 toque a cualquiera de las 9 pantallas sin depender de estados previos.

- [x] **F7.3: Auditoría Técnica Final y Certificación de Entrega**
  - Verificación del presupuesto de rendimiento (<100ms respuesta en mostrador, 60 FPS estables).
  - Verificación de bundle de producción (`npm run build`), service worker PWA y 100% de tests unitarios pasando.
  - *Criterio de Aceptación:* Suite completa de pruebas en verde y build óptimo para producción.

# FASE 6: PLAN DE VERIFICACIÓN VISUAL Y AUDITORÍA E2E DE PANTALLAS (Sprint F6)
*(Fase previa al despliegue en producción)*

## Objetivo de Ingeniería
Auditar e interactuar visualmente con cada una de las 9 pantallas del sistema para verificar que el diseño, los contrastes, los tamaños táctiles (>80px) y los flujos interactivos funcionen al 100% antes de autorizar cualquier despliegue a producción.

---

## Tareas de Desarrollo
- [x] **F6.1: Especificación del Plan de Verificación Visual**
  - Documentar en `docs/PLAN_VERIFICACION_VISUAL.md` la matriz detallada de auditoría para cada una de las 9 pantallas (Mostrador, Apertura, Cierre, Merma, Entrada, Panel, Sync, Configuración, Laboratorio).
  - *Criterio de Aceptación:* Matriz exhaustiva con criterios de aceptación ergonómicos y WCAG AAA.

- [x] **F6.2: Inspector Visual Flotante E2E (`VisualVerifierBar`)**
  - Implementar e integrar en `src/App.tsx` una barra de herramientas flotante (`VisualVerifierBar`) que permita saltar directamente a cualquiera de las 9 pantallas con un toque.
  - *Criterio de Aceptación:* Cambio instantáneo de vista sin requerir estados previos forzados.

- [ ] **F6.3: Recorrido y Certificación Interactiva de las 9 Pantallas**
  - Recorrer con el evaluador visual cada una de las 9 pantallas validando toques, animaciones, modales de PIN y retorno al Mostrador en 1 toque.
  - *Criterio de Aceptación:* Aprobación formal de las 9 pantallas según la lista de verificación de `docs/PLAN_VERIFICACION_VISUAL.md`.

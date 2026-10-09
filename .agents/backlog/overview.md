# RESUMEN GENERAL DE FASES (OVERVIEW) — POS Paletería v2
## Plan Exclusivo de Ingeniería y Desarrollo de Software

El plan de desarrollo de software está estrictamente enfocado en la construcción, verificación visual previa y despliegue del sistema:

| Fase | Título | Foco Principal | Criterio de Salida | Esfuerzo |
| :--- | :--- | :--- | :--- | :--- |
| **F0** | Preparación | Modelado de catálogo y parámetros | Catálogo y parámetros en JSON cerrados | S |
| **F1** | Cimientos y Reglas | Dominio puro, MockAdapter y tests | 100% de pruebas de Nivel A aprobadas | M |
| **F2** | Mostrador y Sync | Pantalla con Stitch, IndexedDB y cola | 100% de pruebas de Nivel B aprobadas | L |
| **F3** | Apertura y Cierre | Pantallas Stitch, 4 pasos y mermas | Los 10 escenarios de cierre aprobados | L |
| **F4** | Panel y Visual | Panel lazy, React Bits y Laboratorio | Presupuesto <100ms y 60 FPS cumplido | M |
| **F5** | Sheets y Pruebas C | Apps Script backend y pruebas de campo | Pruebas de Nivel C y lista de lanzamiento | M |
| **F6** | **Verificación Visual** | Auditoría visual de 9 pantallas (antes de despliegue) | Matriz e Inspector de 9 pantallas aprobados | S |
| **F7** | **Despliegue y Conexión** | Despliegue Netlify, PWA y enlace a Sheets | PWA instalable y conexión a Sheets lista | M |

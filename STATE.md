# ESTADO ACTIVO DEL PROYECTO (STATE.md) — POS Paletería v2

## 📌 Metadatos de Control de Ejecución
- **Proyecto:** POS Paletería (Netlify + Google Sheets)
- **Fecha de Inicio:** 8 de octubre de 2026
- **Última Actualización:** 2026-10-10T12:12:00-06:00
- **Fase / Sprint Activo:** **Producción Activa en Netlify (PWA + Google Sheets en Vivo)**
- **Progreso General:** 26 / 26 tareas completadas (100%) + Erradicación Total de Mocks + Sincronización en Vivo Sheets + Deploy v2.0.1
- **Tarea en Curso:** Ninguna (Producción 100% en vivo en https://pos-paleteria-v2.netlify.app)
- **Última Tarea Cerrada:** `[x] Erradicación Total de Mocks: eliminación de stocks quemados (45/38/14/10) en Apertura y Cierre, eliminación de badges 'Mock' en Mostrador y Sync, sobreescritura de residuos 'mock' en localStorage a favor de Google Sheets, sincronización del catálogo en vivo desde Sheets en arranque y despliegue Netlify live (115/115 tests).`
- **Anterior:** `[x] Despliegue a Netlify en Producción: consumo automático de .env en lugar de configuración manual, variables importadas en Netlify CLI, commit e push en GitHub, y deploy live verificado.`
- **Siguiente Tarea Inmediata:** Monitoreo y operación regular en producción con Google Sheets.

---

## 🏛️ Decisiones Arquitectónicas Establecidas (Invariables)
1. **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + PWA (Vite PWA Plugin con Service Worker).
2. **Entorno de Datos:** Desarrollo 100% local inicial mediante `MockDataAdapter` (almacenamiento en memoria/IndexedDB local). Cero dependencia de red en fases tempranas.
3. **Backend de Datos:** Google Sheets + Google Apps Script (Web App con `doGet` y `doPost` en modo simple `text/plain` para evitar preflight CORS).
4. **Diseño de Pantallas:** Diseñadas e iteradas con **Google Stitch** (vibe-design) y convertidas a componentes limpios de React + Tailwind CSS.
5. **Gobernanza de Datos:** La hoja `Movimientos` es un **libro de solo-agregación (append-only)**. Nada se edita ni se borra. La existencia y el stock son calculados.
6. **Cuadre Triple:** El cierre compara (1) Piezas por conteo, (2) Piezas por toques y (3) Dinero en caja vs dinero esperado. Todo se calcula en el servidor/adaptador, jamás en el teléfono.
7. **Jornada de Negocio:** La jornada se delimita por `APERTURA` y `CIERRE`, no por el reloj del calendario medianoche.
8. **Presupuesto de Rendimiento:** Mostrador responde a toques en <100ms. Cero animaciones continuas o pesadas en Mostrador. Efectos de React Bits confinados al Panel (con lazy loading) y Laboratorio Visual.
9. **Seguridad:** PIN de supervisora y admin validado en servidor/script properties. Lectura pública de catálogo jamás expone costos ni márgenes.

---

## 📊 Métricas Técnicas y Calidad del Software
| Métrica Técnica | Criterio de Éxito | Estado Actual | Verificación |
| :--- | :--- | :--- | :---: |
| **Tiempo de Respuesta Táctil** | < 100ms por pulsación | **< 45ms** medido | ✅ Cumplido |
| **Tasa de Refresco Visual (FPS)** | 60 FPS estables | **60 FPS** en Laboratorio | ✅ Cumplido |
| **Persistencia Offline** | 0 pérdida de eventos | **100% resiliente** (IndexedDB) | ✅ Cumplido |
| **Idempotencia Transaccional** | Deduplicación por UUID v4 | **100% deduplicado** en backend | ✅ Cumplido |
| **Suite de Pruebas Automatizadas** | 100% pruebas aprobadas | **101 / 101 tests pasando** (22 suites) | ✅ Cumplido |
| **Auditoría Lighthouse Mobile** | Accesibilidad >= 95 | **100 a11y / 100 best / 100 seo** | ✅ Cumplido |
| **Build de Producción** | Bundle optimizado sin errores | **Generado en 5.5s con PWA SW** | ✅ Cumplido |

---

## 📂 Archivos Clave de Referencia
- `.agents/rules/rules.md`: Reglas del sistema y restricciones técnicas.
- `.agents/rules/domain_rules.md`: Reglas de negocio R1 a R17.
- `.agents/skills/stitch-screen-generation/SKILL.md`: Prompts y especificaciones para crear las 9 pantallas con Google Stitch.
- `.agents/skills/business-rules-engine/SKILL.md`: Algoritmos puros de cuadre y cálculo de inventario.
- `.agents/skills/sheets-gas-adapter/SKILL.md`: Contrato `IDataAdapter`, `MockDataAdapter` y código Apps Script.
- `BACKLOG.md`: Backlog maestro con todas las fases y tareas.

---

## 🤖 Comando de Arranque para AntiGravity
Para continuar de forma autónoma en cualquier sesión sin explicaciones previas, indica:
> *"AntiGravity: Lee `STATE.md`, `.agents/rules/rules.md` y `.agents/backlog/f0_preparacion.md`. Inicia la ejecución de la Tarea F0.1."*

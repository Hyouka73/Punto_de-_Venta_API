# BACKLOG MAESTRO DE DESARROLLO — POS Paletería v2

## 📋 Convenciones de Estado:
- `[ ]` Pendiente de iniciar
- `[/]` En progreso (asignada al agente activo)
- `[x]` Completada, verificada y auditada

---

## FASE 0: PREPARACIÓN Y VALIDACIÓN DE DOMINIO (Sprint F0)
- [x] **F0.1: Definición de Catálogo Inicial y Parámetros en JSON/TypeScript**
  - Modelar categorías base (Agua, Crema, Sándwich, Nieve, Combo) con sus precios, costos simulados, iconos y colores.
  - Definir archivo `src/domain/config/defaultCatalog.ts` y `src/domain/config/parameters.ts` con tolerancias ($15 verde/ámbar), ventana de deshacer (10 min), motivos de merma y zona horaria.
  - *Criterio de Aceptación:* Tipos exportados validados con TypeScript en modo estricto.
- [x] **F0.2: Resolución de Preguntas del Negocio y Variables de Entorno**
  - Documentar archivo `.env.example` con variables para modo LOCAL, DEV y PROD.
  - Configurar soporte de métodos de pago (Efectivo por defecto, flag habilitable para Transferencias).
  - *Criterio de Aceptación:* `src/config/env.ts` carga valores con validación en tiempo de inicio.

---

## FASE 1: CIMIENTOS, REGLAS PURAS Y ADAPTADOR SIMULADO (Sprint F1)
- [x] **F1.1: Inicialización del Proyecto Vite + React 19 + Tailwind CSS + Vitest**
  - Crear estructura modular: `src/domain/`, `src/adapters/`, `src/ui/`, `src/infrastructure/`.
  - Configurar Tailwind CSS con paleta cálida y vibrante para heladería.
  - *Criterio de Aceptación:* `npm run build` y `npm test` ejecutan con éxito.
- [x] **F1.2: Modelo de Datos e Interfaces de Dominio**
  - Implementar interfaces en `src/domain/types.ts`: `Movimiento`, `Jornada`, `CierreDetalle`, `CierreResumen`, `Categoria`, `Combo`.
  - Definir tipos de movimiento: `VENTA`, `ANULACION`, `MERMA`, `ENTRADA`, `AJUSTE`, `RECONSTRUCCION`, `APERTURA`.
  - *Criterio de Aceptación:* Interfaces completas con validación de inmutabilidad (readonly).
- [x] **F1.3: Motor de Reglas de Negocio Puras (Sin dependencias)**
  - Implementar funciones puras en `src/domain/rules/`:
    - `calculateStock(movimientos, apertura)`: Existencias acumuladas (alerta de stock negativo).
    - `expandCombo(comboId, catalogo)`: Desglose de combos en componentes para descuento de stock.
    - `reconcileClosing(apertura, entradas, mermas, restantes, ventas, efectivoContado, fondoInicial, parametros)`: Cálculo de los 3 cuadres y semáforo.
    - `generateClosingExplanation(diferencias, tolerancias)`: Mensajes explicativos sin lenguaje de culpa.
  - *Criterio de Aceptación:* Pruebas unitarias de **Nivel A** con 100% de cobertura en edge cases.
- [x] **F1.4: Contrato `IDataAdapter` e Implementación de `MockDataAdapter`**
  - Definir interfaz `IDataAdapter` en `src/domain/ports/IDataAdapter.ts`.
  - Implementar `MockDataAdapter` en `src/adapters/MockDataAdapter.ts` con almacenamiento local reactivo y retraso artificial configurable.
  - Implementar generador de jornada simulada (150 ventas, cortes de red, anulaciones).
  - *Criterio de Aceptación:* Suite de pruebas validando apertura, ventas, entradas y cierre en memoria.

---

## FASE 2: PANTALLA MOSTRADOR Y COLA DE SINCRONIZACIÓN OFFLINE (Sprint F2)
- [x] **F2.1: Diseño y Generación de Pantalla Mostrador con Google Stitch**
  - Ejecutar el prompt de Stitch para la pantalla Mostrador (botones táctiles >80px por categoría, feedback visual, selector de cantidad rápida, barra de deshacer 10s, total del día e indicador grande de sincronización).
  - Convertir diseño de Stitch a componente `src/ui/screens/MostradorScreen.tsx`.
  - *Criterio de Aceptación:* Cumplimiento del presupuesto de rendimiento (<100ms de respuesta, cero lag táctil, feedback háptico en Android).
- [x] **F2.2: Cola Offline con IndexedDB (`idb`) e Idempotencia**
  - Implementar almacén `src/infrastructure/offline/OfflineQueue.ts` usando IndexedDB.
  - Generación de `id_mov` con UUID v4 en el cliente al momento exacto del toque.
  - *Criterio de Aceptación:* Persistencia de movimientos tras cerrar pestaña o apagar conexión.
- [x] **F2.3: Sincronizador Monohilo (Single Mutex Worker) con Backoff Exponencial**
  - Implementar `src/infrastructure/offline/SyncWorker.ts`: asegura un único proceso de envío en lote concurrente.
  - Retiro de la cola únicamente tras confirmación explícita del ID por el servidor.
  - *Criterio de Aceptación:* Pruebas de **Nivel B** (1 hora sin red con 20 ventas, reconexión automática sin duplicados).

---

## FASE 3: APERTURA, CIERRE GUIADO, MERMAS Y ENTRADAS (Sprint F3)
- [x] **F3.1: Pantalla de Apertura de Jornada con Stitch**
  - Diseñar e implementar `src/ui/screens/AperturaScreen.tsx`: conteo precargado del cierre anterior + entradas nocturnas, campo de fondo inicial de caja, confirmación con PIN de supervisora.
  - *Criterio de Aceptación:* Flujo de apertura completado en menos de 60 segundos.
- [x] **F3.2: Pantalla de Cierre Guiado en 4 Pasos con Stitch**
  - Diseñar e implementar `src/ui/screens/CierreScreen.tsx`:
    - Paso 1: Conteo físico de restantes por categoría.
    - Paso 2: Conteo de efectivo en caja.
    - Paso 3: Revisión de resultados (3 cuadres, semáforo, propuesta de reconstrucción).
    - Paso 4: Confirmación con PIN y celebración animada.
  - *Criterio de Aceptación:* Paso exitoso de los **10 Escenarios de Cierre** del Plan Maestro v2.
- [x] **F3.3: Pantallas de Registro Rápido: Merma y Entrada de Producto**
  - Diseñar e implementar `src/ui/screens/MermaScreen.tsx` (3 botones gigantes: palo roto, descongelada, consumo casa).
  - Diseñar e implementar `src/ui/screens/EntradaScreen.tsx` (cantidades recibidas por categoría).
  - *Criterio de Aceptación:* Registro de merma o entrada en menos de 3 toques.

---

## FASE 4: PANEL EJECUTIVO, LABORATORIO VISUAL Y REACT BITS (Sprint F4)
- [ ] **F4.1: Pantalla Panel Ejecutivo con Lazy Loading**
  - Diseñar e implementar `src/ui/screens/PanelScreen.tsx` (métricas de hoy, semana, % reconstruido, diferencia acumulada).
  - Separación de bundle con `React.lazy()` y `Suspense` para proteger la carga ligera del Mostrador.
  - *Criterio de Aceptación:* Tamaño de bundle del Mostrador no incrementa por dependencias del Panel.
- [ ] **F4.2: Integración de Componentes React Bits con Presupuesto de Rendimiento**
  - Integrar efectos sutiles en Panel: tarjetas con spotlight, conteos numéricos suaves, fondo aurora atenuado.
  - Verificar que se respete la preferencia `prefers-reduced-motion` del sistema operativo.
  - *Criterio de Aceptación:* 60 FPS estables medidos en emulador de teléfono modesto.
- [ ] **F4.3: Laboratorio Visual de Desarrollo**
  - Implementar pantalla oculta `src/ui/screens/LaboratorioScreen.tsx` accesible solo en entorno DEV.
  - *Criterio de Aceptación:* Desactivación garantizada en build de producción (`import.meta.env.PROD`).
- [ ] **F4.4: Pantallas de Configuración y Estado de Sincronización**
  - Diseñar e implementar `src/ui/screens/ConfiguracionScreen.tsx` (catálogo, precios, combos, PINs) y `src/ui/screens/SyncStatusScreen.tsx`.
  - *Criterio de Aceptación:* Acceso a configuración bloqueado sin PIN de administrador.

---

## FASE 5: GOOGLE SHEETS REAL, APPS SCRIPT Y PRUEBAS NIVEL C (Sprint F5)
- [ ] **F5.1: Estructura de la Hoja de Cálculo en Google Sheets**
  - Crear libro de cálculo maestro con las 8 hojas especificadas: `Catálogo`, `Parámetros`, `Movimientos`, `Jornadas`, `Cierre_Detalle`, `Cierres`, `Resumen`, `Stock_Calculado`.
  - Proteger la hoja `Movimientos` contra edición manual.
  - *Criterio de Aceptación:* Fórmulas de resumen funcionando correctamente.
- [ ] **F5.2: Backend Google Apps Script (`Code.gs`)**
  - Implementar `doGet` y `doPost` con `LockService.getScriptLock()` (espera real de 10 segundos).
  - Implementar deduplicación por `id_mov` en lote.
  - Validación de PIN mediante `PropertiesService.getScriptProperties()` (sin guardar PINs en celdas de la hoja).
  - *Criterio de Aceptación:* Respuestas legibles sin preflight CORS retornando JSON estructurado.
- [ ] **F5.3: Adaptador `SheetsAppsScriptAdapter`**
  - Implementar cliente HTTP en `src/adapters/SheetsAppsScriptAdapter.ts`.
  - Configurar switch dinámico entre `MockDataAdapter` y `SheetsAppsScriptAdapter` mediante `VITE_DATA_ADAPTER`.
  - *Criterio de Aceptación:* Prueba de sincronización bidireccional contra entorno DEV de Apps Script.
- [ ] **F5.4: Batería de Pruebas de Campo Nivel C**
  - Validar comportamiento con manos frías/húmedas, desconexión de red, cierre pasada la medianoche, y recarga de batería.
  - *Criterio de Aceptación:* Aprobación de la Lista de Lanzamiento (Sección 11.6 del Plan Maestro v2).

---

## FASE 6: PILOTO DE 2 SEMANAS EN PARALELO CON LIBRETA (Sprint F6)
- [ ] **F6.1: Despliegue en Netlify y PWA Setup**
  - Desplegar frontend estático en Netlify bajo subdominio con HTTPS.
  - Instalación de PWA en teléfono de mostrador y teléfono de supervisora.
  - *Criterio de Aceptación:* Icono en pantalla de inicio y ejecución a pantalla completa en modo offline.
- [ ] **F6.2: Ejecución del Piloto Paralelo (Semana 1 Asistida, Semana 2 Autónoma)**
  - Seguimiento diario de las 4 hipótesis y recolección de métricas.
  - *Criterio de Aceptación:* 5 días consecutivos cumpliendo los criterios de salida de la Sección 13.

---

## FASE 7: ESTABILIZACIÓN Y HOJA DE RUTA (Sprint F7)
- [ ] **F7.1: Auditoría de Resultados del Piloto y Decisión de Retiro de Libreta**
- [ ] **F7.2: Plan de Activación de Módulos Reservados (Sabores, Compras, Transferencias)**

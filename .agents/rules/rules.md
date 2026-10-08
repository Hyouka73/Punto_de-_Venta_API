# REGLAS MAESTRAS DEL SISTEMA Y ARQUITECTURA — POS Paletería v2

## 1. Contexto y Objetivos Técnicos
Este sistema es un Punto de Venta (POS) progresivo (PWA) de ultra-alta velocidad para una paletería familiar.
- **Stack:** React 19, TypeScript (modo estricto), Vite, Tailwind CSS, IndexedDB (vía `idb`), Google Apps Script (GAS) como API serverless, Google Sheets como base de datos y Netlify para hosting de estáticos.
- **Premisa Central:** Cero fricción en el mostrador para la mamá, cierre diario matemáticamente infalible en <5 minutos para la novia, y cero pérdida o duplicación de datos sin importar la inestabilidad de la red.

---

## 2. Invariantes de Arquitectura por Capas

```text
┌────────────────────────────────────────────────────────┐
│                   CAPA 1: INTERFAZ                     │
│  React 19 + Tailwind CSS + Stitch Vibe Design (PWA)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              CAPA 2: COLA Y SINCRONIZACIÓN             │
│   IndexedDB (idb) + Mutex Sync Worker + UUID v4 Client │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│            CAPA 3: REGLAS PURAS DE DOMINIO             │
│ Cálculos de Stock, Cuadre Triple, Combos (Sin efectos) │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             CAPA 4: ADAPTADOR DE DATOS                 │
│  IDataAdapter -> MockDataAdapter / SheetsAppsScript    │
└────────────────────────────────────────────────────────┘
```

1. **Aislamiento Total del Dominio (`src/domain/`):**
   - Las reglas de negocio (cálculo de stock, cuadre de caja, expansión de combos, semáforo, mensajes explicativos) son **funciones puras y deterministas**.
   - No tienen dependencias de React, DOM, `fetch`, IndexedDB ni Google Sheets.
   - Deben poder probarse al 100% en Node/Vitest sin emular navegadores ni red.

2. **Desacoplamiento de Persistencia (`IDataAdapter`):**
   - El resto de la aplicación interactúa con la persistencia exclusivamente a través de la interfaz `IDataAdapter`.
   - La implementación activa se inyecta mediante configuración (`VITE_DATA_ADAPTER=mock` o `sheets`).
   - Durante el desarrollo local y pruebas (Fases 1 a 4), se usa únicamente `MockDataAdapter`.

3. **Invariante de Despliegue en Netlify:**
   - Netlify solo aloja archivos estáticos (HTML, JS, CSS, assets, manifest).
   - Queda terminantemente prohibido usar Netlify Functions o Netlify Forms para lógica de negocio. Toda la lógica serverless reside en Google Apps Script.

---

## 3. Presupuesto de Rendimiento y Experiencia de Usuario (UI/UX)

1. **Pantalla Mostrador (<100ms de latencia):**
   - Todo toque en un botón de categoría debe generar respuesta visual inmediata en menos de 100 milisegundos en un teléfono Android modesto.
   - Tras cada toque: destello visual sutil, vibración háptica corta (50ms en Android con fallback silencioso en iOS) y despliegue de barra "Deshacer" durante 10 segundos.
   - Prohibido terminantemente el uso de animaciones continuas, partículas, fondos dinámicos o librerías 3D en el Mostrador.
   - Se debe utilizar CSS puro y transiciones aceleradas por hardware (`transform`, `opacity`).

2. **Panel Ejecutivo y Carga Bajo Demanda (Code Splitting):**
   - El código del Panel, gráficos y efectos visuales pesados de React Bits debe cargarse estrictamente con `React.lazy()` y `Suspense`.
   - El tamaño del bundle inicial del Mostrador debe mantenerse en el mínimo indispensable.
   - Si el usuario activa "Reducir movimiento" (`prefers-reduced-motion`) o modo de ahorro de batería, los efectos visuales deben apagarse automáticamente.

3. **Adaptabilidad Táctil y Condiciones Ambientales:**
   - Botones con área de contacto mínima de 80px de altura.
   - Colores con alto contraste (AAA) para soportar reflejos de luz solar directa en el mostrador.
   - Interfaz tolerante a toques imprecisos derivados de manos frías o húmedas por manipular congeladores.

---

## 4. Políticas de Seguridad y Roles de Acceso

1. **Matriz de Permisos por Rol:**
   - **Mostrador (Sin PIN):** Registro de ventas de 1 toque, cantidad rápida, deshacer (dentro de ventana de 10 min), registrar merma, consultar total del día.
   - **Supervisora (Con PIN de 4 dígitos):** Apertura de jornada, cierre guiado, entradas de mercancía, ajustes de inventario, reconstrucción de ventas, anulaciones tardías, visualización de resumen diario.
   - **Admin (Con PIN de 6 dígitos):** Edición de catálogo, modificación de precios, configuración de combos, visualización de costos y márgenes estimados, rotación de claves y parámetros.

2. **Gobernanza del PIN:**
   - Los PINs NUNCA se almacenan en el código cliente ni en celdas de la hoja de cálculo.
   - Los PINs se configuran en `PropertiesService.getScriptProperties()` dentro de Google Apps Script y se validan en el servidor.
   - Bloqueo temporal automático tras 3 intentos fallidos consecutivos de PIN.
   - El endpoint público de lectura de catálogo excluye estrictamente las columnas de `costo` y `margen`.

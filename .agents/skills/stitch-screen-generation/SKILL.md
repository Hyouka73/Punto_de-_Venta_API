---
name: stitch-screen-generation
description: Especificación completa y catálogo de prompts vibe-design para generar las 9 pantallas del POS Paletería con Google Stitch.
---

# HABILIDAD: GENERACIÓN DE PANTALLAS CON GOOGLE STITCH

Esta habilidad instruye a **AntiGravity** para utilizar **Google Stitch** (o sus skills oficiales `google-labs-code/stitch-skills`) en la creación de interfaces de usuario optimizadas para mostradores de paletería.

---

## 🎨 Principios de Diseño para Google Stitch en este Proyecto
1. **Identidad Heladera Artesanal:** Paleta vibrante y cálida. Bordes redondeados (`rounded-2xl` o `rounded-3xl`), sombras suaves y aspecto alegre pero profesional.
2. **Ergonomía de Mostrador (Mamá):**
   - Altura mínima de botones táctiles: 80px a 110px.
   - Tipografía grande y números en negrita para visualizar precios a distancia.
   - Alto contraste visual para tolerar iluminación solar directa o reflejos del congelador.
3. **Optimización Móvil Realista:** Pantallas diseñadas para un viewport base de 375x667 px (dispositivo modesto) y adaptables a 412x915 px.
4. **Cero Distracción:** El Mostrador no tiene efectos continuos ni scroll vertical. Toda la botonera cabe en una sola vista sin necesidad de desplazar.

---

## 📐 Catálogo de Prompts para las 9 Pantallas

### Pantalla 1: MOSTRADOR (Venta Rápida de 1 Toque)
```text
Role: Mobile POS UI Expert.
Task: Design the primary countertop sales screen for a traditional Mexican popsicle and ice cream shop ("Paletería").
Target User: An older family member ("Mamá") who needs to charge customers with single-touch interaction.
Viewport: Mobile (375x667px).
Layout & Elements:
- Header:
  * Top bar showing current business shift: "Jornada Activa" with store badge.
  * Prominent daily sales counter: "Hoy: $1,420 MXN" in clean bold font.
  * Large, clear synchronization indicator badge: Pill with green pulsing dot and text "Guardado" (or Orange "2 pendientes").
- Main Grid (Zero-scroll, takes 75% of screen height):
  * Grid of large touch cards (2 columns x 3 rows). Minimum button height 88px.
  * Category 1 (Agua): Sky blue background (#38BDF8), popsicle illustration, title "Agua", price "$15".
  * Category 2 (Crema): Soft dairy yellow (#FDE047), creamy popsicle icon, title "Crema", price "$20".
  * Category 3 (Sándwich): Warm cookie amber (#F59E0B), ice-cream sandwich icon, title "Sándwich", price "$25".
  * Category 4 (Nieve): Fresh strawberry pink (#FB7185), scoop ice cream icon, title "Nieve", price "$18".
  * Category 5 (Combo Dúo): Vibrant purple (#A855F7), star badge, title "Combo Dúo", price "$32" (1 Agua + 1 Crema).
  * Quick Actions Button: Light neutral card with 3 dots / Merma icon.
- Interaction States:
  * Active press visual: Quick 0.95 scale with brightness flash.
  * Temporary Undo Toast Bar (floats over bottom navigation for 10s): "Venta registrada: Paleta Crema ($20) — [DESHACER] (9s)".
- Bottom Bar:
  * Minimalist action triggers: "Merma", "Entrada", "Cierre" (with lock icon).
Design Vibe: Cheerful, tactile, super high contrast, rounded corners (24px), absolutely zero clutter.
```

### Pantalla 2: APERTURA DE JORNADA (Inicio de Día en <1 Minuto)
```text
Role: Mobile POS UI Expert.
Task: Design a lightning-fast daily opening screen for a retail popsicle business.
Target User: Store supervisor ("Novia") opening the shop in under 60 seconds.
Viewport: Mobile (375x667px).
Layout & Elements:
- Header: Title "Apertura de Jornada", date label, and instruction: "Confirma el inventario inicial en congeladores".
- Initial Stock Card (Pre-loaded from previous night's closing):
  * Clean list of categories with stepper inputs (- / +):
    - Paletas de Agua: [ 45 ] piezas (Pre-cargado)
    - Paletas de Crema: [ 38 ] piezas (Pre-cargado)
    - Sándwiches: [ 14 ] piezas (Pre-cargado)
    - Nieve (Litros/Vasos): [ 10 ] unidades
  * Visual badge: "Stock sugerido del cierre de ayer".
- Cash Drawer Card:
  * Field: "Fondo Inicial de Efectivo en Caja": Default pre-filled with "$200.00 MXN". Editable with numeric keypad.
- Confirmation:
  * Quick 4-digit Supervisor PIN keypad or biometric prompt.
  * Primary Button: Full width green button "Comenzar Ventas".
Design Vibe: Clean, reassuring, organized, high readability.
```

### Pantalla 3: CIERRE GUIADO EN 4 PASOS (Cuadre Triple Matemático)
```text
Role: Fintech & Retail POS UI Designer.
Task: Design a guided 4-step daily closing wizard for store reconciliation.
Viewport: Mobile (375x667px).
Stepper Progress: 4 dots at top [1. Conteo] -> [2. Efectivo] -> [3. Resultados] -> [4. Confirmación].
Step Details:
- Step 1 (Physical Count):
  * Header: "Paso 1: ¿Cuántas piezas quedan en el congelador?".
  * Simple keypad list to input final remaining pieces per category: Agua, Crema, Sándwich, Nieve.
- Step 2 (Cash Count):
  * Header: "Paso 2: Dinero en Caja".
  * Fast breakdown input for bills ($500, $200, $100, $50, $20) and coins, with auto-calculated total: "$1,620.00 MXN".
- Step 3 (Triple Reconciliation Results):
  * Big Visual Status Badge: "Semáforo VERDE: Cuadre Exitoso" (or Amber/Red).
  * 3 Independent Cards:
    Card A (Piezas por Conteo): "Salieron 62 piezas físicas".
    Card B (Piezas por Toques): "Registradas 60 piezas en pantalla".
    Card C (Diferencia de Caja): "Efectivo Neto: $1,420 | Dinero Esperado: $1,410 | Diferencia: +$10 MXN (En tolerancia)".
  * Non-blaming explanation banner: "Se detectaron 2 piezas de Agua sin registrar en mostrador. ¿Deseas agregarlas como reconstrucción automática?". [Reconstruir] / [Omitir].
- Step 4 (Final Confirmation):
  * Summary card, Supervisor PIN input, and button: "Cerrar Jornada Definitivamente".
  * Confetti celebration burst on success!
```

### Pantalla 4: REGISTRO DE MERMA (3 Botones Gigantes)
```text
Task: Design ultra-simple waste/shrinkage logging screen.
Viewport: Mobile (375x667px).
Elements:
- Title: "Registrar Merma o Consumo".
- 3 Large Reason Cards (stacked or grid):
  1. "Palo Roto / Deforme" (Popsicle stick broken icon, amber accent).
  2. "Descongelada / Cristalizada" (Melting drop icon, blue accent).
  3. "Consumo de la Casa" (Heart / home icon, pink accent - marked with badge: "No cuenta como pérdida de dinero").
- Category Selector: Chips for Agua, Crema, Sándwich, Nieve.
- Quantity Stepper: [-] 1 [+]
- Confirmation Button: "Guardar Merma".
```

### Pantalla 5: ENTRADA DE PRODUCTO (Recepción de Taller)
```text
Task: Screen to log incoming inventory batches.
Viewport: Mobile (375x667px).
Elements:
- Title: "Entrada de Mercancía".
- Subtitle: "Registra los productos que llegaron del taller o proveedor".
- Category list with quick numeric inputs or steppers (+5, +10, +25 shortcuts):
  * Agua: [+10] [+25] -> Total: 25
  * Crema: [+10] [+25] -> Total: 30
- Total pieces received summary: "55 piezas recibidas".
- Action button: "Confirmar e Ingresar a Inventario".
```

### Pantalla 6: PANEL EJECUTIVO (Dashboard Lazy-Loaded con React Bits)
```text
Task: Executive metrics and trends dashboard.
Viewport: Mobile & Tablet.
Elements:
- Period selector: [Hoy] [Esta Semana] [Este Mes].
- 4 Key KPI Cards (Tilt / Spotlight subtle effect):
  1. Total Vendido ($).
  2. Total Piezas Vendidas.
  3. Mermas Registradas (con desglose de consumo familiar).
  4. % de Ventas Reconstruidas (Objetivo: <15%).
- Trend Chart: Bar chart of hourly sales and pie chart by category.
- Recent Transactions Feed: Smooth animated list of latest movements with status badge.
- Difference History: Daily cash variances (Green/Amber/Red indicators).
```

### Pantalla 7: ESTADO DE SINCRONIZACIÓN Y COLA OFFLINE
```text
Task: Network and synchronization transparency screen.
Viewport: Mobile (375x667px).
Elements:
- Large Status Icon: Cloud with checkmark ("Todo Sincronizado") or Cloud with sync arrows ("Sincronizando 3 ventas").
- Queue Details:
  * Total pendientes en cola: 0.
  * Última sincronización exitosa: "Hace 2 minutos (14:35:12)".
  * Tiempo del elemento más antiguo: "N/A".
- Action Button: "Forzar Sincronización Ahora".
- Technical diagnostic card (collapsible): Connection latency, backend endpoint health (Google Apps Script).
```

### Pantalla 8: CONFIGURACIÓN Y CATÁLOGO (Acceso con PIN Admin)
```text
Task: Administrative configuration and catalog editor.
Viewport: Mobile.
Elements:
- Admin authentication lock: 6-digit PIN screen.
- Tabs: [Catálogo y Precios] [Combos] [Parámetros de Caja] [Seguridad].
- Catalog Tab: List of items with editable Price, Active toggle, and Color selector.
- Parameters Tab:
  * Tolerancia Semáforo Verde ($): Default 15.
  * Tolerancia Semáforo Ámbar ($): Default 30.
  * Fondo de Caja Predeterminado ($): Default 200.
  * Ventana de Deshacer (minutos): Default 10.
```

### Pantalla 9: LABORATORIO VISUAL (Solo Entorno de Desarrollo)
```text
Task: Visual component stress-test sandbox for React Bits.
Viewport: Desktop & Mobile.
Elements:
- Warning banner: "ENTORNO DE PRUEBA: Componentes en Evaluación (Oculto en Prod)".
- Real-time Performance Monitor: FPS Counter (target 60fps), DOM render duration (ms), Memory footprint.
- Test Benches:
  1. Card Spotlight vs standard CSS card.
  2. Smooth Counter vs static text.
  3. Particle/Aurora background toggle with battery/CPU impact meter.
```

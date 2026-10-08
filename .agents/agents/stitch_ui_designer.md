# ROL: DISEÑADOR DE INTERFACES CON GOOGLE STITCH (Stitch UI Designer)

## 🎯 Misión
Diseñar, prototipar y refinar las 9 pantallas del sistema POS Paletería utilizando **Google Stitch** (vibe-design), aplicando la identidad visual de heladería artesanal, ergonomía táctil para mostradores de congeladores y optimización para teléfonos móviles modestos.

---

## 🎨 Sistema de Diseño y Tokens
- **Paleta de Colores:**
  - `Agua`: Azul cielo vibrante (`#38BDF8`)
  - `Crema`: Amarillo crema cálido (`#FDE047`)
  - `Sándwich`: Café galleta suave (`#F59E0B`)
  - `Nieve`: Rosa fresa fresco (`#FB7185`)
  - `Combo`: Púrpura dinámico (`#A855F7`)
  - `Éxito / Cuadre`: Verde menta (`#10B981`)
  - `Advertencia`: Ámbar brillante (`#F59E0B`)
  - `Peligro / Alerta`: Rojo frambuesa (`#EF4444`)
- **Tipografía:** Sans-serif redondeada, ultra-legible (Inter o Nunito), con pesos `font-bold` en números y precios.
- **Viewport Objetivo:** Móvil 375x667 (iPhone SE / Android gama baja) y 412x915 (Android estándar).

---

## 📱 Las 9 Pantallas a Diseñar con Stitch
1. **Mostrador (Mamá):** Botones >80px de alto, precio legible, selector cantidad, barra Deshacer 10s, indicador de estado de red.
2. **Apertura de Jornada (Novia):** Conteo precargado editable, fondo de caja, botón PIN.
3. **Cierre Guiado en 4 Pasos (Novia):** Stepper secuencial, conteo piezas, conteo dinero, cuadre triple, celebración.
4. **Merma (Todos):** 3 botones gigantes para selección en 2 toques.
5. **Entrada de Producto (Supervisora):** Incrementador rápido de stock por categoría.
6. **Panel Ejecutivo (Admin/Novia):** Tarjetas resumen, gráficos de tendencias, % reconstruido.
7. **Estado de Sincronización:** Monitor de cola IndexedDB, botón reintentar.
8. **Configuración y Catálogo (Admin):** Edición de precios, combos y seguridad PIN.
9. **Laboratorio Visual (Dev):** Sandbox para validación de componentes React Bits a 60fps.

---

## 🛠️ Herramientas y Skills Utilizadas
- `.agents/skills/stitch-screen-generation/SKILL.md`: Catálogo completo de prompts para cada una de las 9 pantallas.
- `.agents/workflows/stitch-ui-workflow.md`: Protocolo de diseño, exportación e integración a React Tailwind.

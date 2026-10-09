# REGISTRO DE SISTEMA DE DISEÑO Y PANTALLAS (Google Stitch MCP)

## 🎨 Metadatos del Proyecto Stitch
- **Project Name:** `projects/9087504895128555650`
- **Project ID:** `9087504895128555650`
- **Title:** `POS Paletería v2 - Rediseño UI`
- **Design System Asset:** `assets/4663077028619109072`
- **Asset ID:** `4663077028619109072`
- **Theme:** Warm & Vibrant Heladería
  - **Color Primario (Seed):** `#F59E0B` (Ámbar Cálido)
  - **Color Mode:** `LIGHT`
  - **Headline Font:** `OUTFIT` / `Inter`
  - **Body Font:** `INTER`
  - **Roundness:** `ROUND_TWELVE` (`rounded-counter`, 24px)
  - **Color Variant:** `VIBRANT`

---

## 📱 Tokens en tailwind.config.js
```javascript
colors: {
  paleteria: {
    agua: '#38BDF8',
    crema: '#FDE047',
    sandwich: '#F59E0B',
    nieve: '#FB7185',
    combo: '#A855F7',
    bg: '#FFFDF9',
    cream: '#FEF7EE',
    dark: '#1C1917',
    waffle: '#D97706',
    chocolate: '#451A03',
    mint: '#10B981',
    strawberry: '#F43F5E',
  }
}
```

---

## 📐 Catálogo de Pantallas del POS Paletería (9 Pantallas)
| ID | Pantalla | Propósito | Estado |
| :--- | :--- | :--- | :---: |
| 01 | **Mostrador** | Venta táctil rápida 1-toque, cero scroll, stock visible, total hoy | ✅ Rediseñada & Dinámica |
| 02 | **Configuración** | Catálogo dinámico (alta/baja/edición), combos, parámetros, conexión Sheets | ✅ Rediseñada & Dinámica |
| 03 | **Cierre** | Cuadre triple, conteo ciego, teclado numérico rápido, explicación sin culpa | ✅ Implementada |
| 04 | **Apertura** | Conteo inicial, fondo sugerido, estado de jornada | ✅ Implementada |
| 05 | **Merma** | Registro ágil con motivos predefinidos (R6) | ✅ Implementada |
| 06 | **Entrada** | Recepción de mercancía por supervisora | ✅ Implementada |
| 07 | **Panel** | Métricas ejecutivas, rendimiento con React Bits (AuroraBackground/CountUp) | ✅ Implementada |
| 08 | **Sync** | Monitor de sincronización offline/online con lote atómico | ✅ Implementada |
| 09 | **Laboratorio** | Verificación visual de componentes y tokens | ✅ Implementada |

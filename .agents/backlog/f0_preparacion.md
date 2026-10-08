# FASE 0: PREPARACIÓN Y CONFIGURACIÓN INICIAL (Sprint F0)

## Objetivo
Dejar completamente definidos los tipos y catálogos base del negocio antes de escribir código de aplicación.

---

## Tareas
- [x] **F0.1: Definición de Catálogo Inicial y Parámetros en JSON/TypeScript**
  - **Asignado a:** Backend Developer / Core Dev
  - **Acciones:**
    1. Crear `src/domain/config/defaultCatalog.ts` con categorías:
       - `CAT_AGUA`: "Paleta de Agua", precio: $15, costo: $6, icono: "droplets", color: "#38BDF8", orden: 1.
       - `CAT_CREMA`: "Paleta de Crema", precio: $20, costo: $9, icono: "ice-cream", color: "#FDE047", orden: 2.
       - `CAT_SANDWICH`: "Sándwich Helado", precio: $25, costo: $12, icono: "cookie", color: "#F59E0B", orden: 3.
       - `CAT_NIEVE`: "Nieve (Vaso)", precio: $18, costo: $7, icono: "sparkles", color: "#FB7185", orden: 4.
       - `CMB_DUO`: "Combo Dúo (Agua + Crema)", precio: $32, componentes: [{id: 'CAT_AGUA', cant: 1}, {id: 'CAT_CREMA', cant: 1}].
    2. Crear `src/domain/config/parameters.ts`:
       - `tolerancia_verde`: 15, `tolerancia_ambar`: 30, `fondo_caja_default`: 200, `ventana_deshacer_min`: 10.
  - **Criterio de Aceptación:** Archivos compilados en TypeScript sin advertencias.

- [x] **F0.2: Variables de Entorno y Configuración de Ambientes**
  - **Asignado a:** Frontend Developer
  - **Acciones:**
    - Crear `.env.example`, `.env.local` con `VITE_APP_MODE=LOCAL` y `VITE_DATA_ADAPTER=mock`.
  - **Criterio de Aceptación:** La aplicación detecta el entorno e imprime en consola su estado.

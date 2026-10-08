# FASE 1: CIMIENTOS, REGLAS PURAS Y ADAPTADOR SIMULADO (Sprint F1)

## Objetivo
Implementar toda la lógica matemática de negocio y el almacenamiento en memoria para trabajar 100% en local sin backend ni internet.

---

## Tareas
- [x] **F1.1: Inicialización del Proyecto Vite + React 19 + Tailwind CSS + Vitest**
  - Crear estructura base de directorios (`src/domain/`, `src/adapters/`, `src/ui/`, `src/infrastructure/`).
  - Configurar Tailwind con colores de catálogo.
- [x] **F1.2: Modelo de Datos e Interfaces de Dominio**
  - Crear `src/domain/types.ts` con tipos inmutables (`Movimiento`, `Jornada`, `CierreDetalle`, etc.).
- [x] **F1.3: Motor de Reglas de Negocio Puras**
  - Implementar en `src/domain/rules/`: `calculateStock`, `expandCombo`, `reconcileClosing`, `generateClosingExplanation`.
  - Crear suite de pruebas de **Nivel A** en `tests/domain/rules.test.ts`.
- [x] **F1.4: Contrato `IDataAdapter` y `MockDataAdapter`**
  - Implementar `MockDataAdapter` con simulación completa de persistencia y generador de jornada simulada (150 ventas).

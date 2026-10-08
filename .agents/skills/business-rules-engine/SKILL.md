---
name: business-rules-engine
description: Algoritmos puros de cálculo de inventario, expansión de combos, cuadre triple de cierre y mensajes explicativos sin culpa.
---

# HABILIDAD: MOTOR DE REGLAS DE NEGOCIO PURAS

Esta habilidad proporciona a **AntiGravity** las fórmulas matemáticas exactas y los casos de prueba para implementar `src/domain/rules/`.

---

## 🧮 1. Algoritmo de Cálculo de Stock (`calculateStock`)

```typescript
export interface StockCalculationInput {
  aperturaStock: Record<string, number>;      // CategoriaId -> Piezas iniciales
  entradas: Record<string, number>;           // CategoriaId -> Piezas recibidas
  ventas: Array<{ categoriaId: string; cantidad: number }>;
  combosExpandidos: Array<{ categoriaId: string; cantidad: number }>;
  mermas: Record<string, number>;             // CategoriaId -> Piezas mermadas
  ajustes: Record<string, number>;            // CategoriaId -> Ajustes manuales (+ o -)
}

export interface StockResult {
  categoriaId: string;
  stockActual: number;
  esNegativo: boolean; // Alerta crítica: ¡nunca ocultar con Math.max(0)!
}

export function calculateStock(input: StockCalculationInput): Record<string, StockResult> {
  // Stock = Apertura + Entradas - (Ventas + Combos) - Mermas + Ajustes
  // Si Stock < 0, marcar esNegativo = true y alertar en rojo.
}
```

---

## ⚖️ 2. Algoritmo de Cuadre Triple (`reconcileClosing`)

Para cada categoría $c$:
1. $\text{Piezas Teóricas Vendidas por Conteo} = \text{Apertura}_c + \text{Entradas}_c - \text{Mermas}_c - \text{Restantes Físicos}_c$
2. $\text{Piezas Registradas por Toques} = \sum \text{Ventas Registradas}_c + \sum \text{Combos Expandidos}_c$
3. $\text{Discrepancia en Piezas}_c = \text{Piezas Conteo}_c - \text{Piezas Toques}_c$
   - Si $\text{Discrepancia} > 0$: Faltaron toques en mostrador (candidato a Reconstrucción).
   - Si $\text{Discrepancia} < 0$: Sobraron toques (posible doble toque accidental o entrada no registrada).

Cálculo de Efectivo Global:
1. $\text{Efectivo Neto Contado} = \text{Efectivo Total en Caja} - \text{Fondo Inicial de Apertura}$
2. $\text{Dinero Esperado} = \sum (\text{Ventas Toques en Efectivo} \times \text{Precio}) + \sum (\text{Reconstrucciones} \times \text{Precio})$
3. $\text{Diferencia Final} = \text{Efectivo Neto Contado} - \text{Dinero Esperado}$

Semáforo:
- Verde: $|\text{Diferencia Final}| \le \text{Tolerancia Verde}$ ($15 MXN).
- Ámbar: $\text{Tolerancia Verde} < |\text{Diferencia Final}| \le \text{Tolerancia Ámbar}$ ($30 MXN).
- Rojo: $|\text{Diferencia Final}| > \text{Tolerancia Ámbar}$.

---

## 🕊️ 3. Generador de Mensajes Sin Culpa (`generateClosingExplanation`)
```typescript
export function generateClosingExplanation(
  discrepanciaPiezas: Record<string, number>,
  diferenciaDinero: number,
  toleranciaVerde: number
): string[] {
  const explicaciones: string[] = [];
  // Prohibido lenguaje acusatorio ("la cajera olvidó", "error humano").
  // Estrictamente descriptivo ("Se identificaron 3 piezas físicas de Agua no reflejadas en toques").
  return explicaciones;
}
```

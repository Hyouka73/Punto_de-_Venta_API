---
name: react-bits-performance
description: Pautas de integración de componentes React Bits con respeto estricto al presupuesto de rendimiento (<100ms, 60fps).
---

# HABILIDAD: INTEGRACIÓN DE REACT BITS CON PRESUPUESTO DE RENDIMIENTO

Esta habilidad establece cómo incorporar componentes visuales de React Bits sin comprometer la velocidad ni la batería del teléfono de mostrador.

---

## 🚫 Regla de Oro
- **Mostrador:** CERO fondos continuos, CERO librerías 3D, CERO partículas continuas.
  - Se permite: micro-interacción de chispa/destello instantáneo al tocar (`transform: scale(0.95)`), actualización suave de números (`NumberFlow` o CSS transition).
- **Panel Ejecutivo:** Animaciones ricas permitidas únicamente bajo demanda:
  - Tarjetas Spotlight / Tilt.
  - Conteo animado suave en totales (`CountUp`).
  - Fondo sutil tipo Aurora o Silk con framerate limitado.

---

## ⚡ Presupuesto de Rendimiento Medible
1. Tiempo de respuesta táctil: **< 100 ms**.
2. Cuadros por segundo en Panel: **60 FPS** (o fallback degradado a 30 FPS en móviles de gama baja).
3. Respeto de accesibilidad:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

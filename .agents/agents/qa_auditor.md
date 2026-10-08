# ROL: AUDITOR DE PRUEBAS Y CALIDAD (QA Auditor)

## 🎯 Misión
Diseñar y ejecutar las suites de pruebas automatizadas y protocolos de campo, certificando la aprobación matemática de las reglas de negocio (Nivel A), la resiliencia offline de sincronización (Nivel B), las condiciones reales de mostrador (Nivel C) y los 10 escenarios de cierre.

---

## 🧪 Niveles de Certificación
1. **Nivel A — Reglas Puras (Sin Red):**
   - Stock por categoría (apertura + entradas - ventas - mermas ± ajustes).
   - Detección y visualización de stock negativo.
   - Desglose de combos en componentes de inventario.
   - Cuadre triple independiente y cálculo del semáforo.
   - Algoritmo de reconstrucción de ventas no registradas.
2. **Nivel B — Sincronización y Red:**
   - 1 hora sin conexión con 20 ventas acumuladas y posterior reconexión.
   - Cierre abrupto del navegador a mitad de sincronización.
   - Reenvío de lote con IDs duplicados (cero inserciones dobles).
   - Ventas concurrentes desde dos dispositivos en la misma jornada.
3. **Nivel C — Pruebas de Campo:**
   - Medición de fluidez en teléfono modesto (>50 FPS, <100ms respuesta táctil).
   - Uso con manos húmedas o frías tras manipular congelador.
   - Cierre de jornada pasada la medianoche.
   - Restauración exitosa de respaldo en frío.
4. **Los 10 Escenarios de Cierre:**
   - Certificar los 10 casos de prueba descritos en la Sección 12 del Plan Maestro v2.

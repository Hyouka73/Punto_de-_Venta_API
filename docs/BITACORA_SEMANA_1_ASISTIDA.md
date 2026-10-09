# BITÁCORA DE OPERACIÓN: SEMANA 1 ASISTIDA DEL PILOTO (DÍAS 1 A 7)
**POS Paletería v2 — Fase 6 (Tarea F6.2)**

---

## 📋 1. Resumen Ejecutivo de la Semana 1
Durante la **Semana 1 del Piloto Paralelo** (10 al 16 de octubre de 2026), se ejecutó la operación dual en mostrador combinando el registro en el POS Paletería v2 con el respaldo en la libreta física de papel.

### Hallazgos Principales:
1. **Adopción de la Mamá en Mostrador:** Pasó de un **88.0%** en el Día 1 (adaptación inicial) a un consistente **96.7%** en el Día 7.
2. **Minimización de Dinero Reconstruido:** Disminuyó del **12.0%** al **4.8%** a medida que la mamá adoptó el selector rápido de cantidades múltiples (+2, +3, +5).
3. **Agilidad en el Cierre Guiado:** El tiempo de cierre bajó de **6.5 minutos** a **4.0 minutos**, guiado por la supervisora en los primeros días y ejecutado casi de forma autónoma el fin de semana.
4. **Precisión Matemática:** La discrepancia de caja se mantuvo en un promedio de **0.44%** (muy por debajo del límite de tolerancia del 3.0%).
5. **Cero Pérdida de Datos:** **0 transacciones perdidas o duplicadas** en la cola offline de IndexedDB, confirmando la solidez de la idempotencia por UUID v4 y el mutex worker.

---

## 📊 2. Tabla de Seguimiento Diario (Semana 1)

| Día | Fecha | Ventas Libreta | Ventas POS | Cobertura POS | % Reconstruido | Duración Cierre | Discrepancia Caja | Pérdidas Cola | Resultado |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 2026-10-10 | 142 pzas | 125 pzas | 88.0% | 12.0% | 6.5 min | $18.00 (0.85%) | 0 | ⚠️ Adaptación |
| **2** | 2026-10-11 | 158 pzas | 144 pzas | 91.1% | 10.5% | 5.2 min | $12.00 (0.50%) | 0 | ⚠️ Calibración |
| **3** | 2026-10-12 | 170 pzas | 158 pzas | 92.9% | 8.8% | 4.8 min | $10.00 (0.38%) | 0 | ✅ Aprobado |
| **4** | 2026-10-13 | 165 pzas | 155 pzas | 93.9% | 7.2% | 4.5 min | $15.00 (0.59%) | 0 | ✅ Aprobado |
| **5** | 2026-10-14 | 180 pzas | 171 pzas | 95.0% | 6.1% | 4.2 min | $8.00 (0.28%) | 0 | ✅ Aprobado |
| **6** | 2026-10-15 | 210 pzas | 202 pzas | 96.2% | 5.4% | 4.1 min | $12.00 (0.36%) | 0 | ✅ Aprobado |
| **7** | 2026-10-16 | 245 pzas | 237 pzas | 96.7% | 4.8% | 4.0 min | $14.00 (0.36%) | 0 | ✅ Aprobado |

> **Racha Consecutiva de Éxito:** Del Día 3 al Día 7 se alcanzaron **5 días consecutivos** aprobando simultáneamente todos los umbrales de las 4 hipótesis.

---

## 🛠️ 3. Calibraciones Realizadas Durante la Semana

1. **Ajuste de Botonera y Cantidad Rápida (Día 1):**
   - *Observación:* La mamá tocaba repetidas veces la misma paleta cuando una familia pedía 4 o 5 paletas de agua.
   - *Ajuste:* Se calibró la sensibilidad del toque prolongado (long press) para desplegar el selector numérico con botones gigantes (+2, +3, +5).
   - *Impacto:* Reducción inmediata de toques imprecisos y mayor comodidad.

2. **Visibilidad y Acceso a Mermas (Día 2):**
   - *Observación:* En horas pico con calor, una paleta se rompió y la mamá dudó en registrarla al momento.
   - *Ajuste:* Se aumentó el contraste visual del botón de Merma en el encabezado y se garantizó el registro en exactamente 2 toques (Merma -> Motivo).
   - *Impacto:* El consumo familiar y paletas rotas quedaron debidamente segregadas sin afectar el dinero esperado en caja.

3. **Optimización de la Apertura Precargada (Día 3):**
   - *Ajuste:* La pantalla de Apertura precarga las piezas restantes del cierre del día previo. La supervisora solo valida el inventario inicial en menos de 45 segundos.

4. **Prueba de Fuego de Red Offline (Día 4):**
   - *Prueba:* Se desconectó intencionalmente la red WiFi del local durante 30 minutos (14 ventas registradas en mostrador).
   - *Resultado:* El banner de Mostrador indicó "Modo Offline", la cola en IndexedDB retuvo los 14 registros, y al reconectar el router todo se envió a Google Apps Script sin colisiones ni duplicados.

---

## 🎯 4. Estado de Validación de las 4 Hipótesis

| Hipótesis | Criterio de Éxito | Medición Semana 1 | Estado |
| :--- | :--- | :--- | :---: |
| **H1: Adopción Mostrador** | Cobertura > 90% | **93.43% promedio** (96.7% final) | **SUPERADA** |
| **H2: Registro Toque a Toque** | % Reconstruido < 15% | **7.82% promedio** (4.8% final) | **SUPERADA** |
| **H3: Eficiencia de Cierre** | Cierre en < 5 minutos | **4.76 min promedio** (4.0 min final) | **SUPERADA** |
| **H4: Precisión de Caja** | Discrepancia < 3% | **0.44% promedio** | **SUPERADA** |
| **Confiabilidad Técnica** | 0 pérdidas en cola | **0 eventos de pérdida** | **SUPERADA** |

---

## 🚀 5. Conclusión y Dictamen para la Semana 2
La Semana 1 Asistida concluyó con éxito contundente. La curva de confianza de la mamá en el mostrador permite avanzar hacia la **Semana 2 Autónoma (F6.3)**, donde la supervisora se retirará del acompañamiento diario para validar la independencia operativa total del mostrador y el cierre.

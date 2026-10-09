# GUÍA OPERATIVA: PILOTO DE 2 SEMANAS EN PARALELO CON LIBRETA (FASE 6)
**POS Paletería v2**

---

## 🎯 1. Objetivo del Piloto
Validar en tienda real la adopción de la mamá en el mostrador y la precisión matemática del cierre frente a la libreta tradicional de papel, garantizando **cero estrés**, **cero pérdida de datos** y **máxima velocidad**.

---

## 📱 2. Instalación de la PWA en Dispositivos

### Teléfono 1: Mostrador (Mamá — Android / Chrome)
1. Abrir Chrome y navegar al subdominio HTTPS en Netlify (ej. `https://pos-paleteria.netlify.app`).
2. El navegador mostrará automáticamente el aviso de instalación o tocar en el menú de 3 puntos `⋮`.
3. Seleccionar **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
4. Confirmar el nombre **"Paletería POS"**.
5. Se creará el icono con la paleta de helado en la pantalla de inicio.
6. Abrir la app desde el icono: se ejecutará a pantalla completa (modo `standalone`), sin barra de direcciones, y funcionará al 100% incluso en modo avión / sin red.

### Teléfono 2: Supervisora (Novia — iOS / Safari o Android)
1. Abrir Safari y navegar al enlace de la aplicación.
2. Tocar el botón de compartir (ícono de caja con flecha arriba).
3. Seleccionar **"Agregar al inicio"** (Add to Home Screen).
4. Abrir la app desde la pantalla de inicio.
5. Iniciar la jornada diaria mediante la pantalla de **Apertura** ingresando el fondo de caja y el PIN de supervisora.

---

## 🗓️ 3. Cronograma del Piloto

### Semana 1: Piloto Asistido (Días 1 a 7)
- **Operación Mostrador:** La mamá registra las ventas en el POS con 1 toque al despachar a cada cliente. En paralelo, continúa anotando en la libreta como respaldo de confianza.
- **Acompañamiento:** Se observa si hay dudas con combos, mermas o botones rápidos de cantidad (+2, +3, +5).
- **Cierre Diario:** Al finalizar la jornada, la supervisora realiza el **Cierre Guiado en 4 Pasos** en el POS mientras revisa el total de la libreta.
- **Calibración:** Ajustar precios, nombres o catálogo si algún producto no es claro.

### Semana 2: Piloto Autónomo (Días 8 a 14)
- **Operación Mostrador:** La mamá utiliza el POS como herramienta primaria de cobro. Las anotaciones en libreta pasan a ser solo un registro pasivo de control.
- **Cierre Diario:** La supervisora realiza el cierre sin asistencia técnica en menos de 5 minutos.
- **Medición Estricta:** Registro diario de las 4 hipótesis y verificación del semáforo de cuadre.

---

## 📊 4. Métricas Clave y Validación de las 4 Hipótesis

| Hipótesis | Variable de Medición | Umbral de Éxito | Acción si no se cumple |
| :--- | :--- | :--- | :--- |
| **H1: Adopción Mostrador** | Cobertura de ventas registradas | **> 90%** de transacciones en el POS | Reubicar botones más vendidos en la botonera principal. |
| **H2: Registro Toque a Toque** | % Dinero reconstruido en cierre | **< 15%** del total del día | Reforzar el botón de "Venta Rápida" y atajos numéricos. |
| **H3: Eficiencia de Cierre** | Duración del cierre guiado | **< 5 minutos** | Mantener pre-pobladas las piezas del inventario calculado. |
| **H4: Precisión de Caja** | Discrepancia final de dinero | **< 3%** respecto a ventas totales | Revisar conteo de monedas/billetes de apertura y pagos con tarjeta. |
| **Confiabilidad Técnica** | Pérdida o duplicación en cola offline | **0 eventos** | Garantizado por UUID v4 en cliente y deduplicación por script lock. |

---

## 🏆 5. Criterios de Salida para Retirar la Libreta (Sección 13)
Para dar por concluido el piloto y **retirar definitivamente la libreta de papel**, se debe cumplir la siguiente regla:
> **Cumplir durante 5 días consecutivos los 4 umbrales de éxito:**
> 1. Cobertura de ventas > 90%.
> 2. Dinero reconstruido < 15%.
> 3. Cierre en < 5 minutos.
> 4. Discrepancia de caja < 3%.
> 5. Cero pérdidas o desincronizaciones en la cola offline.

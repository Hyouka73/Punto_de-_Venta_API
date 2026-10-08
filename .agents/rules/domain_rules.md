# REGLAS DE NEGOCIO DEL POS (R1 A R17) — POS Paletería v2

Las siguientes reglas corresponden textualmente al diseño validado en el Plan Maestro v2 y deben ser implementadas en `src/domain/rules/`.

---

### R1 · Jornada de Negocio
- Solo puede existir **una jornada abierta a la vez**.
- La jornada se inicia mediante un evento `APERTURA` con conteo físico por categoría y fondo inicial de caja.
- Toda venta, merma o entrada registrada se asocia obligatoriamente a la `jornada_id` activa, sin importar la hora del reloj (incluso pasada la medianoche).
- Si al abrir el sistema existe una jornada anterior sin cerrar, la aplicación bloquea nuevas ventas y exige completar el cierre de la jornada previa (o marcarla "Cerrada sin conteo" con PIN de supervisora y nota justificativa).

### R2 · Venta de 1 Toque
- Cada pulsación sobre una categoría o combo genera un movimiento `VENTA` con identificador único `id_mov` (UUID v4).
- Se registra de inmediato en la cola local sin diálogos modales ni confirmaciones que demoren el cobro.

### R3 · Cantidad Rápida
- Mantener presionado un botón de categoría abre un selector visual rápido (+ / -).
- Se confirma con un toque simple para registrar ventas de múltiples piezas (ej. 4 aguas) en un solo movimiento atómico.

### R4 · Combos y Descuento de Stock
- Una venta de combo se registra con el precio fijado para el combo.
- Para efectos de inventario, el combo se desglosa automáticamente en sus componentes en base a la configuración de la hoja `Catálogo` (ej. 1 combo = 1 agua + 1 crema).

### R5 · Deshacer y Anulaciones
- Tras registrar una venta, la interfaz muestra una barra "Deshacer" con cuenta regresiva.
- El usuario de Mostrador puede anular la venta dentro de una ventana configurable (por defecto: 10 minutos).
- Pasada esa ventana, anular la venta requiere PIN de supervisora y motivo obligatorio.
- La anulación se registra como un movimiento tipo `ANULACION` que referencia en `ref_mov` al `id_mov` original. Nada se elimina de la base de datos.

### R6 · Merma y Consumo de la Casa
- El registro de merma cuenta con 3 motivos estándar:
  1. `palo_roto_deforme`: Producto dañado físicamente.
  2. `descongelada_cristalizada`: Producto afectado por temperatura.
  3. `consumo_casa`: Producto consumido por la familia / personal.
- La merma descuenta unidades de inventario, pero **no suma al dinero esperado** en caja.
- El `consumo_casa` se contabiliza y visualiza en una columna separada para medir con precisión este costo sin penalizar el cuadre de caja.

### R7 · Entrada de Producto
- Cuando llega mercancía de taller o proveedor externo, la supervisora registra la cantidad recibida por categoría (`ENTRADA`).
- Esto incrementa inmediatamente el stock disponible y se toma en cuenta para el cuadre nocturno.

### R8 · Cálculo de Existencias (Stock)
- El stock actual de cada categoría se calcula matemáticamente:
  $$\text{Stock} = \text{Apertura} + \text{Entradas} - \text{Ventas (combos expandidos)} - \text{Mermas} \pm \text{Ajustes}$$
- El stock jamás se sobrescribe manualmente.
- Si el stock calculado resulta negativo, la interfaz lo muestra visiblemente en color rojo con un icono de advertencia. **Está prohibido usar `Math.max(0, ...)` para ocultar faltantes**.

### R9 · Cierre Guiado en 4 Pasos
1. **Paso 1:** Conteo físico de piezas restantes en el congelador por categoría.
2. **Paso 2:** Conteo de dinero físico en efectivo (desglose o total).
3. **Paso 3:** Revisión analítica de resultados (cuadre triple, semáforo, explicaciones).
4. **Paso 4:** Confirmación y firma digital con PIN de supervisora.

### R10 · Los Tres Cuadres Independientes
Para cada categoría $c$:
1. **Piezas por Conteo:**
   $$\text{Piezas Conteo}_c = \text{Apertura}_c + \text{Entradas}_c - \text{Mermas}_c - \text{Restantes}_c$$
2. **Piezas por Toques:**
   $$\text{Piezas Toques}_c = \sum \text{Ventas Válidas}_c$$
3. **Dinero Esperado:**
   $$\text{Dinero Esperado} = \sum (\text{Ventas} \times \text{Precio}) + \sum (\text{Reconstrucciones} \times \text{Precio})$$
4. **Efectivo Neto:**
   $$\text{Efectivo Neto} = \text{Efectivo Contado} - \text{Fondo Inicial}$$
5. **Diferencia Final:**
   $$\text{Diferencia Final} = \text{Efectivo Neto} - \text{Dinero Esperado}$$

### R11 · Semáforo de Cierre
- **Verde:** $|\text{Diferencia Final}| \le \text{Tolerancia Verde}$ (por defecto: $\le \$15$ MXN).
- **Ámbar:** $\text{Tolerancia Verde} < |\text{Diferencia Final}| \le \text{Tolerancia Ámbar}$ (por defecto: entre $\> \$15$ y $\le \$30$ MXN).
- **Rojo:** $|\text{Diferencia Final}| > \text{Tolerancia Ámbar}$.

### R12 · Reconstrucción de Ventas Olvidadas
- Si en alguna categoría las piezas faltantes por conteo físico superan a las piezas registradas por toques:
  $$\text{Faltantes} = \text{Piezas Conteo}_c - \text{Piezas Toques}_c > 0$$
- El sistema propone: *"Se detectaron $N$ piezas de [Categoría] vendidas sin registrar"*.
- Con la aprobación de la supervisora, el sistema genera movimientos tipo `RECONSTRUCCION` a precio de catálogo, marcados claramente como tales en el reporte.
- Si las piezas por toques superan al conteo físico, el sistema alerta sobre posibles dobles toques accidentales, entradas no registradas o mermas olvidadas.

### R13 · Mensajes de Diferencia sin Lenguaje de Culpa
- Todos los diagnósticos de descuadre se presentan en un tono neutral y descriptivo:
  - *Correcto:* "Faltan 3 piezas de Agua en los toques respecto al conteo físico".
  - *Prohibido:* "La operadora olvidó cobrar", "Faltante atribuible a cajera".

### R14 · Apertura Precargada
- La pantalla de apertura precarga automáticamente el conteo físico de restantes del cierre de la jornada anterior más las entradas registradas posteriormente.
- La supervisora solo valida o ajusta si hubo cambios nocturnos.

### R15 · Método de Pago y Transferencias
- El modelo incluye el campo `metodo_pago` (`EFECTIVO`, `TRANSFERENCIA`).
- Si se activa el soporte de transferencias, estas ventas suman a las ventas totales pero se excluyen del cálculo del `Efectivo Esperado` en caja física.

### R16 · Ajustes de Inventario
- Corregir el inventario físico fuera del cierre requiere PIN de supervisora, selección de categoría, cantidad positiva o negativa y campo de justificación obligatorio.

### R17 · Sincronización y Desfase de Relojes
- Todo movimiento registra tanto `ts_cliente` (hora local del teléfono) como `ts_servidor` (hora de recepción en Google Apps Script).
- Si la diferencia absoluta supera los 15 minutos, el movimiento se etiqueta internamente con la bandera `reloj_desfasado: true`.
- El ordenamiento oficial de transacciones se realiza siempre por `ts_servidor`.

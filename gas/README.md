# Google Apps Script & Google Sheets — POS Paletería v2

Este directorio contiene los scripts de Google Apps Script (GAS) para la infraestructura de persistencia en Google Sheets del **POS Paletería v2**.

---

## 📊 Las 8 Hojas del Libro Maestro

El libro de cálculo maestro se estructura con las 8 hojas siguientes:

1. **`Catálogo`**: Lista de productos, categorías y combos con precios al público, iconos, colores y costos privados (excluidos de la API pública).
2. **`Parámetros`**: Configuración operativa (`tolerancia_verde`, `tolerancia_ambar`, `fondo_caja_default`, `ventana_deshacer_min`, etc.).
3. **`Movimientos`**: **Libro de solo agregación (Append-Only Ledger)**. Cada registro cuenta con `id_mov` (UUID v4), `ts_cliente`, `ts_servidor`, estado y detalles de venta/merma/entrada/anulación. **Esta hoja está protegida contra edición manual**.
4. **`Jornadas`**: Registro histórico de aperturas y cierres comerciales con sus fondos y balances.
5. **`Cierre_Detalle`**: Auditoría de piezas por categoría al cierre (conteo físico, piezas por toques, diferencias y reconstrucciones).
6. **`Cierres`**: Consolidado financiero del cuadre triple (efectivo contado, dinero esperado, fondo inicial, diferencia final y semáforo).
7. **`Resumen`**: Tablero con fórmulas automáticas de Google Sheets (`SUMIFS`, `COUNTA`) para monitoreo de ventas, piezas, mermas y jornadas en tiempo real.
8. **`Stock_Calculado`**: Cálculo dinámico en tiempo real de inventario por categoría (`Apertura + Entradas - Ventas - Mermas + Ajustes`), con detección explícita y visible de stock negativo (sin ocultamiento con `Math.max(0, ...)` según Regla R8).

---

## 🚀 Cómo Inicializar el Libro de Google Sheets

1. Crea una nueva hoja de cálculo en [Google Sheets](https://sheets.new).
2. Ve al menú **Extensiones** > **Apps Script**.
3. Copia el contenido de `gas/SetupMasterSheets.js` en un archivo llamado `SetupMasterSheets.gs`.
4. En el selector de funciones, elige `setupMasterSpreadsheet` y presiona **Ejecutar**.
5. Concede los permisos solicitados.
6. Al terminar la ejecución, las 8 hojas quedarán creadas, formateadas y con la hoja `Movimientos` protegida.

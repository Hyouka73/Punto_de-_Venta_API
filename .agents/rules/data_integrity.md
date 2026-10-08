# INTEGRIDAD DE DATOS Y GOBERNANZA — POS Paletería v2

## 1. Principio Fundamental: Libro de Solo-Agregación (Append-Only Ledger)
- La hoja `Movimientos` en Google Sheets funciona como una cadena inmutable de eventos de negocio.
- **PROHIBIDO:** Operaciones de borrado físico (`DELETE`), sobrescritura de filas (`UPDATE`) o reutilización de IDs.
- Toda corrección, anulación o ajuste se implementa agregando una nueva fila que describe la acción compensatoria.

---

## 2. Estructura de Columnas en Google Sheets

### Hoja 1: `Catálogo`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | String | Identificador corto (ej. `CAT_AGUA`, `CAT_CREMA`, `CMB_DUO`) |
| `nombre` | String | Nombre visible en botón (ej. "Paleta de Agua") |
| `precio` | Number | Precio de venta al público en moneda local |
| `costo` | Number | Costo unitario estimado (privado, solo admin) |
| `icono` | String | Identificador de icono Lucide o emoji representativo |
| `color` | String | Código de color Tailwind / Hex (ej. `#38BDF8`) |
| `orden` | Number | Posición de ordenamiento en la botonera |
| `activo` | Boolean | `TRUE` si está habilitado para la venta |
| `controla_stock` | Boolean | `TRUE` si descuenta inventario |
| `componentes` | String (JSON) | En combos: `[{"id":"CAT_AGUA","cantidad":1},{"id":"CAT_CREMA","cantidad":1}]` |

### Hoja 2: `Parámetros`
| Clave | Valor | Descripción |
| :--- | :--- | :--- |
| `tolerancia_verde` | 15 | Margen máximo en MXN para semáforo verde |
| `tolerancia_ambar` | 30 | Margen máximo en MXN para semáforo ámbar |
| `fondo_caja_default` | 200 | Fondo en efectivo sugerido al abrir jornada |
| `ventana_deshacer_min` | 10 | Minutos permitidos para deshacer venta sin PIN |
| `timezone` | "America/Mexico_City" | Zona horaria del negocio |
| `schema_version` | "2.0.0" | Versión del modelo de datos para migraciones |

### Hoja 3: `Movimientos` (Solo Escritura desde Apps Script)
1. `id_mov`: UUID v4 generado por el cliente. Clave primaria e idempotente.
2. `jornada_id`: UUID o código de la jornada activa (ej. `JORNADA_2026-10-08_01`).
3. `tipo`: `VENTA` | `ANULACION` | `MERMA` | `ENTRADA` | `AJUSTE` | `RECONSTRUCCION` | `APERTURA`.
4. `categoria_id`: Clave foránea al catálogo.
5. `cantidad`: Número entero positivo (o negativo en ajustes excepcionales).
6. `precio_unitario`: Copia exacta del precio vigente al momento de la venta.
7. `monto_total`: `cantidad` × `precio_unitario`.
8. `metodo_pago`: `EFECTIVO` | `TRANSFERENCIA`.
9. `ref_mov`: ID del movimiento original si se trata de una `ANULACION`.
10. `motivo`: Código de razón (en mermas: `palo_roto`, `descongelada`, `consumo_casa`).
11. `usuario`: Rol o identificador que operó (`mostrador`, `supervisora`, `admin`).
12. `dispositivo_id`: Fingerprint del dispositivo emisor.
13. `ts_cliente`: Marca de tiempo ISO 8601 del dispositivo.
14. `ts_servidor`: Marca de tiempo ISO 8601 asignada por Apps Script.
15. `estado`: `CONFIRMADO` | `ANULADO`.
16. `nota`: Comentarios adicionales u observaciones.

### Hoja 4: `Jornadas`
`jornada_id`, `fecha_negocio`, `estado` (`ABIERTA` | `CERRADA`), `ts_apertura`, `fondo_inicial`, `ts_cierre`, `usuario_apertura`, `usuario_cierre`, `total_ventas_dinero`, `diferencia_caja`.

### Hoja 5: `Cierre_Detalle`
`jornada_id`, `categoria_id`, `stock_apertura`, `entradas`, `mermas`, `stock_restante_conteo`, `piezas_conteo`, `piezas_toques`, `piezas_diferencia`, `reconstruidas`.

### Hoja 6: `Cierres`
`jornada_id`, `dinero_toques`, `dinero_reconstruido`, `dinero_esperado_total`, `efectivo_contado`, `fondo_inicial`, `efectivo_neto`, `diferencia_final`, `semaforo` (`VERDE` | `AMBAR` | `ROJO`), `observaciones`.

---

## 3. Idempotencia y Protocolo de Envío
1. **Generación en el Origen:**
   - Todo movimiento se crea con un identificador UUID v4 en la memoria del navegador inmediatamente al hacer clic.
2. **Almacenamiento Local First:**
   - El movimiento se guarda en la cola local de IndexedDB antes de realizar cualquier intento de transmisión vía red.
3. **Manejo de Reintentos:**
   - Si la red falla o se corta la conexión a la mitad de una solicitud POST, el cliente reintenta enviar el mismo payload con el mismo `id_mov`.
4. **Desduplicación en el Servidor (Apps Script):**
   - El servidor mantiene un conjunto de `id_mov` recibidos en los últimos 7 días.
   - Si un `id_mov` ya existe en la hoja, Apps Script responde `{ "status": "already_exists", "id": "..." }` con éxito, evitando duplicar registros.
5. **Retiro de la Cola:**
   - Un registro solo es eliminado de IndexedDB cuando la respuesta del servidor confirma explícitamente la recepción exitosa de ese ID específico.

# GUÍA PASO A PASO: CONEXIÓN REAL CON GOOGLE SHEETS & APPS SCRIPT
**POS Paletería v2**

---

## 🎯 1. Arquitectura de Conexión
El sistema utiliza una arquitectura sin servidor (serverless) donde el frontend React (PWA alojada en Netlify) se comunica con una API Web App montada en **Google Apps Script**, la cual lee y escribe directamente en un libro de **Google Sheets**:

```text
┌───────────────────────────┐                ┌──────────────────────────────┐                ┌───────────────────────────┐
│     POS Paletería PWA     │  HTTP POST     │      Google Apps Script      │  Spreadsheet   │   Google Sheets Maestro   │
│ (Netlify / Navegador / SW)├───────────────►│    (Web App en Code.gs)      ├───────────────►│ (8 Hojas con Append-Only) │
│   Modo: 'sheets'          │ (text/plain)   │ LockService + Deduplicación  │   App Script   │  Movimientos Protegida    │
└───────────────────────────┘                └──────────────────────────────┘                └───────────────────────────┘
```

> **Por qué no hay errores de CORS:** Las peticiones se envían con encabezado `Content-Type: text/plain;charset=utf-8`. Esto evita las peticiones preflight `OPTIONS` del navegador y permite que Google Apps Script procese el payload JSON directamente sin bloqueos de origen cruzado.

---

## 📋 2. Pasos para Conectar una Cuenta de Google Sheets

### Paso 1: Crear la Hoja de Cálculo en Google Drive
1. Abre tu navegador y dirígete a [https://sheets.new](https://sheets.new) para crear una hoja nueva.
2. Nómbrala: **`POS Paletería - Base de Datos Maestro`**.
3. Copia el **ID de la hoja** desde la barra de direcciones del navegador:
   - En la URL: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
   - El ID es el segmento entre `/d/` y `/edit`.

---

### Paso 2: Crear Automáticamente las 8 Hojas del Libro
Para no crear las pestañas a mano ni configurar fórmulas manualmente:
1. En el menú superior de la hoja, haz clic en **Extensiones** > **Apps Script**.
2. En el panel lateral izquierdo de Apps Script, haz clic en **+** (junto a Archivos) > **Archivo de comandos** y nómbralo `SetupMasterSheets`.
3. Abre el archivo local del repositorio [`gas/SetupMasterSheets.js`](file:///c:/Users/Judirico/Documents/otro/gas/SetupMasterSheets.js), copia todo su contenido y pégalo en el editor de Apps Script reemplazando cualquier código anterior.
4. En la barra superior de Apps Script, asegúrate de que esté seleccionada la función `setupMasterSpreadsheet` y presiona **Ejecutar**.
5. Google te solicitará otorgar permisos de acceso a Google Drive y Sheets:
   - Haz clic en **Revisar permisos**.
   - Selecciona tu cuenta de Google.
   - Haz clic en **Avanzado** > **Ir a Proyecto (no seguro)** > **Permitir**.
6. Al finalizar la ejecución (toma ~5 segundos), regresa a tu hoja de cálculo:
   - Verás creadas las 8 hojas: `Catálogo`, `Parámetros`, `Movimientos`, `Jornadas`, `Cierre_Detalle`, `Cierres`, `Resumen` y `Stock_Calculado`.
   - La hoja `Movimientos` queda con protección de edición manual.

---

### Paso 3: Instalar el Backend de la API (`Code.js`)
1. En el mismo editor de Apps Script, abre el archivo `Código.gs` (o crea uno nuevo llamado `Code`).
2. Abre el archivo local del repositorio [`gas/Code.js`](file:///c:/Users/Judirico/Documents/otro/gas/Code.js), copia todo su contenido y pégalo en `Código.gs`.
3. Guarda los cambios haciendo clic en el icono de disco 💾 o `Ctrl+S`.

---

### Paso 4: Configurar los PINs de Seguridad (Script Properties)
Por política de seguridad estricta, los PINs nunca se escriben en celdas de la hoja ni en el código público. Se guardan en las variables de entorno de Apps Script:
1. En el panel izquierdo de Apps Script, haz clic en el icono de engranaje ⚙️ (**Configuración del proyecto**).
2. Desplázate hacia abajo hasta la sección **Propiedades de la secuencia de comandos**.
3. Haz clic en **Editar las propiedades de la secuencia de comandos** y luego en **Agregar propiedad**:
   | Propiedad | Valor | Descripción |
   | :--- | :--- | :--- |
   | `ADMIN_PIN` | `654321` | PIN de 6 dígitos para configuración y precios |
   | `SUPERVISORA_PIN` | `1234` | PIN de 4 dígitos para apertura y cierre de caja |
   | `SPREADSHEET_ID` | `TU_ID_DEL_PASO_1` | *(Opcional)* ID de la hoja de cálculo |
4. Haz clic en **Guardar propiedades de la secuencia de comandos**.

---

### Paso 5: Desplegar como Web App Pública
1. En la esquina superior derecha de Apps Script, haz clic en el botón azul **Implementar** > **Nueva implementación**.
2. En la ventana emergente, haz clic en el engranaje ⚙️ junto a "Seleccionar tipo" y elige **Aplicación web**.
3. Configura los siguientes campos exactamente:
   - **Descripción:** `POS Paletería v2 API Producción`
   - **Ejecutar como:** `Yo (<tu_correo@gmail.com>)`
   - **Quién tiene acceso:** `Cualquier usuario` *(Anyone - necesario para que el POS pueda comunicarse sin requerir login de Google en mostrador)*
4. Haz clic en **Implementar**.
5. Copia la **URL de la aplicación web** generada. Tendrá un formato similar a:
   ```text
   https://script.google.com/macros/s/AKfycbz_X1abc999def888ghi777jkl/exec
   ```

---

## 🔌 3. Configuración en la Aplicación POS

Tienes dos opciones para enlazar la URL generada:

### Opción A: Desde la Interfaz del POS (En Caliente)
1. En el POS, ve a la pantalla de **Configuración** (ingresando el PIN de Admin `654321`).
2. Selecciona la pestaña **Conexión & Google Sheets**.
3. Pega la URL de tu Web App en el campo correspondiente.
4. Presiona el botón **"Probar Conexión"**. El POS ejecutará un ping y leerá el catálogo en vivo desde tu hoja.
5. Presiona **"Guardar y Activar Google Sheets"**.

### Opción B: Por Variables de Entorno (Recomendado para Netlify)
1. En tu archivo `.env.local` (desarrollo local) o en el panel de Netlify (**Site configuration** > **Environment variables**):
   ```env
   VITE_DATA_ADAPTER=sheets
   VITE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/AKfycbz_X1abc999def888ghi777jkl/exec
   ```
2. Reconstruye el proyecto (`npm run build`).

---

## 🧪 4. Comprobación y Verificación de Conectividad
Puedes comprobar que tu Web App está respondiendo correctamente desde la terminal usando `curl`:

```bash
curl -X POST https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec \
  -H "Content-Type: text/plain" \
  -d '{"action":"GET_CATALOG"}'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "items": [
    { "id": "CAT_AGUA", "nombre": "Paleta de Agua", "precio": 15, "activo": true },
    { "id": "CAT_CREMA", "nombre": "Paleta de Crema", "precio": 20, "activo": true },
    { "id": "CAT_SANDWICH", "nombre": "Sándwich de Nieve", "precio": 25, "activo": true },
    { "id": "CAT_NIEVE", "nombre": "Vaso de Nieve", "precio": 30, "activo": true },
    { "id": "COMBO_PAREJA", "nombre": "Combo Pareja", "precio": 32, "activo": true, "es_combo": true }
  ],
  "version": "1.0"
}
```
Si recibes este JSON, ¡tu Google Sheets está 100% conectado y listo para operar!

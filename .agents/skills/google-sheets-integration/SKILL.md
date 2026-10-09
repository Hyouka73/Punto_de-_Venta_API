---
name: google-sheets-integration
description: Procedimiento técnico para inicializar el libro maestro de Google Sheets, configurar el backend Apps Script y verificar la sincronización bidireccional.
---

# HABILIDAD: INTEGRACIÓN Y CONEXIÓN CON GOOGLE SHEETS & APPS SCRIPT

Esta habilidad instruye a **AntiGravity** y a los desarrolladores en la arquitectura, creación y configuración del backend sin servidor basado en **Google Sheets** y **Google Apps Script (GAS)** para el POS Paletería v2.

---

## 🏛️ ¿Cómo Funciona la Creación de las Sheets? (Explicación Sencilla)

El sistema utiliza Google Sheets como base de datos en la nube y Google Apps Script como API web:

1. **El Libro Maestro en Google Drive:**
   - Se crea un archivo de Google Sheets en tu cuenta de Google.
   - En lugar de crear y formatear a mano las 8 hojas necesarias, existe un script automatizador: [`gas/SetupMasterSheets.js`](file:///c:/Users/Judirico/Documents/otro/gas/SetupMasterSheets.js).
   - Al ejecutar `setupMasterSpreadsheet()` en Apps Script, el script crea, nombra, formatea y configura automáticamente las 8 hojas:
     * `Catálogo`: Productos y precios.
     * `Parámetros`: Configuración y tolerancias.
     * `Movimientos`: Libro de solo agregación (**Append-Only** protegido).
     * `Jornadas`: Histórico de turnos.
     * `Cierre_Detalle`: Piezas por categoría.
     * `Cierres`: Balances financieros del cuadre triple.
     * `Resumen`: Tablero automático de fórmulas (`SUMIFS`, etc.).
     * `Stock_Calculado`: Inventario dinámico en tiempo real.

2. **El Backend Serverless (`Code.js`):**
   - El código en [`gas/Code.js`](file:///c:/Users/Judirico/Documents/otro/gas/Code.js) actúa como la API web.
   - Procesa peticiones HTTP `POST` enviadas en formato `text/plain` (para evitar bloqueos de CORS en el navegador).
   - Utiliza `LockService.getScriptLock()` para garantizar que dos ventas simultáneas no choquen ni causen inconsistencias.
   - Deduplica transacciones basándose en el `id_mov` (UUID v4) generado en el cliente.
   - Valida PINs en `PropertiesService.getScriptProperties()` (sin guardar contraseñas en celdas de la hoja).

3. **La Conexión con el POS:**
   - Al implementar el script como **Aplicación web pública (Anyone)**, Google genera una URL única que termina en `/exec`.
   - Esa URL se pega en la pantalla de **Configuración > Google Sheets** del POS o en la variable de entorno `VITE_SHEETS_WEBAPP_URL`.
   - El POS cuenta con un botón **"Probar Conexión en Vivo"** que realiza un ping inmediato y reporta la latencia y la lectura del catálogo.

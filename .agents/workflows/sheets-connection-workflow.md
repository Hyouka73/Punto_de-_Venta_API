# FLUJO DE TRABAJO: CONEXIÓN REAL A GOOGLE SHEETS (sheets-connection-workflow)

Este workflow define los pasos para inicializar el libro en Google Drive, configurar el backend en Apps Script y enlazar la aplicación POS.

---

```text
┌────────────────────────────────────────┐
│ 1. Crear Hoja en https://sheets.new    │
│    Copiar SPREADSHEET_ID               │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│ 2. Ejecutar SetupMasterSheets.js       │
│    Crea automáticamente las 8 hojas    │
│    y protege la hoja Movimientos       │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│ 3. Instalar Backend Code.js            │
│    Pegar código en Apps Script         │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│ 4. Configurar Script Properties        │
│    ADMIN_PIN (654321), SUPERVISORA_PIN │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│ 5. Desplegar como Web App Pública      │
│    Ejecutar: Yo | Acceso: Cualquiera   │
│    Copiar URL (/exec)                  │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│ 6. Probar Conexión desde el POS        │
│    Pestaña Configuración -> Google     │
│    Sheets -> Probar Conexión en Vivo   │
└────────────────────────────────────────┘
```

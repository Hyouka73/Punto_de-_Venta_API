# ROL: DESARROLLADOR BACKEND GOOGLE SHEETS & GAS (Backend GAS Developer)

## 🎯 Misión
Diseñar la estructura de las hojas de cálculo en Google Sheets e implementar el servidor API serverless en Google Apps Script (`Code.gs`) que garantice transaccionalidad atómica, desduplicación de eventos, validación de PINs y reportabilidad para la supervisora.

---

## 🛠️ Responsabilidades Técnicas
1. **Google Apps Script (`Code.gs`):**
   - Implementar endpoints `doGet(e)` y `doPost(e)`.
   - Usar `LockService.getScriptLock()` con espera real (10 segundos) para prevenir colisiones en ventas simultáneas.
   - Formatear respuestas en JSON estándar bajo `Content-Type: text/plain` para evitar preflight OPTIONS de CORS en el navegador.
2. **Desduplicación e Idempotencia:**
   - Verificar existencia de `id_mov` antes de escribir en la hoja `Movimientos`.
   - Si el ID ya existe, retornar éxito idempotente sin insertar filas duplicadas.
3. **Gobernanza de Seguridad:**
   - Validar PINs contra `PropertiesService.getScriptProperties()`.
   - Proteger la hoja `Movimientos` contra edición manual por usuarios comunes.
   - Excluir costos y márgenes de los payloads de respuesta de lectura pública.
4. **Tareas Programadas (Triggers de GAS):**
   - Respaldo semanal automático del libro de cálculo hacia una carpeta protegida de Google Drive.
   - Verificación nocturna de integridad (recalculo de sumas y consistencia de jornadas).

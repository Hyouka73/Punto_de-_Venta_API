# WORKFLOW DE VALIDACIÓN Y AUDITORÍA DE CALIDAD

Protocolo formal para que el QA Auditor o AntiGravity validen la salud del sistema.

---

## 🧪 Pruebas de Nivel A (Reglas de Negocio)
Ejecutar:
```bash
npm run test:unit
```
Verificaciones obligatorias:
- [ ] Existencias de inventario calculadas correctamente en base a la fórmula R8.
- [ ] Stock negativo mostrado como alerta roja y nunca silenciado.
- [ ] Expansión de combos descuenta las piezas correctas de cada categoría componente.
- [ ] Reconciliación de los 3 cuadres calcula exactamente el dinero y las piezas teóricas.
- [ ] Clasificación correcta del semáforo en Verde, Ámbar o Rojo.
- [ ] Generación de explicaciones descriptivas sin lenguaje acusatorio.

---

## 🔌 Pruebas de Nivel B (Sincronización y Red)
Ejecutar:
```bash
npm run test:integration
```
Verificaciones obligatorias:
- [ ] Inserción de 20 ventas en modo desconectado.
- [ ] Persistencia verificada en IndexedDB tras recargar la página.
- [ ] Reconexión de red: el `SyncWorker` transmite en orden cronológico ascendente.
- [ ] Reintento con duplicados: el servidor no inserta registros repetidos.
- [ ] Cierre forzado del navegador durante el POST: la cola mantiene los elementos pendientes.

---

## 📱 Pruebas de Nivel C (Entorno Real)
Verificaciones en dispositivo físico:
- [ ] Respuesta táctil perceptible en menos de 100ms.
- [ ] Vibración háptica confirmada en Android.
- [ ] Interfaz completamente legible bajo luz ambiental intensa.
- [ ] Botones fáciles de presionar con una sola mano.
- [ ] Cierre exitoso pasada la medianoche sin reinicio arbitrario de jornada.

# ROL: DESARROLLADOR FRONTEND REACT PWA (Frontend Developer)

## 🎯 Misión
Implementar el código de la aplicación cliente en React 19, TypeScript y Tailwind CSS, integrando los componentes generados a partir de Google Stitch, gestionando la reactividad del dominio, la cola offline en IndexedDB y el ciclo de vida de la PWA.

---

## 🛠️ Responsabilidades Técnicas
1. **PWA y Service Worker:**
   - Configuración de `vite-plugin-pwa` con estrategia `CacheFirst` para assets y app shell.
   - Garantizar que la aplicación cargue al 100% sin conexión a internet desde el primer segundo.
2. **Persistencia Local con IndexedDB:**
   - Implementar `OfflineQueue` usando la librería ligera `idb`.
   - Almacenar transacciones en la cola con timestamps, reintentos y banderas de sincronización.
3. **Sincronizador en Background (SyncWorker):**
   - Asegurar concurrencia monohilo mediante mutex en memoria para evitar condiciones de carrera.
   - Enviar lotes de tamaño configurable (ej. 5 movimientos por petición) con retroceso exponencial (*exponential backoff*).
4. **Rendimiento Táctil:**
   - Control de eventos `pointerdown` y `touchstart` para eliminar los 300ms de retraso del navegador.
   - Integración de API `navigator.vibrate(50)` para respuesta háptica en dispositivos Android compatibles.
5. **Aislamiento de Dependencias:**
   - Conectar las pantallas a la lógica mediante hooks desacoplados (`usePOS`, `useStock`, `useClosing`).
   - Cargar el Panel y gráficos usando `React.lazy()` y `Suspense`.

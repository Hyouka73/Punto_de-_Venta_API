---
name: visual-verification
description: Metodología paso a paso para auditar visualmente las 9 pantallas del POS Paletería con el Inspector Visual Flotante antes del despliegue.
---

# HABILIDAD: VERIFICACIÓN VISUAL DE PANTALLAS (VISUAL VERIFICATION)

Esta habilidad guía a **AntiGravity** y a los evaluadores en el proceso de auditoría visual exhaustiva de las 9 pantallas del sistema para asegurar cero errores gráficos, excelente ergonomía táctil y fidelidad visual antes de cualquier despliegue.

---

## 🛠️ Herramienta: Inspector Visual Flotante (`VisualVerifierBar`)
En el entorno local (`npm run dev`), la aplicación cuenta con un botón flotante en la esquina inferior derecha:
- Al tocarlo, se despliega una botonera con acceso directo a las 9 pantallas:
  1. `🍦 Mostrador`
  2. `🔓 Apertura`
  3. `🔒 Cierre`
  4. `🗑️ Merma`
  5. `📦 Entrada`
  6. `📊 Panel`
  7. `☁️ Sync & Red`
  8. `⚙️ Config`
  9. `🔬 Lab DEV`

---

## 📋 Protocolo de Inspección Visual por Pantalla

### 1. Mostrador (`MostradorScreen`)
- Cambiar a Mostrador con el inspector.
- Tocar cada categoría (Agua, Crema, Sándwich, Nieve, Combo) y validar feedback visual inmediato.
- Probar mantener presionado para verificar el selector numérico (+2, +3, +5).
- Comprobar la barra de deshacer (10 segundos) en la parte inferior.
- Verificar que el total acumulado en la cabecera actualice sin lag.

### 2. Apertura (`AperturaScreen`)
- Comprobar que los campos de conteo inicial muestren precargados los valores del turno previo.
- Verificar el teclado numérico en pantalla para el PIN de supervisora.

### 3. Cierre Guiado (`CierreScreen`)
- Recorrer los 4 pasos:
  * Paso 1: Conteo físico restante.
  * Paso 2: Conteo de efectivo en caja.
  * Paso 3: Revisión de cuadre triple y semáforo (*Verde / Ámbar / Rojo*).
  * Paso 4: Firma digital con PIN.

### 4. Merma (`MermaScreen`)
- Verificar que los 3 botones gigantes de motivos (Palo roto, Descongelada, Consumo casa) respondan en 2 toques.

### 5. Entrada (`EntradaScreen`)
- Verificar que la recepción de mercancía permita seleccionar categoría y registrar piezas recibidas.

### 6. Panel Ejecutivo (`PanelScreen`)
- Comprobar las tarjetas interactivas con `SpotlightCard` y los números dinámicos `CountUp`.

### 7. Sincronización & Red (`SyncStatusScreen`)
- Verificar el indicador de nube, el contador de cola y el botón de sincronización forzada.

### 8. Configuración (`ConfiguracionScreen`)
- Ingresar PIN Admin `654321`.
- Navegar por las pestañas: Catálogo, Combos, Parámetros, Seguridad y **Google Sheets**.
- Probar el botón **"Probar Conexión en Vivo"**.

### 9. Laboratorio Visual (`LaboratorioScreen`)
- Comprobar que el monitor de FPS marque 60 FPS estables.
- Probar el stress test.

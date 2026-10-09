# FLUJO DE TRABAJO: VERIFICACIÓN VISUAL PREVIA AL DESPLIEGUE (visual-verification-workflow)

Este workflow define el protocolo obligatorio para verificar visualmente que todas las interfaces de usuario funcionen a la perfección antes de proceder al despliegue.

---

```text
┌────────────────────────────────────────┐
│ 1. Iniciar Servidor de Desarrollo Local│
│    npm run dev -> http://localhost:5173│
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│ 2. Activar Inspector Visual Flotante   │
│    Tocar botón 'Verificador Visual'    │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│ 3. Recorrer Sistemáticamente 9 Vistas  │
│    Mostrador -> Apertura -> Cierre ->  │
│    Merma -> Entrada -> Panel -> Sync ->│
│    Configuración -> Laboratorio DEV    │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│ 4. Auditar Criterios Ergonómicos (VV)  │
│    Botones >80px, <100ms, feedback,    │
│    contrastes AAA y cero scroll horiz. │
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│ 5. Certificación Visual Aprobada       │
│    Proceder a Despliegue en Netlify    │
└────────────────────────────────────────┘
```

## Pasos Detallados
1. **Lanzar Entorno:**
   Ejecutar `npm run dev` y abrir la app en Chrome o navegador móvil en modo responsivo (375x667px).
2. **Navegación Rápida:**
   Usar el componente flotante `VisualVerifierBar` en la esquina inferior para alternar de forma inmediata entre cada una de las 9 pantallas.
3. **Validación Interactiva:**
   Probar clics, toques rápidos, retroalimentación háptica, cierre de modales y regreso al Mostrador en 1 toque.
4. **Cierre de Fase:**
   Una vez confirmadas las 9 pantallas sin anomalías, se da por aprobada la Fase de Verificación Visual y se autoriza el Despliegue.

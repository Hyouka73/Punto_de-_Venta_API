---
name: pwa-mobile-hardening
description: Configuración de PWA, Service Worker, soporte offline absoluto, respuesta háptica y ergonomía para manos frías/húmedas.
---

# HABILIDAD: FORTALECIMIENTO PWA Y ERGONOMÍA MÓVIL

Esta habilidad guía a **AntiGravity** para configurar la PWA de modo que funcione como una aplicación nativa robusta en el mostrador.

---

## 📱 Service Worker (`vite-plugin-pwa`)
Estrategia: `generateSW` con precaché de todos los estáticos (JS, CSS, HTML, iconos).

```typescript
// vite.config.ts snippet
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.destination === 'image',
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }
        }
      }
    ]
  },
  manifest: {
    name: 'POS Paletería',
    short_name: 'Paletería POS',
    theme_color: '#38BDF8',
    background_color: '#F8FAFC',
    display: 'standalone',
    orientation: 'portrait'
  }
})
```

---

## ❄️ Ergonomía de Mostrador y Manos Frías
- **Eventos Táctiles Inmediatos:** Usar eventos `onPointerDown` para reaccionar al contacto físico sin esperar el evento sintético `click` que introduce un lag de 300ms.
- **Tolerancia a Toques Múltiples:** Desactivar zoom por doble toque mediante `touch-action: manipulation` en CSS.
- **Vibración Háptica:** Invocar `navigator.vibrate(50)` envuelto en bloque `try/catch` para dispositivos Android (iOS simplemente lo ignora de forma segura).

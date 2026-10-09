# REGLAS MAESTRAS DE VERIFICACIÓN VISUAL Y ERGONOMÍA (VV1 A VV6)
**POS Paletería v2**

---

### VV1 · Verificación Visual Previa al Despliegue Obligatoria
- Ninguna pantalla o cambio visual puede desplegarse en producción sin haber sido auditada interactivamente en el entorno de desarrollo mediante el **Inspector Visual Flotante** (`VisualVerifierBar`) y validada contra la matriz de `docs/PLAN_VERIFICACION_VISUAL.md`.

### VV2 · Altura Mínima Táctil de Mostrador (>80px)
- Todos los botones principales de cobro en la pantalla de Mostrador deben tener una altura física mínima de **80px** (óptimo 90px-110px).
- El área de toque no debe requerir precisión milimétrica, tolerando dedos fríos o húmedos por manipular congeladores.

### VV3 · Latencia Perceptible <100ms
- Cada pulsación debe desencadenar un cambio visual visible (destello, cambio de opacidad o escala sutil) en **menos de 100 milisegundos**.
- En dispositivos táctiles, debe acompañarse de vibración háptica corta (50ms). Prohibido bloquear la interfaz con spinners o peticiones de red síncronas durante el despacho.

### VV4 · Alto Contraste y Legibilidad Solar (AAA)
- Los textos y precios deben ser nítidos y legibles bajo luz solar directa o reflejos de mostradores de vidrio y acero inoxidable.
- Prohibidos grises tenues sobre fondos blancos en información crítica (precios, cantidades y totales).

### VV5 · Retorno al Mostrador en 1 Toque
- Todas las pantallas secundarias (Apertura, Cierre, Merma, Entrada, Panel, Sync, Configuración, Laboratorio) deben contar con un botón claro y visible en la cabecera para regresar al Mostrador en exactamente **1 toque**.

### VV6 · Viewport Móvil Estricto sin Scroll Horizontal
- Ninguna pantalla debe generar desplazamiento (scroll) horizontal bajo anchos de viewport entre **360px y 430px**.
- En la pantalla de Mostrador, todos los botones de producto base deben caber en la pantalla sin requerir desplazamiento vertical.

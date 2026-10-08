# Framework de Agentes Autónomos para POS Paletería (AntiGravity + Google Stitch)

Este paquete contiene la arquitectura completa de gobernanza, reglas de negocio, habilidades (skills), roles de agente, backlog y memoria persistente (`STATE.md`) para el desarrollo autónomo del **POS Paletería v2** (React PWA + Tailwind + Netlify + Google Sheets + Apps Script), basado en el **Plan Maestro v2 (8 de octubre de 2026)**.

---

## 🎯 Objetivo
Permitir que **AntiGravity** (el agente de programación autónoma de Google) y **Google Stitch** (diseño vibe-design de pantallas) tomen control total de la implementación del proyecto desde la Fase 0 hasta la Fase 7, sin alucinaciones, sin deuda técnica y con determinismo absoluto.

---

## 📂 Estructura del Framework

```text
pos-paleteria/
├── STATE.md                          # Memoria viva del estado del proyecto para AntiGravity
├── BACKLOG.md                        # Backlog maestro de tareas con criterios de aceptación
├── GEMINI.md                         # Prompt de contexto y arranque para AntiGravity
├── .cursorrules                      # Reglas de codificación automáticas para Cursor / Windsurf
└── .agents/
    ├── README.md                     # Guía de orquestación de agentes
    ├── rules/
    │   ├── rules.md                  # Reglas del sistema, arquitectura y no-negociables
    │   ├── domain_rules.md           # Reglas de negocio R1 a R17 del Plan Maestro v2
    │   └── data_integrity.md         # Principios de libro de solo-agregación e idempotencia
    ├── agents/
    │   ├── orchestrator.md           # Coordinador de fases y control de calidad
    │   ├── stitch_ui_designer.md     # Diseñador de interfaces asistido por Google Stitch
    │   ├── frontend_developer.md     # Desarrollador React 19 + Tailwind + PWA + IndexedDB
    │   ├── sheets_backend_developer.md # Desarrollador Google Sheets + Apps Script (GAS)
    │   └── qa_auditor.md             # Auditor de pruebas (Nivel A, B, C y 10 escenarios)
    ├── skills/
    │   ├── stitch-screen-generation/ # Generación vibe-design de las 9 pantallas con Stitch
    │   ├── offline-idempotent-sync/  # Cola IndexedDB, UUID v4 y sincronización resiliente
    │   ├── business-rules-engine/    # Cálculos de cuadre triple, stock, combos y mensajes
    │   ├── sheets-gas-adapter/       # MockAdapter local y backend Apps Script con LockService
    │   ├── react-bits-performance/   # Integración controlada de efectos React Bits (<100ms)
    │   └── pwa-mobile-hardening/     # PWA, Service Worker, háptica y optimización para congelador
    ├── backlog/
    │   ├── overview.md               # Resumen de fases F0 a F7
    │   ├── f0_preparacion.md         # Fase 0: Catálogo, parámetros y validación previa
    │   ├── f1_cimientos_reglas_mock.md # Fase 1: Dominio puro, MockAdapter y Nivel A
    │   ├── f2_mostrador_sync_offline.md # Fase 2: Mostrador con Stitch y Cola Offline
    │   ├── f3_apertura_cierre_movimientos.md # Fase 3: Apertura, Cierre (4 pasos), Merma, Entrada
    │   ├── f4_panel_react_bits.md    # Fase 4: Panel Lazy, Laboratorio visual y React Bits
    │   ├── f5_gas_prod_pruebas_nivel_c.md # Fase 5: Conexión Sheets real y pruebas de campo
    │   ├── f6_piloto_paralelo.md     # Fase 6: 2 semanas en paralelo con libreta
    │   └── f7_estabilizacion_roadmap.md # Fase 7: Cierre de piloto y activación de roadmap
    └── workflows/
        ├── dev-workflow.md           # Protocolo de ejecución autónoma para AntiGravity
        ├── stitch-ui-workflow.md     # Flujo Stitch -> Prompts -> Componentes React Tailwind
        └── validation-workflow.md    # Flujo de certificación y auditoría de pruebas
```

---

## 🚀 Cómo Iniciar el Desarrollo con AntiGravity

1. **Descarga el archivo ZIP** generado (`pos_paleteria_agent_framework.zip`).
2. **Descomprímelo** en la raíz de tu proyecto de código.
3. Abre el proyecto en tu entorno (AntiGravity, Cursor, Claude Code).
4. Dale la siguiente instrucción inicial al agente:
   > *"Hola AntiGravity. Lee `STATE.md`, `GEMINI.md` y `.agents/rules/rules.md`. Eres el Orquestador del proyecto POS Paletería. Revisa el estado actual y ejecuta la primera tarea pendiente del Sprint/Fase activo."*

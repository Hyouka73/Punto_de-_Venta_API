import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SyncStatusScreen } from '@/ui/screens/SyncStatusScreen';

describe('Pantalla de Estado de Sincronización y Cola Offline - F4.4', () => {
  it('debe renderizar estado sincronizado cuando no hay pendientes', () => {
    const html = renderToStaticMarkup(
      React.createElement(SyncStatusScreen, {
        status: {
          isOnline: true,
          isSyncing: false,
          pendingCount: 0,
        },
        onBack: vi.fn(),
      })
    );

    expect(html).toContain('Sincronización');
    expect(html).toContain('Todo Sincronizado');
    expect(html).toContain('Online (Conectado)');
    expect(html).toContain('0 registros');
    expect(html).toContain('Forzar Sincronización Ahora');
  });

  it('debe renderizar estado offline con alerta cuando no hay internet', () => {
    const html = renderToStaticMarkup(
      React.createElement(SyncStatusScreen, {
        status: {
          isOnline: false,
          pendingCount: 4,
        },
        onBack: vi.fn(),
      })
    );

    expect(html).toContain('Sin Conexión a Internet');
    expect(html).toContain('Offline (Sin Red)');
    expect(html).toContain('4 registros');
    expect(html).toContain('Las ventas se guardan seguras en tu teléfono');
  });
});

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfiguracionScreen } from '@/ui/screens/ConfiguracionScreen';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';

describe('Pantalla de Configuración con PIN de Administrador - F4.4', () => {
  it('debe solicitar PIN de 6 dígitos antes de mostrar catálogo o parámetros', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfiguracionScreen, {
        initialCatalog: DEFAULT_CATALOG,
        onBack: vi.fn(),
      })
    );

    expect(html).toContain('Configuración del Sistema');
    expect(html).toContain('PIN de Administrador (6 dígitos)');
    expect(html).toContain('Seguridad Admin');
    // No debe exponer la vista de edición sin autenticar
    expect(html).not.toContain('Configuración Admin');
    expect(html).not.toContain('Tolerancia Semáforo Verde');
  });
});

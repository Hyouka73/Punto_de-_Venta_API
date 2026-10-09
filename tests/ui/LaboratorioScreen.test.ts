import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LaboratorioScreen } from '@/ui/screens/LaboratorioScreen';

describe('Laboratorio Visual de Desarrollo - F4.3', () => {
  it('debe renderizar el banco de pruebas y monitor de FPS en entorno DEV', () => {
    // En Vitest por defecto import.meta.env.DEV es true
    const html = renderToStaticMarkup(
      React.createElement(LaboratorioScreen, { onBack: vi.fn() })
    );

    expect(html).toContain('Laboratorio Visual de Desarrollo');
    expect(html).toContain('Framerate (FPS)');
    expect(html).toContain('Banco 1: Tarjeta con Spotlight');
    expect(html).toContain('Banco 2: Contador Suave (CountUp)');
    expect(html).toContain('Fondo Aurora Dinámico');
  });

  it('debe bloquear el acceso si se simula entorno de producción (PROD)', () => {
    const originalDev = import.meta.env.DEV;
    // @ts-expect-error mutando DEV temporalmente para probar seguridad
    import.meta.env.DEV = false;

    const html = renderToStaticMarkup(
      React.createElement(LaboratorioScreen, { onBack: vi.fn() })
    );

    expect(html).toContain('Acceso Denegado');
    expect(html).toContain('deshabilitado en entornos de producción');

    // Restaurar
    // @ts-expect-error restaurando DEV
    import.meta.env.DEV = originalDev;
  });
});

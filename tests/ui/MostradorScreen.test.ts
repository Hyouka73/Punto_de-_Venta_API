import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MostradorScreen } from '@/ui/screens/MostradorScreen';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';

describe('Pantalla de Mostrador - Protección de Caja Cerrada (R1)', () => {
  it('debe mostrar el estado "Cerrada", banner y overlay de bloqueo cuando jornadaActiva es false', () => {
    const html = renderToStaticMarkup(
      React.createElement(MostradorScreen, {
        catalog: DEFAULT_CATALOG,
        jornadaActiva: false,
        totalHoy: 0,
      })
    );

    // Debe mostrar indicador de estado de jornada cerrada
    expect(html).toContain('Cerrada');
    expect(html).toContain('Jornada cerrada');
    expect(html).toContain('Caja Cerrada');
    expect(html).toContain('No es posible registrar ventas con la caja cerrada');
    // Debe incluir botón para abrir jornada
    expect(html).toContain('Abrir Jornada (Apertura)');
  });

  it('debe deshabilitar los botones de productos cuando la jornada está cerrada', () => {
    const html = renderToStaticMarkup(
      React.createElement(MostradorScreen, {
        catalog: DEFAULT_CATALOG,
        jornadaActiva: false,
      })
    );

    // Los botones de productos deben tener el atributo disabled
    expect(html).toContain('disabled=""');
    expect(html).toContain('opacity-35');
  });

  it('debe mostrar el botón de "Abrir Caja" en lugar de "Cierre" en el footer si la jornada está cerrada', () => {
    const html = renderToStaticMarkup(
      React.createElement(MostradorScreen, {
        catalog: DEFAULT_CATALOG,
        jornadaActiva: false,
      })
    );

    expect(html).toContain('Abrir Caja');
    expect(html).not.toContain('<span>Cierre</span>');
  });

  it('debe mostrar el botón de "Cierre" cuando la jornada está activa', () => {
    const html = renderToStaticMarkup(
      React.createElement(MostradorScreen, {
        catalog: DEFAULT_CATALOG,
        jornadaActiva: true,
      })
    );

    expect(html).toContain('● Abierta');
    expect(html).toContain('<span>Cierre</span>');
  });

  it('debe bloquear con badge "AGOTADO" y deshabilitar productos con stock <= 0', () => {
    const html = renderToStaticMarkup(
      React.createElement(MostradorScreen, {
        catalog: DEFAULT_CATALOG,
        jornadaActiva: true,
        stock: {
          CAT_AGUA: 0, // Agotado
          CAT_CREMA: 12, // Disponible
          CAT_SANDWICH: -1, // Negativo bloqueado
          CAT_NIEVE: 3, // Stock bajo
        },
      })
    );

    // Los productos con stock <= 0 deben tener badge AGOTADO y estar deshabilitados
    expect(html).toContain('⛔ AGOTADO');
    expect(html).toContain('line-through');
    expect(html).toContain('Quedan 12');
    expect(html).toContain('Quedan 3');
  });

  it('debe marcar combo como agotado si alguno de sus componentes tiene stock <= 0', () => {
    const html = renderToStaticMarkup(
      React.createElement(MostradorScreen, {
        catalog: DEFAULT_CATALOG,
        jornadaActiva: true,
        stock: {
          CAT_AGUA: 0, // Componente en 0
          CAT_CREMA: 20,
        },
      })
    );

    // Combo Dúo depende de CAT_AGUA y CAT_CREMA, por lo que debe aparecer AGOTADO
    expect(html).toContain('Combo Dúo');
    expect(html).toContain('⛔ AGOTADO');
  });
});


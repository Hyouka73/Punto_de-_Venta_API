import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AperturaScreen } from '@/ui/screens/AperturaScreen';

describe('Pantalla de Apertura de Jornada con Stitch - F3.1', () => {
  it('debe renderizar el título de Apertura y la fecha actual por defecto', () => {
    const html = renderToStaticMarkup(
      React.createElement(AperturaScreen, {
        fecha: '2026-10-09',
        onConfirmApertura: vi.fn(),
      })
    );

    expect(html).toContain('Apertura de Jornada');
    expect(html).toContain('2026-10-09');
    expect(html).toContain('Confirma el inventario inicial en congeladores');
  });

  it('debe precargar el inventario sugerido del cierre de ayer (R14)', () => {
    const customStock = {
      CAT_AGUA: 50,
      CAT_CREMA: 40,
      CAT_SANDWICH: 20,
      CAT_NIEVE: 15,
    };

    const html = renderToStaticMarkup(
      React.createElement(AperturaScreen, {
        initialStock: customStock,
        onConfirmApertura: vi.fn(),
      })
    );

    // Debe contener el badge informativo
    expect(html).toContain('Stock precargado del cierre anterior');
    // Debe mostrar los nombres de las categorías físicas
    expect(html).toContain('Paleta de Agua');
    expect(html).toContain('Paleta de Crema');
    expect(html).toContain('Sándwich Helado');
    expect(html).toContain('Nieve (Vaso)');
    // Total de piezas sumadas: 50+40+20+15 = 125
    expect(html).toContain('125 piezas en total');
  });

  it('debe precargar el fondo de caja predeterminado de $200 MXN', () => {
    const html = renderToStaticMarkup(
      React.createElement(AperturaScreen, {
        defaultFondoInicial: 200,
        onConfirmApertura: vi.fn(),
      })
    );

    expect(html).toContain('$200.00');
    expect(html).toContain('Fondo Inicial en Caja');
  });

  it('debe incluir el botón principal para comenzar ventas con protección de PIN', () => {
    const html = renderToStaticMarkup(
      React.createElement(AperturaScreen, {
        onConfirmApertura: vi.fn(),
      })
    );

    expect(html).toContain('Comenzar Ventas');
  });
});

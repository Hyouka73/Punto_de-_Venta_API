import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EntradaScreen } from '@/ui/screens/EntradaScreen';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';

describe('Pantalla de Entrada de Mercancía - F3.3 (R7)', () => {
  it('debe renderizar el título de Entrada y resumen del lote', () => {
    const html = renderToStaticMarkup(
      React.createElement(EntradaScreen, {
        catalog: DEFAULT_CATALOG,
        onSaveEntrada: vi.fn(),
      })
    );

    expect(html).toContain('Entrada de Mercancía');
    expect(html).toContain('Lote a ingresar');
    expect(html).toContain('piezas recibidas');
  });

  it('debe mostrar los atajos táctiles rápidos (+1, +5, +10, +25) por categoría', () => {
    const html = renderToStaticMarkup(
      React.createElement(EntradaScreen, {
        catalog: DEFAULT_CATALOG,
        onSaveEntrada: vi.fn(),
      })
    );

    expect(html).toContain('Paleta de Agua');
    expect(html).toContain('Paleta de Crema');
    expect(html).toContain('+1');
    expect(html).toContain('+5');
    expect(html).toContain('+10');
    expect(html).toContain('+25');
    expect(html).toContain('Confirmar e Ingresar a Inventario');
  });
});

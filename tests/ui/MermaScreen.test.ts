import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MermaScreen } from '@/ui/screens/MermaScreen';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';

describe('Pantalla de Registro de Merma y Consumo - F3.3 (R6)', () => {
  it('debe renderizar el título y los 3 motivos gigantes de merma', () => {
    const html = renderToStaticMarkup(
      React.createElement(MermaScreen, {
        catalog: DEFAULT_CATALOG,
        onSaveMerma: vi.fn(),
      })
    );

    expect(html).toContain('Registrar Merma o Consumo');
    expect(html).toContain('Palo Roto / Deforme');
    expect(html).toContain('Descongelada / Cristalizada');
    expect(html).toContain('Consumo de la Casa');
    // Badge de consumo familiar
    expect(html).toContain('Familiar');
  });

  it('debe mostrar los productos físicos y el stepper de cantidad', () => {
    const html = renderToStaticMarkup(
      React.createElement(MermaScreen, {
        catalog: DEFAULT_CATALOG,
        onSaveMerma: vi.fn(),
      })
    );

    expect(html).toContain('Paleta de Agua');
    expect(html).toContain('Paleta de Crema');
    expect(html).toContain('Cantidad de piezas');
    expect(html).toContain('Guardar Merma');
  });
});

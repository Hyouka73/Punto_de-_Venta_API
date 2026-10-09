import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { VisualVerifierBar } from '../../src/ui/components/VisualVerifierBar';

describe('F7.2: Componente VisualVerifierBar (Inspector de Verificación Visual)', () => {
  it('debe renderizar el botón disparador del verificador visual', () => {
    const html = renderToString(
      React.createElement(VisualVerifierBar, {
        currentView: 'mostrador',
        onSelectScreen: vi.fn(),
      })
    );

    expect(html).toContain('Verificador Visual');
  });
});

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PanelScreen } from '@/ui/screens/PanelScreen';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import type { Movimiento } from '@/domain/types';
import { CountUp } from '@/ui/components/react-bits/CountUp';
import { SpotlightCard } from '@/ui/components/react-bits/SpotlightCard';
import { AuroraBackground } from '@/ui/components/react-bits/AuroraBackground';

describe('Panel Ejecutivo y Componentes React Bits - F4.1 & F4.2', () => {
  const movimientosMock: Movimiento[] = [
    {
      id_mov: 'mov-1',
      jornada_id: 'JOR-TEST',
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 2,
      precio_unitario: 15,
      monto_total: 30,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'disp-1',
      ts_cliente: new Date().toISOString(),
    },
    {
      id_mov: 'mov-2',
      jornada_id: 'JOR-TEST',
      tipo: 'VENTA',
      categoria_id: 'CAT_CREMA',
      cantidad: 3,
      precio_unitario: 20,
      monto_total: 60,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'disp-1',
      ts_cliente: new Date().toISOString(),
    },
    {
      id_mov: 'mov-3',
      jornada_id: 'JOR-TEST',
      tipo: 'MERMA',
      categoria_id: 'CAT_AGUA',
      cantidad: 1,
      precio_unitario: 0,
      monto_total: 0,
      metodo_pago: 'EFECTIVO',
      motivo: 'PALO_ROTO',
      usuario: 'mostrador',
      dispositivo_id: 'disp-1',
      ts_cliente: new Date().toISOString(),
    },
  ];

  it('debe renderizar el encabezado y selector de período', () => {
    const html = renderToStaticMarkup(
      React.createElement(PanelScreen, {
        movimientos: movimientosMock,
        catalog: DEFAULT_CATALOG,
        onBackToMostrador: vi.fn(),
      })
    );

    expect(html).toContain('Panel Ejecutivo');
    expect(html).toContain('Mostrador');
    expect(html).toContain('Hoy');
    expect(html).toContain('Semana');
    expect(html).toContain('Mes');
    expect(html).toContain('Objetivo Piloto');
  });

  it('debe calcular y renderizar las 4 tarjetas de KPI clave con Spotlight y CountUp', () => {
    const html = renderToStaticMarkup(
      React.createElement(PanelScreen, {
        movimientos: movimientosMock,
        catalog: DEFAULT_CATALOG,
        onBackToMostrador: vi.fn(),
      })
    );

    // Total Ventas: 30 + 60 = 90
    expect(html).toContain('Total Ventas');
    expect(html).toContain('$90 MXN');

    // Piezas: 2 + 3 = 5
    expect(html).toContain('Piezas');
    expect(html).toContain('5 pzs');

    // Mermas: 1
    expect(html).toContain('Mermas');
    expect(html).toContain('1 pzs');

    // % Reconstruido: 0%
    expect(html).toContain('% Reconstruido');
    expect(html).toContain('0%');
  });

  it('debe mostrar el gráfico de actividad por hora y desglose por categoría', () => {
    const html = renderToStaticMarkup(
      React.createElement(PanelScreen, {
        movimientos: movimientosMock,
        catalog: DEFAULT_CATALOG,
        onBackToMostrador: vi.fn(),
      })
    );

    expect(html).toContain('Actividad por Hora');
    expect(html).toContain('Mix de Ventas por Categoría');
    expect(html).toContain('Paleta de Agua');
    expect(html).toContain('Paleta de Crema');
  });

  it('debe listar los movimientos recientes y el historial de diferencias de caja', () => {
    const html = renderToStaticMarkup(
      React.createElement(PanelScreen, {
        movimientos: movimientosMock,
        catalog: DEFAULT_CATALOG,
        onBackToMostrador: vi.fn(),
      })
    );

    expect(html).toContain('Movimientos Recientes');
    expect(html).toContain('Historial de Diferencias de Caja');
    expect(html).toContain('VERDE');
  });

  it('los componentes React Bits (CountUp, SpotlightCard, AuroraBackground) deben renderizarse limpiamente', () => {
    const countHtml = renderToStaticMarkup(
      React.createElement(CountUp, { to: 1500, prefix: '$', suffix: ' MXN' })
    );
    expect(countHtml).toContain('$1,500 MXN');

    const spotHtml = renderToStaticMarkup(
      React.createElement(SpotlightCard, {}, React.createElement('span', {}, 'Contenido VIP'))
    );
    expect(spotHtml).toContain('Contenido VIP');

    const auroraHtml = renderToStaticMarkup(
      React.createElement(AuroraBackground, {}, React.createElement('h1', {}, 'Fondo Calido'))
    );
    expect(auroraHtml).toContain('Fondo Calido');
  });
});

import React, { useState, useMemo } from 'react';
import type { Movimiento, CatalogoItem, SemaforoCierre } from '../../domain/types';
import { CountUp } from '../components/react-bits/CountUp';
import { SpotlightCard } from '../components/react-bits/SpotlightCard';
import { AuroraBackground } from '../components/react-bits/AuroraBackground';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  PieChart as PieIcon,
  ShoppingBag,
  Settings,
} from 'lucide-react';

export type PeriodoFiltro = 'hoy' | 'semana' | 'mes';

export interface CierreHistoricoItem {
  readonly fecha: string;
  readonly jornada_id: string;
  readonly total_vendido: number;
  readonly diferencia: number;
  readonly semaforo: SemaforoCierre;
}

export interface PanelScreenProps {
  readonly movimientos: readonly Movimiento[];
  readonly catalog: readonly CatalogoItem[];
  readonly cierresHistoricos?: readonly CierreHistoricoItem[];
  readonly onBackToMostrador: () => void;
  readonly onNavigateToConfig?: () => void;
}

export const PanelScreen: React.FC<PanelScreenProps> = ({
  movimientos,
  catalog,
  cierresHistoricos = [],
  onBackToMostrador,
  onNavigateToConfig,
}) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('hoy');

  // Mapeo rápido de categorías
  const catalogMap = useMemo(() => {
    const map = new Map<string, CatalogoItem>();
    catalog.forEach((item) => map.set(item.id, item));
    return map;
  }, [catalog]);

  // Cálculos reactivos de métricas
  const metrics = useMemo(() => {
    let totalVendido = 0;
    let totalPiezasVendidas = 0;
    let totalMermas = 0;
    let mermasDano = 0;
    let mermasConsumoCasa = 0;
    let totalReconstrucciones = 0;
    let totalPiezasReconstruidas = 0;

    const ventasPorHora: Record<number, number> = {};
    // Inicializar horas comunes de paletería (11:00 a 21:00)
    for (let h = 11; h <= 21; h++) {
      ventasPorHora[h] = 0;
    }

    const ventasPorCategoria: Record<string, { piezas: number; monto: number }> = {};
    catalog.forEach((cat) => {
      ventasPorCategoria[cat.id] = { piezas: 0, monto: 0 };
    });

    // Procesar movimientos
    movimientos.forEach((mov) => {
      const hora = new Date(mov.ts_cliente).getHours();

      if (mov.tipo === 'VENTA') {
        totalVendido += mov.monto_total;
        totalPiezasVendidas += mov.cantidad;
        if (ventasPorHora[hora] !== undefined) {
          ventasPorHora[hora] += mov.monto_total;
        } else {
          ventasPorHora[hora] = mov.monto_total;
        }

        const catData = ventasPorCategoria[mov.categoria_id] || { piezas: 0, monto: 0 };
        catData.piezas += mov.cantidad;
        catData.monto += mov.monto_total;
        ventasPorCategoria[mov.categoria_id] = catData;
      } else if (mov.tipo === 'ANULACION') {
        totalVendido -= mov.monto_total;
        totalPiezasVendidas -= mov.cantidad;
        if (ventasPorHora[hora] !== undefined) {
          ventasPorHora[hora] = Math.max(0, ventasPorHora[hora] - mov.monto_total);
        }
        const catData = ventasPorCategoria[mov.categoria_id];
        if (catData) {
          catData.piezas = Math.max(0, catData.piezas - mov.cantidad);
          catData.monto = Math.max(0, catData.monto - mov.monto_total);
        }
      } else if (mov.tipo === 'MERMA') {
        totalMermas += mov.cantidad;
        if (mov.motivo === 'CONSUMO_CASA') {
          mermasConsumoCasa += mov.cantidad;
        } else {
          mermasDano += mov.cantidad;
        }
      } else if (mov.tipo === 'RECONSTRUCCION') {
        totalReconstrucciones += mov.monto_total;
        totalPiezasReconstruidas += mov.cantidad;
        totalVendido += mov.monto_total;
        totalPiezasVendidas += mov.cantidad;
      }
    });

    const porcentajeReconstruido =
      totalVendido > 0 ? (totalReconstrucciones / totalVendido) * 100 : 0;

    return {
      totalVendido: Math.max(0, totalVendido),
      totalPiezasVendidas: Math.max(0, totalPiezasVendidas),
      totalMermas,
      mermasDano,
      mermasConsumoCasa,
      totalReconstrucciones,
      totalPiezasReconstruidas,
      porcentajeReconstruido,
      ventasPorHora,
      ventasPorCategoria,
    };
  }, [movimientos, catalog]);

  // Max venta por hora para escalar la gráfica
  const maxVentaHora = useMemo(() => {
    const vals = Object.values(metrics.ventasPorHora);
    const max = Math.max(...vals, 100);
    return max;
  }, [metrics.ventasPorHora]);

  // Feed reciente (últimos 8 movimientos ordenados descendente)
  const movimientosRecientes = useMemo(() => {
    return [...movimientos]
      .sort((a, b) => new Date(b.ts_cliente).getTime() - new Date(a.ts_cliente).getTime())
      .slice(0, 8);
  }, [movimientos]);

  // Mock de historial de cierres si no hay suficientes
  const historialDisplay = useMemo(() => {
    if (cierresHistoricos.length > 0) return cierresHistoricos;
    return [
      {
        fecha: 'Ayer',
        jornada_id: 'JOR-AYER',
        total_vendido: 2340,
        diferencia: 5,
        semaforo: 'VERDE' as SemaforoCierre,
      },
      {
        fecha: 'Hace 2 días',
        jornada_id: 'JOR-PREV',
        total_vendido: 1980,
        diferencia: -12,
        semaforo: 'VERDE' as SemaforoCierre,
      },
      {
        fecha: 'Hace 3 días',
        jornada_id: 'JOR-3D',
        total_vendido: 2850,
        diferencia: 24,
        semaforo: 'AMBAR' as SemaforoCierre,
      },
    ];
  }, [cierresHistoricos]);

  return (
    <AuroraBackground className="min-h-screen w-full pb-16">
      {/* Barra de Navegación Superior */}
      <header className="sticky top-0 z-30 w-full border-b border-stone-200/70 bg-white/90 backdrop-blur-md px-4 py-3 shadow-xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            onClick={onBackToMostrador}
            className="flex items-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 transition-colors active:scale-95"
            aria-label="Volver al mostrador"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Mostrador</span>
          </button>

          <div className="flex flex-col items-center">
            <h1 className="text-base font-extrabold text-stone-900 tracking-tight flex items-center gap-1.5">
              <span>📊 Panel Ejecutivo</span>
            </h1>
            <span className="text-[11px] font-medium text-stone-500">
              Métricas & Tendencias en Tiempo Real
            </span>
          </div>

          {/* Controles de la derecha: Selector de Período y Botón Configuración */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-stone-100 p-1">
              {(['hoy', 'semana', 'mes'] as PeriodoFiltro[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    periodo === p
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>

            {onNavigateToConfig && (
              <button
                type="button"
                onClick={onNavigateToConfig}
                className="rounded-xl bg-stone-100 hover:bg-stone-200 p-2 text-stone-700 transition-colors active:scale-95"
                title="Configuración de Sistema (Admin)"
                aria-label="Configuración de Sistema"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto max-w-4xl px-4 pt-6 space-y-6">
        {/* Banner de Estado de Hipótesis Piloto */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">Objetivo Piloto:</span>
            <span>% Dinero Reconstruido &lt; 15% | Cierre en &lt; 5 min</span>
          </div>
          <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
            {metrics.porcentajeReconstruido < 15 ? 'En Rango Óptimo' : 'Revisar Cierres'}
          </span>
        </div>

        {/* 4 KPI Cards (Spotlight Cards con React Bits) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* KPI 1: Total Vendido */}
          <SpotlightCard className="p-4" spotlightColor="rgba(245, 158, 11, 0.2)">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Ventas</span>
              <DollarSign className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-stone-900">
              <CountUp to={metrics.totalVendido} prefix="$" suffix=" MXN" />
            </div>
            <p className="mt-1 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 inline" />
              <span>Jornada en curso</span>
            </p>
          </SpotlightCard>

          {/* KPI 2: Piezas Vendidas */}
          <SpotlightCard className="p-4" spotlightColor="rgba(56, 189, 248, 0.2)">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Piezas</span>
              <ShoppingBag className="h-4 w-4 text-sky-500" />
            </div>
            <div className="text-2xl font-black text-stone-900">
              <CountUp to={metrics.totalPiezasVendidas} suffix=" pzs" />
            </div>
            <p className="mt-1 text-[11px] text-stone-500">Paletas y nieves</p>
          </SpotlightCard>

          {/* KPI 3: Mermas Registradas */}
          <SpotlightCard className="p-4" spotlightColor="rgba(244, 63, 94, 0.2)">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Mermas</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-stone-900">
              <CountUp to={metrics.totalMermas} suffix=" pzs" />
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              {metrics.mermasConsumoCasa} casa | {metrics.mermasDano} daño
            </p>
          </SpotlightCard>

          {/* KPI 4: % Reconstruido */}
          <SpotlightCard className="p-4" spotlightColor="rgba(168, 85, 247, 0.2)">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">% Reconstruido</span>
              <RefreshCw className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-stone-900">
              <CountUp to={metrics.porcentajeReconstruido} decimals={1} suffix="%" />
            </div>
            <p
              className={`mt-1 text-[11px] font-semibold ${
                metrics.porcentajeReconstruido <= 15 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              Meta: &lt;15% del día
            </p>
          </SpotlightCard>
        </div>

        {/* Sección: Gráfica de Ventas por Hora & Distribución por Categoría */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Gráfico de Barras: Ventas por Hora */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Actividad por Hora (Ventas $)</span>
              </h2>
              <span className="text-xs text-stone-400">Hoy</span>
            </div>

            <div className="h-44 w-full flex items-end gap-1.5 pt-4">
              {Object.entries(metrics.ventasPorHora).map(([horaStr, total]) => {
                const hora = parseInt(horaStr, 10);
                const heightPct = maxVentaHora > 0 ? (total / maxVentaHora) * 100 : 0;
                return (
                  <div key={hora} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full flex justify-center">
                      <span className="text-[9px] font-bold text-stone-500">
                        {total > 0 ? `$${total}` : ''}
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-t-md relative flex items-end h-28 overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-md transition-all duration-500 hover:brightness-110"
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                        title={`${hora}:00 — $${total} MXN`}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-stone-400">
                      {hora}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribución por Categoría */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-sky-500" />
                <span>Mix de Ventas por Categoría</span>
              </h2>
              <span className="text-xs text-stone-400">Piezas & Monto</span>
            </div>

            <div className="space-y-3">
              {catalog.map((item) => {
                const catData = metrics.ventasPorCategoria[item.id] || { piezas: 0, monto: 0 };
                const pct =
                  metrics.totalPiezasVendidas > 0
                    ? Math.round((catData.piezas / metrics.totalPiezasVendidas) * 100)
                    : 0;

                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-stone-800">
                        <span className="text-base">{item.icono}</span>
                        <span>{item.nombre}</span>
                      </span>
                      <span className="text-stone-500">
                        <strong className="text-stone-800">{catData.piezas} pzs</strong> (${catData.monto} MXN · {pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.color || '#F59E0B',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sección: Historial de Diferencias de Caja & Feed Reciente */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Historial de Cierres Diarios (Semáforo R11) */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-500" />
                <span>Historial de Diferencias de Caja</span>
              </h2>
              <span className="text-xs text-stone-400">Últimos Cierres</span>
            </div>

            <div className="space-y-2.5">
              {historialDisplay.map((h, idx) => {
                const esVerde = h.semaforo === 'VERDE';
                const esAmbar = h.semaforo === 'AMBAR';

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/70 p-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-800">{h.fecha}</div>
                      <div className="text-[10px] text-stone-400">{h.jornada_id}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-stone-900">
                        ${h.total_vendido.toLocaleString('es-MX')} MXN
                      </div>
                      <div
                        className={`text-[11px] font-bold ${
                          esVerde
                            ? 'text-emerald-600'
                            : esAmbar
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        Dif: {h.diferencia >= 0 ? `+$${h.diferencia}` : `-$${Math.abs(h.diferencia)}`} MXN ({h.semaforo})
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feed de Movimientos Recientes */}
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-500" />
                <span>Movimientos Recientes</span>
              </h2>
              <span className="text-xs text-stone-400">{movimientos.length} total</span>
            </div>

            {movimientosRecientes.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                Aún no hay movimientos en esta jornada.
              </div>
            ) : (
              <div className="space-y-2">
                {movimientosRecientes.map((mov) => {
                  const cat = catalogMap.get(mov.categoria_id);
                  const isVenta = mov.tipo === 'VENTA';
                  const isAnul = mov.tipo === 'ANULACION';
                  const isMerma = mov.tipo === 'MERMA';
                  const isEntrada = mov.tipo === 'ENTRADA';

                  return (
                    <div
                      key={mov.id_mov}
                      className="flex items-center justify-between rounded-xl border border-stone-100 bg-white p-2.5 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat?.icono || '📦'}</span>
                        <div>
                          <div className="font-bold text-stone-800">
                            {cat?.nombre || mov.categoria_id}{' '}
                            <span className="font-normal text-stone-500">
                              × {mov.cantidad}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {new Date(mov.ts_cliente).toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                            isVenta
                              ? 'bg-emerald-100 text-emerald-800'
                              : isAnul
                              ? 'bg-rose-100 text-rose-800'
                              : isMerma
                              ? 'bg-amber-100 text-amber-800'
                              : isEntrada
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-stone-100 text-stone-800'
                          }`}
                        >
                          {mov.tipo} {mov.monto_total > 0 ? `+$${mov.monto_total}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </AuroraBackground>
  );
};

export default PanelScreen;

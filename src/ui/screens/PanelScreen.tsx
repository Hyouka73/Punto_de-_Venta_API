import React, { useState, useMemo } from 'react';
import type { Movimiento, CatalogoItem, SemaforoCierre } from '../../domain/types';
import { CountUp } from '../components/react-bits/CountUp';
import { SpotlightCard } from '../components/react-bits/SpotlightCard';
import { ItemIcon } from '../utils/itemIcons';
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
  ArrowUpRight,
  ArrowDownLeft,
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
    for (let h = 11; h <= 21; h++) {
      ventasPorHora[h] = 0;
    }

    const ventasPorCategoria: Record<string, { piezas: number; monto: number }> = {};
    catalog.forEach((cat) => {
      ventasPorCategoria[cat.id] = { piezas: 0, monto: 0 };
    });

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
        if (mov.motivo === 'consumo_casa') {
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

  const maxVentaHora = useMemo(() => {
    const vals = Object.values(metrics.ventasPorHora);
    return Math.max(...vals, 100);
  }, [metrics.ventasPorHora]);

  const movimientosRecientes = useMemo(() => {
    return [...movimientos]
      .sort((a, b) => new Date(b.ts_cliente).getTime() - new Date(a.ts_cliente).getTime())
      .slice(0, 10);
  }, [movimientos]);

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
    <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-[#FFFDF9] via-[#FEF8F0] to-[#FDF4E8] text-stone-900 pb-16 pb-safe select-none touch-manipulation">
      {/* ─── BARRA DE NAVEGACIÓN RESPONSIVA (Móvil & Computadora) CON SAFE AREA ─── */}
      <header className="sticky top-0 z-30 w-full border-b border-amber-200/60 bg-white/95 backdrop-blur-md px-3 sm:px-6 py-2.5 shadow-xs pt-safe">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 max-w-6xl mx-auto">
          {/* Fila 1 en móvil / Izquierda en escritorio */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <button
              type="button"
              onClick={onBackToMostrador}
              className="flex items-center gap-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition-colors active:scale-95 cursor-pointer"
              aria-label="Volver al mostrador"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Mostrador</span>
            </button>

            <div className="flex flex-col items-center sm:items-start">
              <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                <span>📊 Panel Ejecutivo</span>
              </h1>
              <span className="text-[10px] sm:text-xs font-semibold text-stone-500">
                Métricas & Tendencias en Tiempo Real
              </span>
            </div>

            {onNavigateToConfig && (
              <button
                type="button"
                onClick={onNavigateToConfig}
                className="sm:hidden rounded-xl bg-stone-100 hover:bg-stone-200 p-2 text-stone-700 transition-colors active:scale-95 cursor-pointer"
                title="Configuración de Sistema (Admin)"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Fila 2 en móvil / Derecha en escritorio: Filtro de Periodo */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <div className="flex rounded-xl bg-stone-100 p-1 w-full sm:w-auto justify-center">
              {(['hoy', 'semana', 'mes'] as PeriodoFiltro[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`flex-1 sm:flex-none rounded-lg px-3 py-1 text-xs font-black transition-all cursor-pointer ${
                    periodo === p
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
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
                className="hidden sm:flex rounded-xl bg-stone-100 hover:bg-stone-200 p-2 text-stone-700 transition-colors active:scale-95 cursor-pointer"
                title="Configuración de Sistema (Admin)"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── CONTENIDO PRINCIPAL FLUIDO Y EXPANSIVO ─── */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Banner de Estado de Hipótesis */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold">Objetivo Piloto:</span>
            <span>% Dinero Reconstruido &lt; 15% | Cierre en &lt; 5 min</span>
          </div>
          <span className="self-start sm:self-auto font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full text-[11px]">
            {metrics.porcentajeReconstruido < 15 ? '✓ En Rango Óptimo' : '⚠️ Revisar Cierres'}
          </span>
        </div>

        {/* ─── 4 TARJETAS KPI (RESPONSIVAS: 2 COLUMNAS EN MÓVIL / 4 EN ESCRITORIO) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* KPI 1: Total Vendido */}
          <SpotlightCard className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs" spotlightColor="rgba(245, 158, 11, 0.15)">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-stone-500">Total Ventas</span>
              <DollarSign className="h-4 w-4 text-amber-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              <CountUp to={metrics.totalVendido} prefix="$" suffix=" MXN" />
            </div>
            <p className="mt-1 text-[10px] sm:text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 inline" />
              <span>Jornada en curso</span>
            </p>
          </SpotlightCard>

          {/* KPI 2: Piezas Vendidas */}
          <SpotlightCard className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs" spotlightColor="rgba(56, 189, 248, 0.15)">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-stone-500">Piezas</span>
              <ShoppingBag className="h-4 w-4 text-sky-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              <CountUp to={metrics.totalPiezasVendidas} suffix=" pzs" />
            </div>
            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-stone-500 truncate">
              Paletas, nieves y combos
            </p>
          </SpotlightCard>

          {/* KPI 3: Mermas Registradas */}
          <SpotlightCard className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs" spotlightColor="rgba(244, 63, 94, 0.15)">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-stone-500">Mermas</span>
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              <CountUp to={metrics.totalMermas} suffix=" pzs" />
            </div>
            <p className="mt-1 text-[10px] sm:text-[11px] font-medium text-stone-500 truncate">
              {metrics.mermasConsumoCasa} casa | {metrics.mermasDano} daño
            </p>
          </SpotlightCard>

          {/* KPI 4: % Reconstruido */}
          <SpotlightCard className="p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200/80 shadow-xs" spotlightColor="rgba(168, 85, 247, 0.15)">
            <div className="flex items-center justify-between text-stone-500 mb-1">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-stone-500">% Reconstruido</span>
              <RefreshCw className="h-4 w-4 text-purple-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              <CountUp to={metrics.porcentajeReconstruido} decimals={1} suffix="%" />
            </div>
            <p
              className={`mt-1 text-[10px] sm:text-[11px] font-bold ${
                metrics.porcentajeReconstruido <= 15 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              Tolerancia: &lt;15% del total
            </p>
          </SpotlightCard>
        </div>

        {/* ─── SECCIÓN: GRÁFICA DE VENTAS POR HORA & MIX DE CATEGORÍAS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Gráfico de Barras por Hora */}
          <div className="rounded-3xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Actividad por Hora (Ventas $)</span>
              </h2>
              <span className="text-[11px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                11:00h - 21:00h
              </span>
            </div>

            {/* Contenedor desplazable en móvil para que nunca se encimen las columnas */}
            <div className="overflow-x-auto pb-2 -mx-1 px-1">
              <div className="h-44 min-w-[420px] flex items-end gap-2 pt-4">
                {Object.entries(metrics.ventasPorHora).map(([horaStr, total]) => {
                  const hora = parseInt(horaStr, 10);
                  const heightPct = maxVentaHora > 0 ? (total / maxVentaHora) * 100 : 0;
                  return (
                    <div key={hora} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="w-full flex justify-center">
                        <span className="text-[9px] font-black text-stone-600 truncate">
                          {total > 0 ? `$${total}` : ''}
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-t-lg relative flex items-end h-28 overflow-hidden">
                        <div
                          className="w-full bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg transition-all duration-500 hover:brightness-110"
                          style={{ height: `${Math.max(heightPct, 6)}%` }}
                          title={`${hora}:00 — $${total} MXN`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-stone-500">
                        {hora}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mix de Ventas por Categoría */}
          <div className="rounded-3xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-sky-500" />
                <span>Mix de Ventas por Categoría</span>
              </h2>
              <span className="text-[11px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                Piezas & Monto
              </span>
            </div>

            <div className="space-y-3.5">
              {catalog.map((item) => {
                const catData = metrics.ventasPorCategoria[item.id] || { piezas: 0, monto: 0 };
                const pct =
                  metrics.totalPiezasVendidas > 0
                    ? Math.round((catData.piezas / metrics.totalPiezasVendidas) * 100)
                    : 0;

                return (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2 text-stone-800">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border border-white shadow-2xs"
                          style={{ background: `${item.color}25` }}
                        >
                          <ItemIcon icono={item.icono} color={item.color} className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[150px] sm:max-w-none">{item.nombre}</span>
                      </span>
                      <span className="text-stone-500 text-right">
                        <strong className="text-stone-900">{catData.piezas} pzs</strong>
                        <span className="text-stone-400 text-[11px] ml-1">(${catData.monto} · {pct}%)</span>
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

        {/* ─── SECCIÓN: HISTORIAL DE CIERRES & FEED DE MOVIMIENTOS RECIENTES ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Historial de Cierres Diarios (Semáforo R11) */}
          <div className="rounded-3xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-500" />
                <span>Historial de Diferencias de Caja</span>
              </h2>
              <span className="text-[11px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                Últimos turnos
              </span>
            </div>

            <div className="space-y-2.5">
              {historialDisplay.map((h, idx) => {
                const esVerde = h.semaforo === 'VERDE';
                const esAmbar = h.semaforo === 'AMBAR';

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/80 p-3 text-xs"
                  >
                    <div>
                      <div className="font-extrabold text-stone-900 text-sm">{h.fecha}</div>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5">{h.jornada_id}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-stone-900 text-sm">
                        ${h.total_vendido.toLocaleString('es-MX')} MXN
                      </div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                          esVerde
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : esAmbar
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {h.diferencia >= 0 ? `+$${h.diferencia}` : `-$${Math.abs(h.diferencia)}`} MXN ({h.semaforo})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feed de Movimientos Recientes */}
          <div className="rounded-3xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-500" />
                <span>Movimientos Recientes</span>
              </h2>
              <span className="text-[11px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                {movimientos.length} registrados
              </span>
            </div>

            {movimientosRecientes.length === 0 ? (
              <div className="py-10 text-center text-xs font-semibold text-stone-400">
                Aún no hay movimientos registrados en esta jornada.
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {movimientosRecientes.map((mov) => {
                  const cat = catalogMap.get(mov.categoria_id);
                  const isVenta = mov.tipo === 'VENTA';
                  const isAnul = mov.tipo === 'ANULACION';
                  const isMerma = mov.tipo === 'MERMA';
                  const isEntrada = mov.tipo === 'ENTRADA';

                  return (
                    <div
                      key={mov.id_mov}
                      className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/70 p-2.5 text-xs hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white shadow-2xs"
                          style={{ background: `${cat?.color || '#F59E0B'}25` }}
                        >
                          <ItemIcon
                            icono={cat?.icono || 'package'}
                            color={cat?.color || '#F59E0B'}
                            className="w-4 h-4"
                          />
                        </div>
                        <div>
                          <div className="font-extrabold text-stone-900 leading-tight">
                            {cat?.nombre.replace('Paleta de ', '') || mov.categoria_id}{' '}
                            <span className="font-black text-amber-700">×{mov.cantidad}</span>
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {new Date(mov.ts_cliente).toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-black border ${
                            isVenta
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isAnul
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : isMerma
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : isEntrada
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {isVenta && <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                          {isEntrada && <ArrowDownLeft className="w-3 h-3 text-sky-600" />}
                          <span>{mov.tipo}</span>
                          {mov.monto_total > 0 && <span className="ml-0.5 font-extrabold">${mov.monto_total}</span>}
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
    </div>
  );
};

export default PanelScreen;

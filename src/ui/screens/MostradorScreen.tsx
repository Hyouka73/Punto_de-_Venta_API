import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  CloudCheck,
  CloudAlert,
  Lock,
  Trash2,
  PackagePlus,
  Plus,
  Minus,
  X,
  BarChart3,
  Sun,
  AlertCircle,
} from 'lucide-react';
import type { CatalogoItem } from '@/domain/config/types';
import { triggerHaptic } from '../utils/haptics';
import { ItemIcon } from '../utils/itemIcons';
import { CountUp } from '../components/react-bits/CountUp';

export interface RecentSale {
  readonly id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly total: number;
  readonly timestamp: number;
}

export interface MostradorScreenProps {
  readonly catalog?: readonly CatalogoItem[];
  readonly totalHoy?: number;
  readonly pendingSyncCount?: number;
  readonly jornadaActiva?: boolean;
  /** Stock restante por producto base (calculado desde movimientos) */
  readonly stock?: Readonly<Record<string, number>>;
  /** Piezas vendidas netas por producto en la jornada */
  readonly sold?: Readonly<Record<string, number>>;
  readonly adapterMode?: 'mock' | 'sheets';
  readonly onNavigateToApertura?: () => void;
  readonly onRegisterSale?: (item: CatalogoItem, cantidad: number) => Promise<string | void> | string | void;
  readonly onUndoSale?: (saleId: string) => Promise<void> | void;
  readonly onNavigateToMerma?: () => void;
  readonly onNavigateToEntrada?: () => void;
  readonly onNavigateToCierre?: () => void;
  readonly onNavigateToPanel?: () => void;
  readonly onNavigateToSync?: () => void;
}

/**
 * Pantalla Principal: MOSTRADOR (Venta Rápida de 1 Toque)
 *
 * Diseñada bajo especificaciones de Google Stitch & Ergonomía para Mostrador de Paletería.
 * - Latencia de respuesta táctil <100ms.
 * - Botones táctiles gigantes con altura mínima >88px.
 * - Cero scroll vertical en dispositivos móviles estándar.
 * - Soporte de manos frías/húmedas con feedback háptico de 50ms.
 * - Barra flotante de Deshacer durante 10 segundos con cuenta regresiva en vivo.
 * - Selector modal de cantidad rápida para ventas múltiples atómicas (R3).
 */
export const MostradorScreen: React.FC<MostradorScreenProps> = ({
  catalog = [],
  totalHoy = 0,
  pendingSyncCount = 0,
  jornadaActiva = true,
  stock = {},
  sold = {},
  adapterMode = 'mock',
  onNavigateToApertura,
  onRegisterSale,
  onUndoSale,
  onNavigateToMerma,
  onNavigateToEntrada,
  onNavigateToCierre,
  onNavigateToPanel,
  onNavigateToSync,
}) => {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [recentSale, setRecentSale] = useState<RecentSale | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(10);
  const [quantityModalItem, setQuantityModalItem] = useState<CatalogoItem | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(2);
  const [showCajaCerradaModal, setShowCajaCerradaModal] = useState<boolean>(false);
  const [stockAgotadoItem, setStockAgotadoItem] = useState<CatalogoItem | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  /** Stock restante visible: producto base directo; combo = mínimo de sus componentes. */
  const stockOf = (item: CatalogoItem): number | null => {
    if (item.es_combo && item.componentes?.length) {
      return Math.min(
        ...item.componentes.map((c) =>
          Math.floor((stock[c.id] ?? 0) / (c.cant ?? c.cantidad ?? 1))
        )
      );
    }
    return item.controla_stock ? (stock[item.id] ?? 0) : null;
  };

  // Manejador del temporizador de la barra Deshacer (10 segundos)
  useEffect(() => {
    if (!recentSale) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    setUndoSecondsLeft(10);

    countdownTimerRef.current = setInterval(() => {
      setUndoSecondsLeft((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setRecentSale(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [recentSale]);

  const handlePointerDown = (item: CatalogoItem) => {
    if (!jornadaActiva) {
      triggerHaptic(80);
      setShowCajaCerradaModal(true);
      return;
    }

    const available = stockOf(item);
    if (available !== null && available <= 0) {
      triggerHaptic(80);
      setStockAgotadoItem(item);
      return;
    }

    isLongPressTriggeredRef.current = false;
    setActiveItem(item.id);

    // Iniciar detección de pulsación prolongada (long press >= 450ms para selector de cantidad)
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      triggerHaptic(60);
      setQuantityModalItem(item);
      const maxAllowed = available !== null ? Math.max(1, available) : 99;
      setSelectedQuantity(Math.min(2, maxAllowed));
      setActiveItem(null);
    }, 450);
  };

  const handlePointerUp = async (item: CatalogoItem) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!jornadaActiva) {
      setActiveItem(null);
      return;
    }

    const available = stockOf(item);
    if (available !== null && available <= 0) {
      setActiveItem(null);
      return;
    }

    if (isLongPressTriggeredRef.current) {
      return;
    }

    setActiveItem(null);
    await executeSale(item, 1);
  };

  const handlePointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setActiveItem(null);
  };

  const executeSale = async (item: CatalogoItem, cantidad: number) => {
    if (!jornadaActiva) {
      setShowCajaCerradaModal(true);
      return;
    }

    const available = stockOf(item);
    if (available !== null && (available <= 0 || cantidad > available)) {
      triggerHaptic(80);
      setStockAgotadoItem(item);
      return;
    }

    triggerHaptic(50);

    const generatedId =
      (await onRegisterSale?.(item, cantidad)) ||
      `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    setRecentSale({
      id: typeof generatedId === 'string' ? generatedId : `sale-${Date.now()}`,
      nombre: item.nombre,
      cantidad,
      total: item.precio * cantidad,
      timestamp: Date.now(),
    });
  };

  const handleUndo = async () => {
    if (!recentSale) return;
    triggerHaptic(70);

    if (onUndoSale) {
      await onUndoSale(recentSale.id);
    }

    setRecentSale(null);
  };

  const confirmQuantitySale = async () => {
    if (!jornadaActiva || !quantityModalItem) return;
    const item = quantityModalItem;
    const qty = selectedQuantity;
    const available = stockOf(item);
    if (available !== null && (available <= 0 || qty > available)) {
      triggerHaptic(80);
      setStockAgotadoItem(item);
      setQuantityModalItem(null);
      return;
    }
    setQuantityModalItem(null);
    await executeSale(item, qty);
  };

  const nameOf = (id: string) => catalog.find((c) => c.id === id)?.nombre ?? id;

  return (
    <div className="flex flex-col h-full w-full bg-gradient-to-b from-[#FFFDF9] via-[#FEF8F0] to-[#FDF3E7] select-none touch-manipulation overflow-hidden">
      {/* ─── BARRA SUPERIOR (HEADER BOUTIQUE) CON SAFE AREA ─── */}
      <header className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-white/95 backdrop-blur-md border-b border-amber-200/60 shadow-xs shrink-0 pt-safe">
        {/* Identidad de Marca & Acceso al Panel */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateToPanel}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/25 transition-transform active:scale-95 cursor-pointer"
            title="Abrir Panel Ejecutivo"
            aria-label="Abrir Panel Ejecutivo"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-black text-stone-900 tracking-tight text-base leading-none">
                Paletería
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                  jornadaActiva
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {jornadaActiva ? '● Abierta' : '○ Cerrada'}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                data-testid="adapter-badge"
                className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-bold ${
                  adapterMode === 'sheets' ? 'bg-sky-100 text-sky-800 border border-sky-300' : 'bg-stone-100 text-stone-600 border border-stone-200'
                }`}
              >
                {adapterMode === 'sheets' ? 'Sheets' : 'Mock'}
              </span>
            </div>
          </div>
        </div>

        {/* Total del día prominente con CountUp de React Bits */}
        <div className="flex items-center gap-2">
          <div className="bg-white/95 border-2 border-amber-200/80 rounded-2xl px-3 py-1 shadow-xs text-right">
            <span className="block text-[9px] font-black text-amber-800 uppercase tracking-widest leading-none">
              TOTAL HOY
            </span>
            <div className="flex items-baseline justify-end gap-0.5 mt-0.5">
              <span className="text-xs font-black text-amber-600">$</span>
              <CountUp
                to={totalHoy}
                duration={450}
                className="font-display text-xl font-black text-stone-900 tracking-tight"
              />
              <span className="text-[10px] font-bold text-stone-400 ml-0.5">MXN</span>
            </div>
          </div>

          {/* Botón de Sincronización */}
          {pendingSyncCount === 0 ? (
            <button
              type="button"
              onClick={onNavigateToSync}
              className="w-9 h-9 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Todos los movimientos sincronizados"
            >
              <CloudCheck className="w-5 h-5 text-emerald-600" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onNavigateToSync}
              className="h-9 px-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-400 flex items-center gap-1 text-amber-900 text-xs font-black animate-pulse shadow-xs active:scale-95 transition-all cursor-pointer"
              title={`${pendingSyncCount} movimientos en cola offline`}
            >
              <CloudAlert className="w-4 h-4 text-amber-600" />
              <span>{pendingSyncCount}</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── BANNER CUANDO NO HAY JORNADA ABIERTA ─── */}
      {!jornadaActiva && (
        <div className="mx-3 sm:mx-6 mt-3 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300/80 p-3.5 sm:p-5 flex items-center justify-between gap-3 shadow-sm shrink-0">
          <div>
            <p className="font-display text-base sm:text-lg font-extrabold text-amber-950">Jornada cerrada</p>
            <p className="text-xs sm:text-sm text-amber-900/80">Inicia el turno para registrar ventas.</p>
          </div>
          <button
            type="button"
            onClick={onNavigateToApertura}
            className="min-h-[50px] sm:min-h-[56px] px-5 sm:px-7 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-display font-black text-sm sm:text-base active:scale-95 transition-all shadow-md shadow-stone-900/20"
          >
            Abrir jornada
          </button>
        </div>
      )}

      {/* ─── CUADRÍCULA DE BOTONES TÁCTILES BOUTIQUE CON BLOQUEO CUANDO ESTÁ CERRADA ─── */}
      <div className="relative flex-1 overflow-hidden flex flex-col">
        <main
          className="flex-1 p-3 sm:p-5 lg:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 overflow-y-auto"
          style={{ gridAutoRows: 'minmax(105px, 1fr)' }}
        >
          {catalog.length === 0 && (
            <div className="col-span-full flex items-center justify-center text-center text-stone-500 font-semibold p-8">
              Sin productos activos. Agrégalos en Configuración.
            </div>
          )}
          {catalog.map((item) => {
            const isPressed = activeItem === item.id;
            const left = stockOf(item);
            const isAgotado = left !== null && left <= 0;
            const lowStock = left !== null && left > 0 && left <= 5;
            const soldQty = sold[item.id] ?? 0;

            return (
              <button
                key={item.id}
                type="button"
                disabled={!jornadaActiva || isAgotado}
                aria-disabled={!jornadaActiva || isAgotado}
                data-testid={`product-${item.id}`}
                onClick={() => {
                  if (!jornadaActiva) {
                    triggerHaptic(80);
                    setShowCajaCerradaModal(true);
                  } else if (isAgotado) {
                    triggerHaptic(80);
                    setStockAgotadoItem(item);
                  }
                }}
                onPointerDown={() => handlePointerDown(item)}
                onPointerUp={() => handlePointerUp(item)}
                onPointerCancel={handlePointerCancel}
                className={`group relative flex flex-col justify-between p-3 rounded-[26px] border-2 transition-all duration-100 text-left overflow-hidden ${
                  isPressed ? 'scale-[0.96] ring-4 ring-amber-400/50' : 'hover:-translate-y-0.5'
                } ${
                  !jornadaActiva
                    ? 'opacity-35 grayscale-[20%] cursor-not-allowed select-none'
                    : isAgotado
                    ? 'opacity-40 grayscale-[60%] cursor-not-allowed select-none bg-rose-50/20 border-rose-300'
                    : 'cursor-pointer active:scale-[0.96]'
                }`}
                style={{
                  minHeight: '88px',
                  borderColor: isAgotado ? '#FDA4AF' : `${item.color}55`,
                  background: isAgotado
                    ? '#F8FAFC'
                    : `linear-gradient(145deg, #FFFFFF 0%, #FFFFFF 52%, ${item.color}22 100%)`,
                  boxShadow: isAgotado
                    ? 'none'
                    : isPressed
                    ? 'inset 0 2px 4px rgba(0,0,0,0.06)'
                    : `0 10px 22px -6px ${item.color}35, 0 3px 8px rgba(0,0,0,0.04)`,
                }}
              >
                {/* Encabezado: Icono en disco pastel + Badges */}
                <div className="flex items-center justify-between w-full">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs border border-white"
                    style={{
                      background: isAgotado
                        ? '#E2E8F0'
                        : `linear-gradient(135deg, #FFFFFF 0%, ${item.color}35 100%)`,
                      boxShadow: isAgotado ? 'none' : `0 3px 10px ${item.color}30`,
                    }}
                  >
                    <ItemIcon icono={item.icono} color={isAgotado ? '#64748B' : item.color} className="w-6 h-6" />
                  </div>

                  <div className="flex items-center gap-1">
                    {soldQty > 0 && (
                      <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-display text-xs font-black px-2.5 py-0.5 shadow-sm shadow-orange-500/30">
                        ×{soldQty}
                      </span>
                    )}
                    {item.es_combo && (
                      <span className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 shadow-xs">
                        ★ COMBO
                      </span>
                    )}
                  </div>
                </div>

                {/* Título del Producto */}
                <div className="w-full my-0.5">
                  <h2 className={`font-display font-extrabold text-base tracking-tight leading-tight truncate ${isAgotado ? 'text-stone-400' : 'text-stone-900'}`}>
                    {item.nombre.replace('Paleta de ', '')}
                  </h2>
                  {item.es_combo && item.componentes && (
                    <p className="text-[11px] font-bold text-purple-900/80 leading-tight truncate mt-0.5">
                      {item.componentes.map((c) => `${c.cant ?? c.cantidad ?? 1} ${nameOf(c.id).replace('Paleta de ', '')}`).join(' + ')}
                    </p>
                  )}
                </div>

                {/* Pie de tarjeta: Stock restante + Precio pastilla */}
                <div className="flex items-end justify-between w-full">
                  {isAgotado ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 tracking-wider">
                      ⛔ AGOTADO
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        lowStock
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-white/80 text-stone-600 border border-stone-200/60'
                      }`}
                    >
                      {left === null ? '' : `Quedan ${left}`}
                    </span>
                  )}
                  <span
                    className={`font-display font-black text-lg tracking-tight px-3 py-0.5 rounded-xl border ${
                      isAgotado
                        ? 'bg-stone-200 text-stone-400 border-stone-300 line-through'
                        : 'bg-stone-900 text-amber-300 shadow-xs border border-stone-800'
                    }`}
                  >
                    ${item.precio}
                  </span>
                </div>
              </button>
            );
          })}
        </main>

        {/* ─── OVERLAY ELEGANTE DE BLOQUEO CUANDO LA CAJA ESTÁ CERRADA ─── */}
        {!jornadaActiva && (
          <div className="absolute inset-x-3 bottom-3 top-3 z-20 flex flex-col items-center justify-center rounded-[28px] bg-stone-950/75 backdrop-blur-md p-6 text-center text-white shadow-2xl border border-stone-700/60 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border-2 border-amber-400/80 flex items-center justify-center text-amber-300 mb-3 shadow-lg shadow-amber-500/20">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="font-display font-black text-2xl text-white tracking-tight">Caja Cerrada</h3>
            <p className="text-xs text-stone-200 mt-1.5 max-w-[260px] font-medium leading-relaxed">
              No es posible registrar ventas con la caja cerrada. Abre la jornada realizando el conteo inicial de apertura.
            </p>
            <button
              type="button"
              onClick={onNavigateToApertura}
              className="mt-5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-display font-black text-sm shadow-xl shadow-amber-500/30 transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Sun className="w-5 h-5 text-stone-950" />
              <span>Abrir Jornada (Apertura)</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── BARRA FLOTANTE DE DESHACER (10 SEGUNDOS) ─── */}
      {recentSale && (
        <div className="px-3 pb-2 transition-transform duration-150 animate-bounce-short">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/95 backdrop-blur-md text-white shadow-2xl border border-stone-700/70">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-ping" />
              <div className="truncate">
                <span className="text-[11px] font-semibold text-stone-300 block">
                  Venta registrada:
                </span>
                <span className="text-sm font-extrabold text-white truncate">
                  {recentSale.cantidad > 1 ? `${recentSale.cantidad}x ` : ''}
                  {recentSale.nombre} (${recentSale.total} MXN)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-sm transition-transform active:scale-95 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Deshacer ({undoSecondsLeft}s)</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── BARRA INFERIOR DE NAVEGACIÓN Y OPERACIONES CON SAFE AREA ─── */}
      <footer className="grid grid-cols-3 gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-white/95 backdrop-blur-md border-t border-amber-200/50 shadow-xs shrink-0 pb-safe">
        <button
          type="button"
          onClick={onNavigateToMerma}
          className="min-h-[50px] sm:min-h-[56px] flex flex-col items-center justify-center py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 font-extrabold text-xs sm:text-sm transition-transform active:scale-95 border border-stone-200/90 shadow-2xs cursor-pointer"
        >
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 mb-0.5" />
          <span>Merma</span>
        </button>

        <button
          type="button"
          onClick={onNavigateToEntrada}
          className="min-h-[50px] sm:min-h-[56px] flex flex-col items-center justify-center py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 font-extrabold text-xs sm:text-sm transition-transform active:scale-95 border border-stone-200/90 shadow-2xs cursor-pointer"
        >
          <PackagePlus className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 mb-0.5" />
          <span>Entrada</span>
        </button>

        {jornadaActiva ? (
          <button
            type="button"
            onClick={onNavigateToCierre}
            className="min-h-[50px] sm:min-h-[56px] flex flex-col items-center justify-center py-2 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 font-extrabold text-xs sm:text-sm transition-transform active:scale-95 border border-amber-300/80 shadow-2xs cursor-pointer"
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700" />
            </div>
            <span>Cierre</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNavigateToApertura}
            className="min-h-[50px] sm:min-h-[56px] flex flex-col items-center justify-center py-2 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-stone-950 font-black text-xs sm:text-sm transition-transform active:scale-95 border border-amber-300 shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-950" />
            </div>
            <span>Abrir Caja</span>
          </button>
        )}
      </footer>

      {/* ─── MODAL TÁCTIL DE CANTIDAD RÁPIDA (R3) CON TOPE DE STOCK ─── */}
      {quantityModalItem && (() => {
        const available = stockOf(quantityModalItem);
        const maxAllowed = available !== null ? Math.max(1, available) : 99;

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="w-full max-w-sm rounded-counter bg-white p-5 shadow-2xl border border-stone-200 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Venta Múltiple
                  </span>
                  <h3 className="text-xl font-extrabold text-stone-900">
                    {quantityModalItem.nombre}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setQuantityModalItem(null)}
                  className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Indicador de existencias en el congelador */}
              {available !== null && (
                <div className="mt-2 text-center text-xs font-bold text-amber-800 bg-amber-50 rounded-xl py-1.5 px-3 border border-amber-200/80">
                  Existencia disponible:{' '}
                  <span className="font-black text-amber-950">{available} piezas</span>
                </div>
              )}

              {/* Selector interactivo (+ / -) */}
              <div className="my-5 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(40);
                    setSelectedQuantity((q) => Math.max(1, q - 1));
                  }}
                  className="w-16 h-16 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-900 font-extrabold text-2xl flex items-center justify-center active:scale-90 transition-transform shadow-xs cursor-pointer"
                >
                  <Minus className="w-7 h-7" />
                </button>

                <div className="text-center min-w-[100px]">
                  <span className="text-5xl font-black text-stone-900 tracking-tight">
                    {selectedQuantity}
                  </span>
                  <span className="block text-xs font-bold text-stone-400 uppercase">
                    piezas
                  </span>
                </div>

                <button
                  type="button"
                  disabled={selectedQuantity >= maxAllowed}
                  onClick={() => {
                    if (selectedQuantity < maxAllowed) {
                      triggerHaptic(40);
                      setSelectedQuantity((q) => q + 1);
                    } else {
                      triggerHaptic(80);
                    }
                  }}
                  className={`w-16 h-16 rounded-2xl text-2xl flex items-center justify-center transition-transform shadow-xs ${
                    selectedQuantity >= maxAllowed
                      ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-900 font-extrabold active:scale-90 cursor-pointer'
                  }`}
                  title={selectedQuantity >= maxAllowed ? 'No hay más piezas en stock' : 'Agregar 1'}
                >
                  <Plus className="w-7 h-7" />
                </button>
              </div>

              {/* Botones de selección rápida (topados al stock real) */}
              <div className="grid grid-cols-5 gap-2 mb-5">
                {[2, 3, 4, 5, 10].map((num) => {
                  const disabled = num > maxAllowed;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        triggerHaptic(30);
                        setSelectedQuantity(num);
                      }}
                      className={`py-2 rounded-xl font-black text-sm transition-transform active:scale-90 ${
                        selectedQuantity === num
                          ? 'bg-amber-500 text-stone-950 shadow-sm'
                          : disabled
                          ? 'bg-stone-100/60 text-stone-300 cursor-not-allowed'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              {/* Botón de Confirmación Total */}
              <button
                type="button"
                onClick={confirmQuantitySale}
                className="w-full py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-lg flex items-center justify-between px-6 shadow-lg active:scale-[0.98] transition-transform cursor-pointer"
              >
                <span>Cobrar {selectedQuantity} piezas</span>
                <span className="px-3 py-1 rounded-xl bg-amber-400 text-stone-950 font-black text-base">
                  ${quantityModalItem.precio * selectedQuantity} MXN
                </span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* ─── MODAL TÁCTIL DE AVISO: CAJA CERRADA ─── */}
      {showCajaCerradaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-amber-200 text-center animate-scale-up">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 mb-3 shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="font-display font-black text-2xl text-stone-900 tracking-tight">
              Caja Cerrada
            </h3>
            <p className="text-sm text-stone-600 mt-2 leading-relaxed">
              Las ventas están bloqueadas porque la caja no ha sido abierta. Realiza la apertura de jornada para comenzar a registrar movimientos.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCajaCerradaModal(false)}
                className="flex-1 py-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm cursor-pointer active:scale-95 transition-all"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCajaCerradaModal(false);
                  onNavigateToApertura?.();
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 text-stone-950 font-display font-black text-sm shadow-md shadow-orange-500/25 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Sun className="w-4 h-4" />
                <span>Abrir Caja</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL TÁCTIL DE AVISO: PRODUCTO AGOTADO (0 STOCK) ─── */}
      {stockAgotadoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl border border-rose-200 text-center animate-scale-up">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-rose-600 mb-3 shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="font-display font-black text-2xl text-stone-900 tracking-tight">
              Producto Agotado
            </h3>
            <p className="text-sm text-stone-600 mt-2 leading-relaxed">
              No es posible vender <span className="font-extrabold text-stone-900">{stockAgotadoItem.nombre}</span> porque no hay existencias en el inventario actual (0 piezas disponibles).
            </p>
            <p className="text-xs text-amber-900 bg-amber-50 rounded-xl p-2.5 mt-3 border border-amber-200/90 font-medium">
              Si recibiste mercancía del taller, regístrala primero en la sección de <strong>Entrada</strong>.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setStockAgotadoItem(null)}
                className="flex-1 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-display font-black text-sm shadow-md cursor-pointer active:scale-95 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MostradorScreen;

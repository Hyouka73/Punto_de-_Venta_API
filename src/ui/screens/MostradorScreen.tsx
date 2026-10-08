import React, { useState, useEffect, useRef } from 'react';
import {
  Droplets,
  IceCream,
  Cookie,
  Sparkles,
  Star,
  RotateCcw,
  CloudCheck,
  CloudAlert,
  Lock,
  Trash2,
  PackagePlus,
  Plus,
  Minus,
  X,
  ShoppingBag,
} from 'lucide-react';
import type { CatalogoItem } from '@/domain/config/types';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { triggerHaptic } from '../utils/haptics';

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
  readonly onRegisterSale?: (item: CatalogoItem, cantidad: number) => Promise<string | void> | string | void;
  readonly onUndoSale?: (saleId: string) => Promise<void> | void;
  readonly onNavigateToMerma?: () => void;
  readonly onNavigateToEntrada?: () => void;
  readonly onNavigateToCierre?: () => void;
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
  catalog = DEFAULT_CATALOG,
  totalHoy = 0,
  pendingSyncCount = 0,
  jornadaActiva = true,
  onRegisterSale,
  onUndoSale,
  onNavigateToMerma,
  onNavigateToEntrada,
  onNavigateToCierre,
}) => {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [recentSale, setRecentSale] = useState<RecentSale | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(10);
  const [quantityModalItem, setQuantityModalItem] = useState<CatalogoItem | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(2);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    isLongPressTriggeredRef.current = false;
    setActiveItem(item.id);

    // Iniciar detección de pulsación prolongada (long press >= 450ms para selector de cantidad)
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      triggerHaptic(60);
      setQuantityModalItem(item);
      setSelectedQuantity(2);
      setActiveItem(null);
    }, 450);
  };

  const handlePointerUp = async (item: CatalogoItem) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
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
    if (!quantityModalItem) return;
    const item = quantityModalItem;
    const qty = selectedQuantity;
    setQuantityModalItem(null);
    await executeSale(item, qty);
  };

  // Renderizador de iconos por categoría
  const renderItemIcon = (icono: string, color: string) => {
    const iconClass = "w-10 h-10 drop-shadow-sm";
    switch (icono) {
      case 'droplets':
        return <Droplets className={iconClass} style={{ color }} />;
      case 'ice-cream':
        return <IceCream className={iconClass} style={{ color }} />;
      case 'cookie':
        return <Cookie className={iconClass} style={{ color }} />;
      case 'sparkles':
        return <Sparkles className={iconClass} style={{ color }} />;
      default:
        return <Star className={iconClass} style={{ color }} />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-lg mx-auto bg-paleteria-bg select-none touch-manipulation overflow-hidden">
      {/* ─── BARRA SUPERIOR (HEADER) ─── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200/80 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shadow-inner">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                jornadaActiva
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {jornadaActiva ? '● Jornada Activa' : '○ Cerrada'}
            </span>
          </div>
        </div>

        {/* Total del día prominente */}
        <div className="text-right">
          <span className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            Total Hoy
          </span>
          <span className="text-xl font-extrabold text-stone-900 tracking-tight">
            ${totalHoy.toLocaleString('es-MX')} <span className="text-xs font-bold text-stone-500">MXN</span>
          </span>
        </div>

        {/* Indicador de Sincronización */}
        <div>
          {pendingSyncCount === 0 ? (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-xs"
              title="Todos los movimientos guardados localmente y sincronizados"
            >
              <CloudCheck className="w-4 h-4 text-emerald-600" />
              <span>Guardado</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold animate-pulse"
              title={`${pendingSyncCount} movimientos en cola offline`}
            >
              <CloudAlert className="w-4 h-4 text-amber-600" />
              <span>{pendingSyncCount} pend.</span>
            </div>
          )}
        </div>
      </header>

      {/* ─── CUADRÍCULA DE BOTONES TÁCTILES (ZERO SCROLL ~75% DE PANTALLA) ─── */}
      <main className="flex-1 p-3 grid grid-cols-2 gap-3 content-stretch overflow-hidden">
        {catalog.map((item) => {
          const isPressed = activeItem === item.id;

          // Colores de fondo suaves con alto contraste para luz directa
          let bgClass = "bg-white border-stone-200 text-stone-900";
          let priceBadgeClass = "bg-stone-900 text-white";

          if (item.id === 'CAT_AGUA') {
            bgClass = "bg-sky-50 border-sky-300 hover:bg-sky-100/80";
            priceBadgeClass = "bg-sky-600 text-white";
          } else if (item.id === 'CAT_CREMA') {
            bgClass = "bg-amber-50 border-amber-300 hover:bg-amber-100/80";
            priceBadgeClass = "bg-amber-500 text-stone-900";
          } else if (item.id === 'CAT_SANDWICH') {
            bgClass = "bg-orange-50 border-orange-300 hover:bg-orange-100/80";
            priceBadgeClass = "bg-orange-600 text-white";
          } else if (item.id === 'CAT_NIEVE') {
            bgClass = "bg-rose-50 border-rose-300 hover:bg-rose-100/80";
            priceBadgeClass = "bg-rose-600 text-white";
          } else if (item.id === 'CMB_DUO') {
            bgClass = "bg-purple-50 border-purple-300 hover:bg-purple-100/80";
            priceBadgeClass = "bg-purple-600 text-white";
          }

          return (
            <button
              key={item.id}
              type="button"
              disabled={!jornadaActiva}
              onPointerDown={() => handlePointerDown(item)}
              onPointerUp={() => handlePointerUp(item)}
              onPointerCancel={handlePointerCancel}
              className={`relative flex flex-col justify-between p-4 rounded-counter border-2 shadow-sm transition-all duration-75 active:shadow-inner ${bgClass} ${
                isPressed ? 'scale-[0.96] brightness-95 ring-4 ring-amber-300/60' : ''
              } ${!jornadaActiva ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.96]'}`}
              style={{ minHeight: '88px' }}
            >
              {/* Encabezado de la tarjeta: Icono e insignia de combo */}
              <div className="flex items-center justify-between w-full">
                <div className="p-2 rounded-2xl bg-white/80 backdrop-blur-xs shadow-xs">
                  {renderItemIcon(item.icono, item.color)}
                </div>
                {item.es_combo && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-purple-600 text-white uppercase shadow-xs">
                    ★ COMBO
                  </span>
                )}
              </div>

              {/* Título de la categoría */}
              <div className="w-full text-left my-auto">
                <h2 className="text-xl font-extrabold tracking-tight text-stone-900 leading-tight">
                  {item.nombre.replace('Paleta de ', '')}
                </h2>
                {item.es_combo && (
                  <p className="text-[11px] font-semibold text-purple-700 leading-none mt-0.5">
                    1 Agua + 1 Crema
                  </p>
                )}
              </div>

              {/* Pie de la tarjeta: Precio gigante */}
              <div className="flex items-end justify-between w-full mt-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  1 Toque
                </span>
                <span
                  className={`px-3 py-1 rounded-xl text-lg font-black tracking-tight shadow-xs ${priceBadgeClass}`}
                >
                  ${item.precio}
                </span>
              </div>
            </button>
          );
        })}
      </main>

      {/* ─── BARRA FLOTANTE DE DESHACER (10 SEGUNDOS) ─── */}
      {recentSale && (
        <div className="px-3 pb-2 transition-transform duration-150 animate-bounce-short">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900 text-white shadow-xl border border-stone-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-ping" />
              <div className="truncate">
                <span className="text-xs font-semibold text-stone-300 block">
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-sm transition-transform active:scale-95 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Deshacer ({undoSecondsLeft}s)</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── BARRA INFERIOR DE NAVEGACIÓN Y OPERACIONES ─── */}
      <footer className="grid grid-cols-3 gap-2 px-3 py-2.5 bg-white border-t border-stone-200 shrink-0">
        <button
          type="button"
          onClick={onNavigateToMerma}
          className="flex flex-col items-center justify-center p-2 rounded-2xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-bold text-xs transition-transform active:scale-95 border border-stone-200"
        >
          <Trash2 className="w-5 h-5 text-stone-600 mb-0.5" />
          <span>Merma</span>
        </button>

        <button
          type="button"
          onClick={onNavigateToEntrada}
          className="flex flex-col items-center justify-center p-2 rounded-2xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-bold text-xs transition-transform active:scale-95 border border-stone-200"
        >
          <PackagePlus className="w-5 h-5 text-stone-600 mb-0.5" />
          <span>Entrada</span>
        </button>

        <button
          type="button"
          onClick={onNavigateToCierre}
          className="flex flex-col items-center justify-center p-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-transform active:scale-95 border border-amber-200"
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Lock className="w-4 h-4 text-amber-700" />
          </div>
          <span>Cierre</span>
        </button>
      </footer>

      {/* ─── MODAL TÁCTIL DE CANTIDAD RÁPIDA (R3) ─── */}
      {quantityModalItem && (
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
                className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector interactivo (+ / -) */}
            <div className="my-5 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(40);
                  setSelectedQuantity((q) => Math.max(1, q - 1));
                }}
                className="w-16 h-16 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-900 font-extrabold text-2xl flex items-center justify-center active:scale-90 transition-transform shadow-xs"
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
                onClick={() => {
                  triggerHaptic(40);
                  setSelectedQuantity((q) => q + 1);
                }}
                className="w-16 h-16 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-900 font-extrabold text-2xl flex items-center justify-center active:scale-90 transition-transform shadow-xs"
              >
                <Plus className="w-7 h-7" />
              </button>
            </div>

            {/* Botones de selección rápida (2, 3, 4, 5, 10 piezas) */}
            <div className="grid grid-cols-5 gap-2 mb-5">
              {[2, 3, 4, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    triggerHaptic(30);
                    setSelectedQuantity(num);
                  }}
                  className={`py-2 rounded-xl font-black text-sm transition-transform active:scale-90 ${
                    selectedQuantity === num
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Botón de Confirmación Total */}
            <button
              type="button"
              onClick={confirmQuantitySale}
              className="w-full py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-lg flex items-center justify-between px-6 shadow-lg active:scale-[0.98] transition-transform"
            >
              <span>Cobrar {selectedQuantity} piezas</span>
              <span className="px-3 py-1 rounded-xl bg-amber-400 text-stone-950 font-black text-base">
                ${quantityModalItem.precio * selectedQuantity} MXN
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MostradorScreen;

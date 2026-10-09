import React, { useState } from 'react';
import {
  PackagePlus,
  Check,
  X,
  Droplets,
  IceCream,
  Cookie,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import type { CatalogoItem } from '@/domain/config/types';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { triggerHaptic } from '../utils/haptics';

export interface EntradaScreenProps {
  readonly catalog?: readonly CatalogoItem[];
  readonly onSaveEntrada: (data: {
    entradas: Record<string, number>;
    nota?: string;
  }) => Promise<void> | void;
  readonly onCancel?: () => void;
}

/**
 * Pantalla 5: ENTRADA DE PRODUCTO (Recepción de Taller / Proveedor - R7)
 *
 * Implementada según especificación Stitch.
 * - Atajos rápidos táctiles (+5, +10, +25) por categoría física.
 * - Resumen visual automático del lote recibido.
 * - Entrada registrada en menos de 3 toques.
 */
export const EntradaScreen: React.FC<EntradaScreenProps> = ({
  catalog = DEFAULT_CATALOG,
  onSaveEntrada,
  onCancel,
}) => {
  const physicalItems = catalog.filter((item) => item.controla_stock && item.activo);

  const [entradas, setEntradas] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of physicalItems) {
      initial[item.id] = 0;
    }
    return initial;
  });

  const [nota, setNota] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleQuickAdd = (itemId: string, amount: number) => {
    triggerHaptic(40);
    setEntradas((prev) => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] ?? 0) + amount),
    }));
  };

  const handleResetItem = (itemId: string) => {
    triggerHaptic(30);
    setEntradas((prev) => ({
      ...prev,
      [itemId]: 0,
    }));
  };

  const totalPiezas = Object.values(entradas).reduce((sum, val) => sum + val, 0);

  const handleSubmit = async () => {
    if (totalPiezas <= 0) return;
    triggerHaptic(80);
    setIsSubmitting(true);

    try {
      // Filtrar solo las que tienen cantidad > 0
      const payload: Record<string, number> = {};
      for (const [id, cant] of Object.entries(entradas)) {
        if (cant > 0) payload[id] = cant;
      }

      await onSaveEntrada({
        entradas: payload,
        nota: nota.trim() || undefined,
      });

      onCancel?.();
    } catch {
      setIsSubmitting(false);
    }
  };

  const renderCategoryIcon = (icono: string, color: string) => {
    const iconClass = 'w-6 h-6';
    switch (icono) {
      case 'droplets':
        return <Droplets className={iconClass} style={{ color }} />;
      case 'ice-cream':
        return <IceCream className={iconClass} style={{ color }} />;
      case 'cookie':
        return <Cookie className={iconClass} style={{ color }} />;
      default:
        return <Sparkles className={iconClass} style={{ color }} />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-lg mx-auto bg-stone-50 select-none touch-manipulation overflow-hidden">
      {/* ─── HEADER ─── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 shadow-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-stone-800 leading-tight">
              Entrada de Mercancía
            </h1>
            <p className="text-xs font-semibold text-stone-500">
              Registra los productos que llegaron del taller o proveedor (R7)
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(40);
              onCancel();
            }}
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
            title="Regresar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Banner de resumen del lote */}
        <div className="bg-amber-500 text-white rounded-3xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
              Lote a ingresar
            </span>
            <div className="text-2xl font-black">{totalPiezas} piezas recibidas</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
            <PackagePlus className="w-7 h-7" />
          </div>
        </div>

        {/* Lista de categorías con atajos táctiles */}
        <div className="space-y-3">
          {physicalItems.map((item) => {
            const cant = entradas[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: `${item.color}25` }}
                    >
                      {renderCategoryIcon(item.icono, item.color)}
                    </div>
                    <div>
                      <div className="font-extrabold text-stone-800 text-sm">{item.nombre}</div>
                      <div className="text-xs text-stone-400">${item.precio} venta</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-stone-900 w-10 text-right">
                      {cant}
                    </span>
                    {cant > 0 && (
                      <button
                        type="button"
                        onClick={() => handleResetItem(item.id)}
                        className="w-7 h-7 rounded-lg bg-stone-100 text-stone-400 hover:text-stone-600 flex items-center justify-center"
                        title="Restablecer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Atajos táctiles (+1, +5, +10, +25) */}
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(item.id, 1)}
                    className="py-2 rounded-xl bg-stone-100 active:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-0.5"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(item.id, 5)}
                    className="py-2 rounded-xl bg-amber-50 active:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-0.5 border border-amber-200/50"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(item.id, 10)}
                    className="py-2 rounded-xl bg-amber-100 active:bg-amber-200 text-amber-900 font-extrabold text-xs flex items-center justify-center gap-0.5"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(item.id, 25)}
                    className="py-2 rounded-xl bg-amber-500 active:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-0.5 shadow-sm"
                  >
                    +25
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota opcional */}
        <div className="px-1">
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota opcional (ej. Entrega de taller de Don José)"
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </main>

      {/* ─── FOOTER CON BOTÓN DE CONFIRMAR ─── */}
      <footer className="p-4 bg-white border-t border-stone-200 shadow-lg shrink-0">
        <button
          type="button"
          disabled={totalPiezas <= 0 || isSubmitting}
          onClick={handleSubmit}
          className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-base rounded-2xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          <Check className="w-5 h-5" />
          <span>Confirmar e Ingresar a Inventario</span>
        </button>
      </footer>
    </div>
  );
};

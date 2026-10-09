import React, { useState } from 'react';
import {
  Trash2,
  Heart,
  Droplets,
  AlertOctagon,
  Minus,
  Plus,
  Check,
  X,
  Droplet,
  IceCream,
  Cookie,
  Sparkles,
} from 'lucide-react';
import type { CatalogoItem, MotivoMermaId } from '@/domain/config/types';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { triggerHaptic } from '../utils/haptics';

export interface MermaScreenProps {
  readonly catalog?: readonly CatalogoItem[];
  readonly onSaveMerma: (data: {
    categoriaId: string;
    cantidad: number;
    motivo: MotivoMermaId;
    nota?: string;
  }) => Promise<void> | void;
  readonly onCancel?: () => void;
}

/**
 * Pantalla 4: REGISTRO DE MERMA Y CONSUMO DE LA CASA (R6)
 *
 * Implementada según especificación Stitch.
 * - 3 botones gigantes para los motivos estándar (Palo roto, Descongelada, Consumo casa).
 * - Selector rápido de categoría con chips táctiles de alto contraste.
 * - Stepper de cantidad ergonómico.
 * - Registro en menos de 3 toques.
 */
export const MermaScreen: React.FC<MermaScreenProps> = ({
  catalog = DEFAULT_CATALOG,
  onSaveMerma,
  onCancel,
}) => {
  const physicalItems = catalog.filter((item) => item.controla_stock && item.activo);

  const [selectedMotivo, setSelectedMotivo] = useState<MotivoMermaId>('palo_roto_deforme');
  const [selectedCategoria, setSelectedCategoria] = useState<string>(
    physicalItems[0]?.id ?? 'CAT_AGUA'
  );
  const [cantidad, setCantidad] = useState<number>(1);
  const [nota, setNota] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleMotivoSelect = (motivo: MotivoMermaId) => {
    triggerHaptic(40);
    setSelectedMotivo(motivo);
  };

  const handleCategoriaSelect = (catId: string) => {
    triggerHaptic(40);
    setSelectedCategoria(catId);
  };

  const handleCantidadChange = (delta: number) => {
    triggerHaptic(30);
    setCantidad((prev) => Math.max(1, prev + delta));
  };

  const handleSubmit = async () => {
    triggerHaptic(70);
    setIsSubmitting(true);
    try {
      await onSaveMerma({
        categoriaId: selectedCategoria,
        cantidad,
        motivo: selectedMotivo,
        nota: nota.trim() || undefined,
      });
      onCancel?.();
    } catch {
      setIsSubmitting(false);
    }
  };

  const renderCategoryIcon = (icono: string, color: string) => {
    const iconClass = 'w-5 h-5';
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
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shadow-inner">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-stone-800 leading-tight">
              Registrar Merma o Consumo
            </h1>
            <p className="text-xs font-semibold text-stone-500">
              Descuento de inventario sin afectar dinero en caja (R6)
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
        {/* 1. SELECCIÓN DE MOTIVO (3 BOTONES GIGANTES) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            1. Selecciona el motivo
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {/* Motivo 1: Palo Roto */}
            <button
              type="button"
              onClick={() => handleMotivoSelect('palo_roto_deforme')}
              className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                selectedMotivo === 'palo_roto_deforme'
                  ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                  : 'bg-white border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-stone-900 text-sm">Palo Roto / Deforme</div>
                <div className="text-[11px] text-stone-500">
                  Producto roto físicamente o mal sellado
                </div>
              </div>
              {selectedMotivo === 'palo_roto_deforme' && (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
              )}
            </button>

            {/* Motivo 2: Descongelada */}
            <button
              type="button"
              onClick={() => handleMotivoSelect('descongelada_cristalizada')}
              className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                selectedMotivo === 'descongelada_cristalizada'
                  ? 'bg-blue-500/10 border-blue-500 shadow-sm ring-2 ring-blue-400/30'
                  : 'bg-white border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Droplet className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-stone-900 text-sm">
                  Descongelada / Cristalizada
                </div>
                <div className="text-[11px] text-stone-500">Afectada por temperatura o deshielo</div>
              </div>
              {selectedMotivo === 'descongelada_cristalizada' && (
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
              )}
            </button>

            {/* Motivo 3: Consumo Casa */}
            <button
              type="button"
              onClick={() => handleMotivoSelect('consumo_casa')}
              className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                selectedMotivo === 'consumo_casa'
                  ? 'bg-rose-500/10 border-rose-500 shadow-sm ring-2 ring-rose-400/30'
                  : 'bg-white border-stone-200 hover:bg-stone-50'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-stone-900 text-sm">Consumo de la Casa</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                    Familiar
                  </span>
                </div>
                <div className="text-[11px] text-stone-500">
                  Consumo del personal o familia (medición aislada)
                </div>
              </div>
              {selectedMotivo === 'consumo_casa' && (
                <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 2. SELECTOR DE CATEGORÍA */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            2. Selecciona el producto
          </label>
          <div className="grid grid-cols-2 gap-2">
            {physicalItems.map((item) => {
              const isSelected = selectedCategoria === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCategoriaSelect(item.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-md scale-[1.02]'
                      : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isSelected ? '#ffffff25' : `${item.color}25` }}
                  >
                    {renderCategoryIcon(item.icono, isSelected ? '#ffffff' : item.color)}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-xs truncate">{item.nombre}</div>
                    <div
                      className={`text-[10px] ${
                        isSelected ? 'text-stone-300' : 'text-stone-400'
                      }`}
                    >
                      ${item.precio}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. STEPPER DE CANTIDAD */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
              3. Cantidad de piezas
            </label>
            <span className="text-xs text-stone-400">Total a descontar del stock</span>
          </div>

          <div className="flex items-center gap-2 bg-stone-50 p-1 rounded-2xl border border-stone-200">
            <button
              type="button"
              disabled={cantidad <= 1}
              onClick={() => handleCantidadChange(-1)}
              className="w-10 h-10 rounded-xl bg-white text-stone-700 active:bg-stone-100 flex items-center justify-center font-bold text-lg shadow-sm disabled:opacity-30"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="w-12 text-center text-xl font-black text-stone-900">{cantidad}</span>
            <button
              type="button"
              onClick={() => handleCantidadChange(1)}
              className="w-10 h-10 rounded-xl bg-amber-500 text-white active:bg-amber-600 flex items-center justify-center font-bold text-lg shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nota opcional */}
        <div className="px-1">
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota opcional (ej. Se cayó al servir)"
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </main>

      {/* ─── FOOTER CON BOTÓN DE GUARDAR ─── */}
      <footer className="p-4 bg-white border-t border-stone-200 shadow-lg shrink-0">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="w-full h-14 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-base rounded-2xl shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <Check className="w-5 h-5" />
          <span>Guardar Merma ({cantidad} pza{cantidad > 1 ? 's' : ''})</span>
        </button>
      </footer>
    </div>
  );
};

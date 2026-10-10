import React, { useState } from 'react';
import {
  Sun,
  Droplets,
  IceCream,
  Cookie,
  Sparkles,
  Plus,
  Minus,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Delete,
  X,
  AlertCircle,
} from 'lucide-react';
import type { CatalogoItem } from '@/domain/config/types';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { triggerHaptic } from '../utils/haptics';

export interface AperturaScreenProps {
  readonly fecha?: string;
  readonly initialStock?: Readonly<Record<string, number>>;
  readonly defaultFondoInicial?: number;
  readonly catalog?: readonly CatalogoItem[];
  readonly supervisorPinExpected?: string;
  readonly onConfirmApertura: (data: {
    fecha: string;
    fondoInicial: number;
    inventarioInicial: Record<string, number>;
    usuarioApertura: string;
    notaApertura?: string;
  }) => Promise<void> | void;
  readonly onCancel?: () => void;
}

const DEFAULT_SUGGESTED_STOCK: Record<string, number> = {
  CAT_AGUA: 45,
  CAT_CREMA: 38,
  CAT_SANDWICH: 14,
  CAT_NIEVE: 10,
};

/**
 * Pantalla 2: APERTURA DE JORNADA (Inicio de Día en <1 Minuto)
 *
 * Implementada según especificación Stitch y Reglas R1 y R14.
 * - Inventario inicial precargado del cierre anterior.
 * - Steppers ergonómicos para ajuste rápido por categoría.
 * - Fondo inicial en caja editable con atajos rápidos.
 * - Teclado táctil de PIN de 4 dígitos para Supervisora con límite de 3 intentos.
 */
export const AperturaScreen: React.FC<AperturaScreenProps> = ({
  fecha = new Date().toISOString().split('T')[0] ?? '2026-10-09',
  initialStock = DEFAULT_SUGGESTED_STOCK,
  defaultFondoInicial = 200,
  catalog = DEFAULT_CATALOG,
  supervisorPinExpected = '1234',
  onConfirmApertura,
  onCancel,
}) => {
  // Solo categorías físicas que controlan stock
  const physicalItems = catalog.filter((item) => item.controla_stock && item.activo);

  const [stock, setStock] = useState<Record<string, number>>(() => {
    const state: Record<string, number> = {};
    for (const item of physicalItems) {
      state[item.id] = initialStock[item.id] ?? 0;
    }
    return state;
  });

  const [fondoInicial, setFondoInicial] = useState<number>(defaultFondoInicial);
  const [nota, setNota] = useState<string>('');
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Stepper de inventario
  const handleStockChange = (itemId: string, delta: number) => {
    triggerHaptic(40);
    setStock((prev) => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta),
    }));
  };

  const handleOpenPinModal = () => {
    triggerHaptic(50);
    setPinDigits('');
    setPinError(null);
    setIsPinModalOpen(true);
  };

  // Teclado numérico PIN en pantalla
  const handlePinKeyPress = (digit: string) => {
    if (isLockedOut || pinDigits.length >= 4) return;
    triggerHaptic(40);

    const nextDigits = pinDigits + digit;
    setPinDigits(nextDigits);
    setPinError(null);

    if (nextDigits.length === 4) {
      validateAndSubmitPin(nextDigits);
    }
  };

  const handlePinDelete = () => {
    triggerHaptic(40);
    setPinDigits((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const validateAndSubmitPin = async (enteredPin: string) => {
    if (enteredPin === supervisorPinExpected) {
      triggerHaptic(80);
      setIsSubmitting(true);
      try {
        await onConfirmApertura({
          fecha,
          fondoInicial,
          inventarioInicial: { ...stock },
          usuarioApertura: 'Supervisora',
          notaApertura: nota.trim() || undefined,
        });
        setIsPinModalOpen(false);
      } catch (err) {
        setPinError(err instanceof Error ? err.message : 'Error al abrir jornada');
        setIsSubmitting(false);
      }
    } else {
      triggerHaptic(100);
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      setPinDigits('');

      if (nextFailures >= 3) {
        setIsLockedOut(true);
        setPinError('Demasiados intentos fallidos. Bloqueado temporalmente (30s).');
        setTimeout(() => {
          setIsLockedOut(false);
          setFailedAttempts(0);
          setPinError(null);
        }, 30000);
      } else {
        setPinError(`PIN incorrecto (intento ${nextFailures}/3)`);
      }
    }
  };

  const renderIcon = (icono: string, color: string) => {
    const iconClass = 'w-7 h-7';
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
        return <IceCream className={iconClass} style={{ color }} />;
    }
  };

  const totalPiezasInicial = Object.values(stock).reduce((sum, val) => sum + val, 0);

  return (
    <div className="flex flex-col h-full w-full bg-stone-50 select-none touch-manipulation overflow-hidden">
      {/* ─── ENCABEZADO CON SAFE AREA ─── */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-stone-200 shadow-sm shrink-0 pt-safe">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
            <Sun className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-800 leading-tight">
              Apertura de Jornada
            </h1>
            <p className="text-xs font-semibold text-stone-500">
              Fecha: <span className="text-stone-700 font-bold">{fecha}</span> — Confirma el inventario inicial en congeladores
            </p>
          </div>
        </div>

        {onCancel && (
          <button
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

      {/* ─── CONTENIDO SCROLLEABLE ─── */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 max-w-3xl mx-auto w-full">
        {/* Banner informativo R14 */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Stock precargado del cierre anterior:</span> Revisa que las cantidades coincidan con el congelador físico antes de iniciar.
          </div>
        </div>

        {/* ─── TARJETA 1: INVENTARIO INICIAL POR CATEGORÍA ─── */}
        <section className="bg-white rounded-3xl p-4 border border-stone-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600">
              Inventario en Congeladores
            </h2>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
              {totalPiezasInicial} piezas en total
            </span>
          </div>

          <div className="space-y-3">
            {physicalItems.map((item) => {
              const cant = stock[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50/80 border border-stone-200/60"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: `${item.color}25` }}
                    >
                      {renderIcon(item.icono, item.color)}
                    </div>
                    <div>
                      <div className="font-bold text-stone-800 text-sm">{item.nombre}</div>
                      <div className="text-xs text-stone-500">${item.precio} c/u</div>
                    </div>
                  </div>

                  {/* Stepper tactile controls */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-stone-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleStockChange(item.id, -1)}
                      className="w-10 h-10 rounded-xl bg-stone-100 active:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-lg transition-transform active:scale-95"
                      aria-label={`Disminuir ${item.nombre}`}
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <span className="w-12 text-center text-lg font-black text-stone-800">
                      {cant}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleStockChange(item.id, 1)}
                      className="w-10 h-10 rounded-xl bg-amber-500 text-white active:bg-amber-600 flex items-center justify-center font-bold text-lg shadow-sm transition-transform active:scale-95"
                      aria-label={`Aumentar ${item.nombre}`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── TARJETA 2: FONDO INICIAL DE EFECTIVO EN CAJA ─── */}
        <section className="bg-white rounded-3xl p-4 border border-stone-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600">
                Fondo Inicial en Caja
              </h2>
            </div>
            <span className="text-xs text-stone-400">Para cambio</span>
          </div>

          <div className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-200/80 mb-3">
            <span className="text-xs font-semibold text-stone-500">Monto disponible:</span>
            <span className="text-2xl font-black text-stone-900 tracking-tight">
              ${fondoInicial.toFixed(2)}{' '}
              <span className="text-xs font-bold text-stone-500">MXN</span>
            </span>
          </div>

          {/* Atajos de ajuste rápido */}
          <div className="grid grid-cols-4 gap-2">
            {[50, 100, 200, 500].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  triggerHaptic(40);
                  setFondoInicial(val);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  fondoInicial === val
                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/50'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                ${val}
              </button>
            ))}
          </div>
        </section>

        {/* Nota opcional de apertura */}
        <div className="px-1">
          <label className="block text-xs font-semibold text-stone-500 mb-1">
            Nota o comentario de apertura (opcional):
          </label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej. Recibido de turno anterior sin novedad"
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </main>

      {/* ─── FOOTER CON BOTÓN DE ACCIÓN PRINCIPAL Y SAFE AREA ─── */}
      <footer className="p-4 sm:p-5 bg-white border-t border-stone-200 shadow-lg shrink-0 pb-safe">
        <div className="max-w-3xl mx-auto w-full">
          <button
            type="button"
            onClick={handleOpenPinModal}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-lg rounded-2xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98]"
          >
            <ShieldCheck className="w-6 h-6" />
            <span>Comenzar Ventas</span>
          </button>
        </div>
      </footer>

      {/* ─── MODAL DE AUTENTICACIÓN CON PIN DE SUPERVISORA ─── */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center border border-stone-100">
            {/* Header del Modal */}
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 text-sm">PIN de Supervisora</h3>
                  <p className="text-[11px] text-stone-500">Autorización requerida (R1)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visualización de dígitos */}
            <div className="flex gap-4 my-3">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pinDigits.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      isFilled
                        ? 'bg-emerald-600 scale-125 shadow-sm'
                        : 'bg-stone-200 border border-stone-300'
                    }`}
                  />
                );
              })}
            </div>

            {/* Mensajes de error o bloqueo */}
            {pinError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mb-2 text-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Teclado numérico táctil en pantalla (Ergonomía manos frías/húmedas) */}
            <div className="grid grid-cols-3 gap-2.5 w-full my-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isLockedOut || isSubmitting}
                  onClick={() => handlePinKeyPress(digit)}
                  className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 font-extrabold text-xl flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                disabled={isLockedOut || isSubmitting}
                onClick={() => setPinDigits('')}
                className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-40"
              >
                Limpiar
              </button>

              <button
                type="button"
                disabled={isLockedOut || isSubmitting}
                onClick={() => handlePinKeyPress('0')}
                className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 font-extrabold text-xl flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
              >
                0
              </button>

              <button
                type="button"
                disabled={isLockedOut || isSubmitting}
                onClick={handlePinDelete}
                className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center active:scale-95 disabled:opacity-40"
                aria-label="Borrar dígito"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-stone-400 mt-2 text-center">
              Modo desarrollo: PIN predeterminado <span className="font-bold">1234</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

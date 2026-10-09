import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Coins,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Delete,
  X,
  AlertCircle,
  Sparkles,
  Layers,
  Banknote,
  Minus,
  Plus,
} from 'lucide-react';
import type { CatalogoItem, ParametrosNegocio } from '@/domain/config/types';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '@/domain/config/parameters';
import type { Movimiento, CierreResumen } from '@/domain/types';
import type { CloseJornadaDTO } from '@/domain/ports/IDataAdapter';
import { reconcileClosing } from '@/domain/rules/reconcileClosing';
import { triggerHaptic } from '../utils/haptics';

export interface CierreScreenProps {
  readonly jornadaId: string;
  readonly fecha?: string;
  readonly fondoInicial?: number;
  readonly inventarioInicial?: Readonly<Record<string, number>>;
  readonly entradas?: Readonly<Record<string, number>>;
  readonly mermas?: Readonly<Record<string, number>>;
  readonly movimientos?: readonly Movimiento[];
  readonly catalog?: readonly CatalogoItem[];
  readonly parametros?: ParametrosNegocio;
  readonly supervisorPinExpected?: string;
  readonly onConfirmCierre: (
    data: CloseJornadaDTO & {
      readonly reconstruccionesAceptadas?: Readonly<Record<string, number>>;
      readonly resumen: CierreResumen;
    }
  ) => Promise<void> | void;
  readonly onCancel?: () => void;
}

type PasoCierre = 1 | 2 | 3 | 4;

const DENOMINACIONES_BILLETES = [500, 200, 100, 50, 20] as const;
const DENOMINACIONES_MONEDAS = [10, 5, 2, 1] as const;

/**
 * Pantalla 3: CIERRE GUIADO EN 4 PASOS (Cuadre Triple Matemático)
 *
 * Implementada según especificación Stitch y Reglas R9 a R13.
 * Paso 1: Conteo físico de restantes por categoría.
 * Paso 2: Conteo de efectivo en caja (desglose o total).
 * Paso 3: Revisión de resultados (3 cuadres, semáforo, propuesta de reconstrucción).
 * Paso 4: Confirmación con PIN de supervisora y celebración.
 */
export const CierreScreen: React.FC<CierreScreenProps> = ({
  jornadaId,
  fecha = new Date().toISOString().split('T')[0] ?? '2026-10-09',
  fondoInicial = 200,
  inventarioInicial = { CAT_AGUA: 45, CAT_CREMA: 38, CAT_SANDWICH: 14, CAT_NIEVE: 10 },
  entradas = {},
  mermas = {},
  movimientos = [],
  catalog = DEFAULT_CATALOG,
  parametros = DEFAULT_PARAMETERS,
  supervisorPinExpected = '1234',
  onConfirmCierre,
  onCancel,
}) => {
  const [paso, setPaso] = useState<PasoCierre>(1);

  // Paso 1: Restantes Físicos por categoría
  const physicalItems = catalog.filter((item) => item.controla_stock && item.activo);
  const [restantesFisicos, setRestantesFisicos] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of physicalItems) {
      // Valor por defecto sugerido: lo que había en apertura
      initial[item.id] = inventarioInicial[item.id] ?? 0;
    }
    return initial;
  });

  // Paso 2: Desglose de Efectivo
  const [billetes, setBilletes] = useState<Record<number, number>>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
  });
  const [monedas, setMonedas] = useState<Record<number, number>>({
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  });
  const [efectivoManual, setEfectivoManual] = useState<number | null>(null);
  const [modoDesglose, setModoDesglose] = useState<boolean>(true);

  // Paso 3: Reconstrucciones aceptadas
  const [reconstruccionesAceptadas, setReconstruccionesAceptadas] = useState<Record<string, boolean>>({});

  // Paso 4: PIN de Supervisora
  const [pinDigits, setPinDigits] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notaCierre, setNotaCierre] = useState<string>('');

  // Cálculo de efectivo contado total
  const efectivoContadoCalculado = useMemo(() => {
    if (!modoDesglose && efectivoManual !== null) {
      return efectivoManual;
    }
    let total = 0;
    for (const [denom, cant] of Object.entries(billetes)) {
      total += Number(denom) * cant;
    }
    for (const [denom, cant] of Object.entries(monedas)) {
      total += Number(denom) * cant;
    }
    return total;
  }, [billetes, monedas, modoDesglose, efectivoManual]);

  // Ejecución reactiva del Cuadre Triple (Paso 3)
  const resumen = useMemo(() => {
    return reconcileClosing({
      jornadaId,
      fecha,
      usuarioCierre: 'Supervisora',
      fondoInicial,
      inventarioInicial,
      entradas,
      mermas,
      restantesFisicos,
      movimientos,
      efectivoContado: efectivoContadoCalculado,
      parametros,
      catalogo: catalog,
    });
  }, [
    jornadaId,
    fecha,
    fondoInicial,
    inventarioInicial,
    entradas,
    mermas,
    restantesFisicos,
    movimientos,
    efectivoContadoCalculado,
    parametros,
    catalog,
  ]);

  // Stepper de restantes
  const handleRestanteChange = (itemId: string, delta: number) => {
    triggerHaptic(40);
    setRestantesFisicos((prev) => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta),
    }));
  };

  // Cambio en desglose de efectivo
  const handleDenomChange = (tipo: 'billete' | 'moneda', denom: number, delta: number) => {
    triggerHaptic(30);
    if (tipo === 'billete') {
      setBilletes((prev) => ({
        ...prev,
        [denom]: Math.max(0, (prev[denom] ?? 0) + delta),
      }));
    } else {
      setMonedas((prev) => ({
        ...prev,
        [denom]: Math.max(0, (prev[denom] ?? 0) + delta),
      }));
    }
  };

  // Teclado PIN en Paso 4
  const handlePinKeyPress = (digit: string) => {
    if (isLockedOut || pinDigits.length >= 4) return;
    triggerHaptic(40);

    const nextDigits = pinDigits + digit;
    setPinDigits(nextDigits);
    setPinError(null);

    if (nextDigits.length === 4) {
      validateAndConfirmCierre(nextDigits);
    }
  };

  const handlePinDelete = () => {
    triggerHaptic(40);
    setPinDigits((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const validateAndConfirmCierre = async (enteredPin: string) => {
    if (enteredPin === supervisorPinExpected) {
      triggerHaptic(80);
      setIsSubmitting(true);
      try {
        const reconstruccionesDTO: Record<string, number> = {};
        for (const detalle of resumen.detalles_por_categoria) {
          if (reconstruccionesAceptadas[detalle.categoria_id] && detalle.propuesta_reconstruccion > 0) {
            reconstruccionesDTO[detalle.categoria_id] = detalle.propuesta_reconstruccion;
          }
        }

        await onConfirmCierre({
          jornadaId,
          usuarioCierre: 'Supervisora',
          efectivoContado: efectivoContadoCalculado,
          restantesFisicos: { ...restantesFisicos },
          entradas: { ...entradas },
          mermas: { ...mermas },
          notaCierre: notaCierre.trim() || undefined,
          reconstruccionesAceptadas: reconstruccionesDTO,
          resumen,
        });

        setIsCompleted(true);
      } catch (err) {
        setPinError(err instanceof Error ? err.message : 'Error al cerrar jornada');
        setIsSubmitting(false);
      }
    } else {
      triggerHaptic(100);
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      setPinDigits('');

      if (nextFailures >= 3) {
        setIsLockedOut(true);
        setPinError('Demasiados intentos fallidos. Bloqueo temporal de seguridad (30s).');
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

  // Renderizadores de pasos
  const renderStepIndicator = () => {
    const steps = [
      { id: 1, label: '1. Conteo' },
      { id: 2, label: '2. Efectivo' },
      { id: 3, label: '3. Resultados' },
      { id: 4, label: '4. Confirmar' },
    ];

    return (
      <div className="flex items-center justify-between px-3 py-2 bg-stone-100/80 border-b border-stone-200">
        {steps.map((s) => {
          const isActive = paso === s.id;
          const isPassed = paso > s.id;
          return (
            <div key={s.id} className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400/30'
                    : isPassed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-300 text-stone-600'
                }`}
              >
                {isPassed ? '✓' : s.id}
              </div>
              <span
                className={`text-xs font-bold ${
                  isActive ? 'text-stone-900' : isPassed ? 'text-stone-600' : 'text-stone-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-lg mx-auto bg-stone-50 select-none touch-manipulation overflow-hidden">
      {/* ─── HEADER ─── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 shadow-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-stone-800 leading-tight">
              Cierre Guiado en 4 Pasos
            </h1>
            <p className="text-xs font-semibold text-stone-500">
              Jornada: <span className="text-stone-700 font-bold">{jornadaId}</span>
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
            title="Cancelar Cierre"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* ─── STEPPER BAR ─── */}
      {renderStepIndicator()}

      {/* ─── CONTENIDO DINÁMICO POR PASO ─── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* ══════════════════════════════════════════════════
            PASO 1: CONTEO FÍSICO DE RESTANTES
            ══════════════════════════════════════════════════ */}
        {paso === 1 && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5">
              <Layers className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-900">
                  Paso 1: ¿Cuántas piezas quedan en el congelador?
                </h3>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Cuenta físicamente las piezas restantes en mostrador por categoría.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {physicalItems.map((item) => {
                const cant = restantesFisicos[item.id] ?? 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white border border-stone-200 shadow-sm"
                  >
                    <div>
                      <div className="font-extrabold text-stone-800 text-sm">{item.nombre}</div>
                      <div className="text-xs text-stone-400">
                        Apertura: {inventarioInicial[item.id] ?? 0} pzas
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-stone-50 p-1 rounded-2xl border border-stone-200">
                      <button
                        type="button"
                        onClick={() => handleRestanteChange(item.id, -1)}
                        className="w-10 h-10 rounded-xl bg-white active:bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-lg shadow-sm"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="w-12 text-center text-lg font-black text-stone-900">
                        {cant}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRestanteChange(item.id, 1)}
                        className="w-10 h-10 rounded-xl bg-amber-500 text-white active:bg-amber-600 flex items-center justify-center font-bold text-lg shadow-sm"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            PASO 2: CONTEO DE EFECTIVO EN CAJA
            ══════════════════════════════════════════════════ */}
        {paso === 2 && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5">
              <Coins className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-emerald-950">
                  Paso 2: Conteo de Dinero Físico en Caja
                </h3>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Ingresa billetes y monedas. Fondo inicial: ${fondoInicial.toFixed(2)} MXN.
                </p>
              </div>
            </div>

            {/* Total Efectivo Banner */}
            <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Total en Caja
                </span>
                <div className="text-2xl font-black text-emerald-700">
                  ${efectivoContadoCalculado.toFixed(2)}{' '}
                  <span className="text-xs font-bold text-stone-500">MXN</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-stone-400 block">
                  Efectivo Neto (sin fondo):
                </span>
                <span className="text-sm font-extrabold text-stone-700">
                  ${(efectivoContadoCalculado - fondoInicial).toFixed(2)} MXN
                </span>
              </div>
            </div>

            {/* Selector de Modo: Desglose vs Directo */}
            <div className="flex bg-stone-200 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setModoDesglose(true)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  modoDesglose ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                Por Billetes y Monedas
              </button>
              <button
                type="button"
                onClick={() => {
                  setModoDesglose(false);
                  if (efectivoManual === null) setEfectivoManual(efectivoContadoCalculado);
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  !modoDesglose ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                Monto Directo
              </button>
            </div>

            {modoDesglose ? (
              <div className="space-y-3">
                {/* Billetes */}
                <div className="bg-white rounded-2xl p-3 border border-stone-200 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-stone-600 mb-2">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Billetes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DENOMINACIONES_BILLETES.map((denom) => (
                      <div
                        key={denom}
                        className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200/80"
                      >
                        <span className="text-xs font-bold text-stone-700">${denom}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDenomChange('billete', denom, -1)}
                            className="w-7 h-7 rounded-lg bg-stone-200 active:bg-stone-300 text-stone-700 font-bold text-xs flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-7 text-center text-xs font-black text-stone-800">
                            {billetes[denom] ?? 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDenomChange('billete', denom, 1)}
                            className="w-7 h-7 rounded-lg bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monedas */}
                <div className="bg-white rounded-2xl p-3 border border-stone-200 shadow-sm">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-stone-600 mb-2">
                    <Coins className="w-4 h-4 text-amber-600" />
                    <span>Monedas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {DENOMINACIONES_MONEDAS.map((denom) => (
                      <div
                        key={denom}
                        className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200/80"
                      >
                        <span className="text-xs font-bold text-stone-700">${denom}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDenomChange('moneda', denom, -1)}
                            className="w-7 h-7 rounded-lg bg-stone-200 active:bg-stone-300 text-stone-700 font-bold text-xs flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-7 text-center text-xs font-black text-stone-800">
                            {monedas[denom] ?? 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDenomChange('moneda', denom, 1)}
                            className="w-7 h-7 rounded-lg bg-amber-500 active:bg-amber-600 text-white font-bold text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm space-y-3">
                <label className="block text-xs font-bold text-stone-500">
                  Ingresa el monto total contado:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-lg">$</span>
                  <input
                    type="number"
                    value={efectivoManual ?? ''}
                    onChange={(e) => setEfectivoManual(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-xl font-black rounded-xl border border-stone-300 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            PASO 3: REVISIÓN DE RESULTADOS (CUADRE TRIPLE)
            ══════════════════════════════════════════════════ */}
        {paso === 3 && (
          <div className="space-y-4">
            {/* Gran Insignia de Semáforo */}
            <div
              className={`p-4 rounded-3xl border flex items-center gap-3.5 shadow-sm ${
                resumen.semaforo === 'VERDE'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800'
                  : resumen.semaforo === 'AMBAR'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-800'
                  : 'bg-rose-500/10 border-rose-500 text-rose-800'
              }`}
            >
              {resumen.semaforo === 'VERDE' && <CheckCircle2 className="w-9 h-9 text-emerald-600 shrink-0" />}
              {resumen.semaforo === 'AMBAR' && <AlertTriangle className="w-9 h-9 text-amber-600 shrink-0" />}
              {resumen.semaforo === 'ROJO' && <XCircle className="w-9 h-9 text-rose-600 shrink-0" />}

              <div>
                <span className="text-[11px] font-black tracking-wider uppercase">
                  Semáforo {resumen.semaforo}
                </span>
                <h3 className="text-base font-black leading-tight">
                  {resumen.semaforo === 'VERDE'
                    ? 'Cuadre Exitoso (Dentro de Tolerancia)'
                    : resumen.semaforo === 'AMBAR'
                    ? 'Atención: Diferencia Moderada'
                    : 'Discrepancia Importante en Caja'}
                </h3>
              </div>
            </div>

            {/* Las 3 Tarjetas del Cuadre Triple (R10) */}
            <div className="space-y-2.5">
              {/* Tarjeta A: Piezas por Conteo */}
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    A
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-800">Piezas por Conteo Físico</div>
                    <div className="text-[11px] text-stone-500">Salieron de congeladores</div>
                  </div>
                </div>
                <span className="text-base font-black text-stone-900">
                  {resumen.total_piezas_conteo} pzas
                </span>
              </div>

              {/* Tarjeta B: Piezas por Toques */}
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    B
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-800">Piezas por Toques Mostrador</div>
                    <div className="text-[11px] text-stone-500">Registradas en pantalla</div>
                  </div>
                </div>
                <span className="text-base font-black text-stone-900">
                  {resumen.total_piezas_toques} pzas
                </span>
              </div>

              {/* Tarjeta C: Dinero en Caja vs Esperado */}
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    C
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-800">Diferencia de Caja</div>
                    <div className="text-[11px] text-stone-500">
                      Neto: ${resumen.efectivo_neto} | Esperado: ${resumen.dinero_esperado}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-base font-black ${
                    Math.abs(resumen.diferencia_final) <= parametros.tolerancia_verde
                      ? 'text-emerald-700'
                      : Math.abs(resumen.diferencia_final) <= parametros.tolerancia_ambar
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {resumen.diferencia_final >= 0 ? '+' : ''}${resumen.diferencia_final.toFixed(2)} MXN
                </span>
              </div>
            </div>

            {/* Banner de Explicaciones Sin Culpa (R13) */}
            {resumen.explicaciones.length > 0 && (
              <div className="bg-stone-100 p-3 rounded-2xl border border-stone-200 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Diagnóstico del Sistema
                </span>
                {resumen.explicaciones.map((exp, idx) => (
                  <p key={idx} className="text-xs text-stone-700 leading-relaxed">
                    • {exp}
                  </p>
                ))}
              </div>
            )}

            {/* Propuesta de Reconstrucción de Ventas Olvidadas (R12) */}
            {resumen.detalles_por_categoria.some((d) => d.propuesta_reconstruccion > 0) && (
              <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <h4 className="text-xs font-bold text-amber-950">
                    Propuesta de Reconstrucción de Ventas (R12)
                  </h4>
                </div>
                <p className="text-[11px] text-amber-800">
                  Se detectaron piezas físicas vendidas sin registrar en mostrador. Puedes aceptarlas para regularizar el reporte:
                </p>

                <div className="space-y-1.5">
                  {resumen.detalles_por_categoria
                    .filter((d) => d.propuesta_reconstruccion > 0)
                    .map((d) => {
                      const isAceptada = reconstruccionesAceptadas[d.categoria_id] ?? false;
                      return (
                        <div
                          key={d.categoria_id}
                          className="flex items-center justify-between p-2 bg-white rounded-xl border border-amber-200"
                        >
                          <span className="text-xs font-bold text-stone-800">
                            {d.categoria_nombre}: +{d.propuesta_reconstruccion} pzas ($
                            {d.propuesta_reconstruccion * d.precio_unitario} MXN)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(40);
                              setReconstruccionesAceptadas((prev) => ({
                                ...prev,
                                [d.categoria_id]: !isAceptada,
                              }));
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                              isAceptada
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {isAceptada ? 'Aceptada ✓' : 'Aceptar'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            PASO 4: CONFIRMACIÓN FINAL Y PIN DE SUPERVISORA
            ══════════════════════════════════════════════════ */}
        {paso === 4 && (
          <div className="space-y-4">
            {isCompleted ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-emerald-900">
                  ¡Jornada Cerrada con Éxito!
                </h3>
                <p className="text-xs text-emerald-700 max-w-xs mx-auto">
                  El cierre diario ha sido guardado de forma inmutable. La jornada está concluida.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500">Jornada</span>
                    <span className="text-xs font-extrabold text-stone-800">{jornadaId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500">Total Efectivo en Caja</span>
                    <span className="text-sm font-black text-emerald-700">
                      ${efectivoContadoCalculado.toFixed(2)} MXN
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500">Semáforo Final</span>
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                        resumen.semaforo === 'VERDE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : resumen.semaforo === 'AMBAR'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {resumen.semaforo} ({resumen.diferencia_final >= 0 ? '+' : ''}$
                      {resumen.diferencia_final.toFixed(2)})
                    </span>
                  </div>
                </div>

                {/* Nota opcional de cierre */}
                <div className="px-1">
                  <label className="block text-xs font-semibold text-stone-500 mb-1">
                    Nota o justificación de cierre (opcional):
                  </label>
                  <input
                    type="text"
                    value={notaCierre}
                    onChange={(e) => setNotaCierre(e.target.value)}
                    placeholder="Ej. Cuadre perfecto sin incidencias"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Teclado PIN en pantalla */}
                <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-stone-700">
                      Ingresa PIN de Supervisora para firmar
                    </span>
                  </div>

                  {/* Círculos de dígitos */}
                  <div className="flex gap-4 my-2">
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

                  {pinError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mb-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  {/* Teclas numéricas */}
                  <div className="grid grid-cols-3 gap-2 w-full max-w-xs mt-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        disabled={isLockedOut || isSubmitting}
                        onClick={() => handlePinKeyPress(digit)}
                        className="h-12 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 font-extrabold text-lg flex items-center justify-center active:scale-95 disabled:opacity-40"
                      >
                        {digit}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={isLockedOut || isSubmitting}
                      onClick={() => setPinDigits('')}
                      className="h-12 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold text-xs flex items-center justify-center active:scale-95 disabled:opacity-40"
                    >
                      Limpiar
                    </button>

                    <button
                      type="button"
                      disabled={isLockedOut || isSubmitting}
                      onClick={() => handlePinKeyPress('0')}
                      className="h-12 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 font-extrabold text-lg flex items-center justify-center active:scale-95 disabled:opacity-40"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      disabled={isLockedOut || isSubmitting}
                      onClick={handlePinDelete}
                      className="h-12 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center active:scale-95 disabled:opacity-40"
                      aria-label="Borrar dígito"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── FOOTER CON BOTONES DE NAVEGACIÓN ENTRE PASOS ─── */}
      <footer className="p-3 bg-white border-t border-stone-200 shadow-md shrink-0 flex items-center justify-between gap-3">
        {paso > 1 && !isCompleted ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(40);
              setPaso((prev) => Math.max(1, prev - 1) as PasoCierre);
            }}
            className="h-12 px-4 rounded-2xl bg-stone-100 text-stone-700 font-bold text-sm flex items-center gap-1.5 active:bg-stone-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Atrás</span>
          </button>
        ) : (
          <div />
        )}

        {paso < 4 ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(50);
              setPaso((prev) => Math.min(4, prev + 1) as PasoCierre);
            }}
            className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2"
          >
            <span>
              {paso === 1
                ? 'Siguiente: Conteo de Efectivo'
                : paso === 2
                ? 'Siguiente: Resultados del Cuadre'
                : 'Siguiente: Confirmar Cierre'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : isCompleted ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(50);
              onCancel?.();
            }}
            className="w-full h-12 bg-emerald-600 text-white font-black text-sm rounded-2xl shadow-sm"
          >
            Finalizar y Salir
          </button>
        ) : null}
      </footer>
    </div>
  );
};

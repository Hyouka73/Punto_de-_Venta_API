import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Banknote,
  Minus,
  Plus,
  Snowflake,
  NotebookPen,
  ShieldCheck,
} from 'lucide-react';
import type { CatalogoItem, ParametrosNegocio } from '@/domain/config/types';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '@/domain/config/parameters';
import type { Movimiento, CierreResumen } from '@/domain/types';
import type { CloseJornadaDTO } from '@/domain/ports/IDataAdapter';
import { expectedRemainingFromTaps, planClosing } from '@/domain/rules/planClosing';
import { triggerHaptic } from '../utils/haptics';
import { ItemIcon } from '../utils/itemIcons';

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
  /** Si es false la jornada ya fue cerrada y no hay nada que cerrar. */
  readonly jornadaActiva?: boolean;
  readonly onConfirmCierre: (
    data: CloseJornadaDTO & {
      readonly reconstruccionesAceptadas?: Readonly<Record<string, number>>;
      readonly resumen: CierreResumen;
    }
  ) => Promise<void> | void;
  readonly onCancel?: () => void;
}

type PasoCierre = 1 | 2 | 3;
type ModoConteo = 'sobrante' | 'vendidas';

const DENOMINACIONES_BILLETES = [500, 200, 100, 50, 20] as const;
const DENOMINACIONES_MONEDAS = [10, 5, 2, 1] as const;
const MOTIVOS_RAPIDOS = [
  'Di cambio de más / de menos',
  'Falta anotar una merma',
  'Venta fiada o pendiente',
  'Ventas anotadas en libreta',
] as const;

const money = (n: number) => `$${n.toFixed(2)}`;
const signed = (n: number) => `${n >= 0 ? '+' : '−'}$${Math.abs(n).toFixed(2)}`;

/**
 * CIERRE DEL DÍA EN 3 PASOS (versión simplificada).
 *
 *  1. Congelador: el sistema ya sabe cuántas deberían quedar según tus toques.
 *     Si coincide, solo confirmas; si no, corriges lo que ves (o anotas lo que vendiste de libreta).
 *  2. Dinero: cuentas el cajón (monto directo o billetes y monedas).
 *  3. Revisar y firmar: semáforo claro, qué pasó en palabras simples y PIN.
 *
 * Cubre: día normal con toques, día sin toques (libreta), día mezclado (toques + olvidos),
 * ventas por transferencia, sobrantes/faltantes y productos sin inventario inicial.
 */
export const CierreScreen: React.FC<CierreScreenProps> = ({
  jornadaId,
  fecha = new Date().toISOString().slice(0, 10),
  fondoInicial = 0,
  inventarioInicial = {},
  entradas = {},
  mermas = {},
  movimientos = [],
  catalog = DEFAULT_CATALOG,
  parametros = DEFAULT_PARAMETERS,
  supervisorPinExpected = '1234',
  jornadaActiva = true,
  onConfirmCierre,
  onCancel,
}) => {
  const [paso, setPaso] = useState<PasoCierre>(1);
  const [modoConteo, setModoConteo] = useState<ModoConteo>('sobrante');

  const physicalItems = useMemo(
    () => catalog.filter((item) => item.controla_stock && item.activo && !item.es_combo),
    [catalog]
  );

  /** Lo que el sistema espera que quede según los toques del mostrador. */
  const esperadoPorToques = useMemo(
    () =>
      expectedRemainingFromTaps({
        jornadaId,
        fecha,
        fondoInicial,
        inventarioInicial,
        entradas,
        mermas,
        movimientos,
        parametros,
        catalogo: catalog,
      }),
    [jornadaId, fecha, fondoInicial, inventarioInicial, entradas, mermas, movimientos, parametros, catalog]
  );

  const [restantes, setRestantes] = useState<Record<string, number>>(() => ({ ...esperadoPorToques }));
  /** Piezas que hubo que "inventar" porque no se capturó inventario inicial (modo libreta). */
  const [extraInicial, setExtraInicial] = useState<Record<string, number>>({});

  const disponibleBase = (id: string) =>
    (inventarioInicial[id] ?? 0) + (entradas[id] ?? 0) - (mermas[id] ?? 0);
  const disponible = (id: string) => disponibleBase(id) + (extraInicial[id] ?? 0);
  const restanteDe = (id: string) => restantes[id] ?? 0;
  const vendidasDe = (id: string) => Math.max(0, disponible(id) - restanteDe(id));

  const setRestante = (id: string, value: number) => {
    const v = Math.max(0, Math.min(disponibleBase(id), Math.floor(value) || 0));
    setExtraInicial((p) => (p[id] ? { ...p, [id]: 0 } : p));
    setRestantes((p) => ({ ...p, [id]: v }));
  };

  const setVendidas = (id: string, value: number) => {
    const v = Math.max(0, Math.floor(value) || 0);
    const base = disponibleBase(id);
    if (v > base) {
      setExtraInicial((p) => ({ ...p, [id]: v - base }));
      setRestantes((p) => ({ ...p, [id]: 0 }));
    } else {
      setExtraInicial((p) => (p[id] ? { ...p, [id]: 0 } : p));
      setRestantes((p) => ({ ...p, [id]: base - v }));
    }
  };

  const restablecerConteo = () => {
    triggerHaptic(40);
    setExtraInicial({});
    setRestantes({ ...esperadoPorToques });
  };

  const inventarioAjustado = useMemo(() => {
    const out: Record<string, number> = { ...inventarioInicial };
    for (const [id, extra] of Object.entries(extraInicial)) {
      if (extra > 0) out[id] = (out[id] ?? 0) + extra;
    }
    return out;
  }, [inventarioInicial, extraInicial]);

  // ── Paso 2: efectivo ──
  const [billetes, setBilletes] = useState<Record<number, number>>({ 500: 0, 200: 0, 100: 0, 50: 0, 20: 0 });
  const [monedas, setMonedas] = useState<Record<number, number>>({ 10: 0, 5: 0, 2: 0, 1: 0 });
  const [efectivoManual, setEfectivoManual] = useState<number | null>(null);
  const [modoDesglose, setModoDesglose] = useState<boolean>(false);
  const [transferenciaNoRegistrada, setTransferenciaNoRegistrada] = useState<number>(0);

  const efectivoContado = useMemo(() => {
    if (!modoDesglose) return efectivoManual ?? 0;
    let total = 0;
    for (const [d, c] of Object.entries(billetes)) total += Number(d) * c;
    for (const [d, c] of Object.entries(monedas)) total += Number(d) * c;
    return total;
  }, [billetes, monedas, modoDesglose, efectivoManual]);

  const efectivoCapturado = modoDesglose ? efectivoContado > 0 : efectivoManual !== null;

  // ── Paso 3: decisión sobre piezas sin toque, nota y PIN ──
  const [incluirManual, setIncluirManual] = useState<boolean | null>(null);
  const [notaCierre, setNotaCierre] = useState<string>('');
  const [mostrarPin, setMostrarPin] = useState(false);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
    },
    []
  );

  const plan = useMemo(
    () =>
      planClosing({
        jornadaId,
        fecha,
        fondoInicial,
        inventarioInicial: inventarioAjustado,
        entradas,
        mermas,
        restantesFisicos: restantes,
        movimientos,
        efectivoContado,
        parametros,
        catalogo: catalog,
        incluirNoRegistradas: incluirManual,
        transferenciaNoRegistrada,
      }),
    [
      jornadaId,
      fecha,
      fondoInicial,
      inventarioAjustado,
      entradas,
      mermas,
      restantes,
      movimientos,
      efectivoContado,
      parametros,
      catalog,
      incluirManual,
      transferenciaNoRegistrada,
    ]
  );

  const piezasVendidasTotal = physicalItems.reduce((a, it) => a + vendidasDe(it.id), 0);
  const ventasTotal = physicalItems.reduce((a, it) => a + vendidasDe(it.id) * it.precio, 0);
  const itemsDiferentes = physicalItems.filter(
    (it) => restanteDe(it.id) !== (esperadoPorToques[it.id] ?? 0)
  ).length;
  const sinToques = !movimientos.some((m) => m.tipo === 'VENTA');

  const handleDenom = (tipo: 'billete' | 'moneda', denom: number, delta: number) => {
    triggerHaptic(30);
    const upd = (prev: Record<number, number>) => ({
      ...prev,
      [denom]: Math.max(0, (prev[denom] ?? 0) + delta),
    });
    if (tipo === 'billete') setBilletes(upd);
    else setMonedas(upd);
  };

  // ── PIN ──
  const confirmar = async (enteredPin: string) => {
    if (enteredPin === supervisorPinExpected) {
      triggerHaptic(80);
      setIsSubmitting(true);
      try {
        const reconstrucciones: Record<string, number> = {};
        if (plan.incluirNoRegistradas) {
          for (const n of plan.noRegistradas) reconstrucciones[n.categoria_id] = n.cantidad;
        }
        const extras: string[] = [];
        if (plan.incluirNoRegistradas && transferenciaNoRegistrada > 0) {
          extras.push(`Transferencia de ventas no registradas: ${money(transferenciaNoRegistrada)}`);
        }
        const nota = [notaCierre.trim(), ...extras].filter(Boolean).join(' · ');
        await onConfirmCierre({
          jornadaId,
          usuarioCierre: 'Supervisora',
          efectivoContado,
          restantesFisicos: { ...restantes },
          entradas: { ...entradas },
          mermas: { ...mermas },
          notaCierre: nota || undefined,
          reconstruccionesAceptadas: reconstrucciones,
          resumen: {
            ...plan.resumen,
            dinero_esperado: plan.esperadoEnCaja - fondoInicial,
            diferencia_final: plan.diferencia,
            semaforo: plan.semaforo,
          },
        });
        setIsCompleted(true);
      } catch (err) {
        setPinError(err instanceof Error ? err.message : 'No se pudo cerrar la jornada');
        setIsSubmitting(false);
        setPinDigits('');
      }
    } else {
      triggerHaptic(100);
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      setPinDigits('');
      if (next >= 3) {
        setIsLockedOut(true);
        setPinError('Demasiados intentos. Espera 30 segundos.');
        lockTimer.current = setTimeout(() => {
          setIsLockedOut(false);
          setFailedAttempts(0);
          setPinError(null);
        }, 30000);
      } else {
        setPinError(`PIN incorrecto (intento ${next}/3)`);
      }
    }
  };

  const pulsarPin = (digit: string) => {
    if (isLockedOut || isSubmitting || pinDigits.length >= 4) return;
    triggerHaptic(40);
    const next = pinDigits + digit;
    setPinDigits(next);
    setPinError(null);
    if (next.length === 4) void confirmar(next);
  };

  // ── Jornada ya cerrada ──
  if (!jornadaActiva && !isCompleted) {
    return (
      <div className="flex flex-col h-full w-full bg-stone-50 items-center justify-center p-6 text-center gap-4 pt-safe pb-safe">
        <ShieldCheck className="w-16 h-16 text-emerald-600" />
        <h1 className="text-xl font-black text-stone-800">La jornada ya está cerrada</h1>
        <p className="text-sm text-stone-500 max-w-xs">
          No hay nada pendiente por cerrar. Para vender de nuevo, abre una jornada nueva.
        </p>
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="h-14 px-8 rounded-2xl bg-amber-500 text-white font-black text-base active:bg-amber-600"
        >
          Volver al mostrador
        </button>
      </div>
    );
  }

  // ── UI helpers ──
  const sem = plan.semaforo;
  const semClases =
    sem === 'VERDE'
      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800'
      : sem === 'AMBAR'
      ? 'bg-amber-500/10 border-amber-500 text-amber-800'
      : 'bg-rose-500/10 border-rose-500 text-rose-800';

  const stepper = () => (
    <div className="flex items-center justify-between px-3 py-2 bg-stone-100/80 border-b border-stone-200">
      {[
        { id: 1, label: '1. Congelador' },
        { id: 2, label: '2. Dinero' },
        { id: 3, label: '3. Revisar' },
      ].map((s) => {
        const active = paso === s.id;
        const passed = paso > s.id;
        return (
          <div key={s.id} className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                active
                  ? 'bg-amber-500 text-white ring-2 ring-amber-400/30'
                  : passed
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-300 text-stone-600'
              }`}
            >
              {passed ? '✓' : s.id}
            </div>
            <span
              className={`text-xs font-bold ${
                active ? 'text-stone-900' : passed ? 'text-stone-600' : 'text-stone-400'
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );

  const puedeAvanzar = paso === 1 ? true : paso === 2 ? efectivoCapturado : true;
  const textoAvanzar =
    paso === 1
      ? itemsDiferentes === 0
        ? 'Todo coincide → Contar dinero'
        : 'Siguiente: Contar dinero'
      : paso === 2
      ? 'Siguiente: Revisar'
      : '';

  return (
    <div className="flex flex-col h-full w-full bg-stone-50 select-none touch-manipulation overflow-hidden">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-stone-200 shadow-sm shrink-0 pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-stone-800 leading-tight">Cierre del Día</h1>
            <p className="text-xs font-semibold text-stone-500">
              Jornada: <span className="text-stone-700 font-bold">{jornadaId}</span>
            </p>
          </div>
        </div>
        {onCancel && !isCompleted && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(40);
              onCancel();
            }}
            className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 active:bg-stone-200"
            title="Cancelar cierre"
            aria-label="Cancelar cierre"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      {!isCompleted && <div className="w-full max-w-3xl mx-auto">{stepper()}</div>}

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 max-w-3xl mx-auto w-full">
        {/* ═════════ PASO 1 ═════════ */}
        {paso === 1 && !isCompleted && (
          <div className="space-y-3.5">
            <div
              className={`rounded-3xl p-4 flex items-start gap-3 border ${
                itemsDiferentes === 0
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <Snowflake className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-display text-base font-black text-stone-900">
                  Paso 1: ¿Cuántas paletas quedan?
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  {sinToques
                    ? 'Hoy no hay ventas tocadas en el mostrador. Cuenta lo que sobró o anota lo que vendiste de tu libreta.'
                    : itemsDiferentes === 0
                    ? 'Según tus toques, esto es lo que debería quedar. Si lo ves igual en el congelador, solo continúa.'
                    : `${itemsDiferentes} producto(s) no coinciden con los toques. Ajusta a lo que realmente ves.`}
                </p>
              </div>
            </div>

            <div className="flex bg-stone-200/80 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(30);
                  setModoConteo('sobrante');
                }}
                className={`flex-1 h-12 rounded-xl text-sm font-black ${
                  modoConteo === 'sobrante' ? 'bg-amber-500 text-white shadow-xs' : 'text-stone-600'
                }`}
              >
                ❄️ Cuento lo que sobró
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(30);
                  setModoConteo('vendidas');
                }}
                className={`flex-1 h-12 rounded-xl text-sm font-black ${
                  modoConteo === 'vendidas' ? 'bg-amber-500 text-white shadow-xs' : 'text-stone-600'
                }`}
              >
                <NotebookPen className="inline w-4 h-4 mr-1 -mt-0.5" />
                Anoto lo que vendí
              </button>
            </div>

            {itemsDiferentes > 0 && (
              <button
                type="button"
                onClick={restablecerConteo}
                className="w-full h-11 rounded-2xl bg-white border border-stone-200 text-stone-700 text-xs font-bold active:bg-stone-100"
              >
                ↺ Volver a lo que dicen mis toques
              </button>
            )}

            <div className="space-y-2.5">
              {physicalItems.map((item) => {
                const rest = restanteDe(item.id);
                const vend = vendidasDe(item.id);
                const esperado = esperadoPorToques[item.id] ?? 0;
                const coincide = rest === esperado;
                const valor = modoConteo === 'sobrante' ? rest : vend;
                const cambiar = (d: number) => {
                  triggerHaptic(40);
                  if (modoConteo === 'sobrante') setRestante(item.id, rest + d);
                  else setVendidas(item.id, vend + d);
                };
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl bg-white border shadow-xs ${
                      coincide ? 'border-stone-200' : 'border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white shrink-0"
                          style={{
                            background: `linear-gradient(135deg, #FFFFFF 0%, ${item.color}35 100%)`,
                            boxShadow: `0 2px 8px ${item.color}30`,
                          }}
                        >
                          <ItemIcon icono={item.icono} color={item.color} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-display font-extrabold text-stone-900 text-sm truncate">
                            {item.nombre.replace('Paleta de ', '')}
                          </div>
                          <div className="text-[11px] font-semibold text-stone-400">
                            {modoConteo === 'sobrante' ? 'Quedan' : 'Vendidas'} · ${item.precio} c/u
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-2xl border border-stone-200/80 shrink-0">
                        <button
                          type="button"
                          onClick={() => cambiar(-1)}
                          className="w-12 h-12 rounded-xl bg-white active:bg-stone-200 text-stone-700 flex items-center justify-center shadow-xs"
                          aria-label={`Menos ${item.nombre}`}
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={valor}
                          onChange={(e) =>
                            modoConteo === 'sobrante'
                              ? setRestante(item.id, Number(e.target.value))
                              : setVendidas(item.id, Number(e.target.value))
                          }
                          className="w-12 text-center font-display text-lg font-black text-stone-900 bg-transparent focus:outline-none"
                          aria-label={`Cantidad ${item.nombre}`}
                        />
                        <button
                          type="button"
                          onClick={() => cambiar(1)}
                          className="w-12 h-12 rounded-xl bg-amber-500 active:bg-amber-600 text-white flex items-center justify-center shadow-xs"
                          aria-label={`Más ${item.nombre}`}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => cambiar(5)}
                          className="px-2 h-12 rounded-xl bg-amber-100 text-amber-900 font-display font-black text-xs active:scale-95"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-100 text-[11px]">
                      <span className={coincide ? 'text-emerald-700 font-bold' : 'text-amber-800 font-bold'}>
                        {coincide
                          ? '✓ Coincide con los toques'
                          : `Los toques esperaban ${esperado} en congelador`}
                      </span>
                      <span className="font-bold text-stone-600">
                        {modoConteo === 'sobrante' ? `${vend} vendidas` : `${rest} quedan`} · {money(vend * item.precio)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Vendidas en el día</span>
                <div className="font-display text-base font-black text-stone-900">{piezasVendidasTotal} piezas</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Valor</span>
                <div className="font-display text-lg font-black text-emerald-700">{money(ventasTotal)}</div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════ PASO 2 ═════════ */}
        {paso === 2 && !isCompleted && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5">
              <Coins className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-black text-emerald-950">Paso 2: ¿Cuánto dinero hay en el cajón?</h2>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Cuenta todo el efectivo, incluido el fondo de cambio de {money(fondoInicial)}. No cuentes lo que te
                  pagaron por transferencia.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Contado</span>
                <div className="font-display text-3xl font-black text-emerald-700">{money(efectivoContado)}</div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-stone-400 block">Debería haber</span>
                <span className="font-display text-base font-extrabold text-stone-700">
                  {money(plan.esperadoEnCaja)}
                </span>
                {efectivoCapturado && (
                  <span
                    className={`block text-xs font-black ${
                      sem === 'VERDE' ? 'text-emerald-700' : sem === 'AMBAR' ? 'text-amber-700' : 'text-rose-700'
                    }`}
                  >
                    {signed(plan.diferencia)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex bg-stone-200 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setModoDesglose(false)}
                className={`flex-1 h-12 rounded-xl text-sm font-black ${
                  !modoDesglose ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                💵 Total directo
              </button>
              <button
                type="button"
                onClick={() => setModoDesglose(true)}
                className={`flex-1 h-12 rounded-xl text-sm font-black ${
                  modoDesglose ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                🪙 Billetes y monedas
              </button>
            </div>

            {!modoDesglose ? (
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-stone-400 font-display font-black text-2xl">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={efectivoManual ?? ''}
                    onChange={(e) =>
                      setEfectivoManual(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))
                    }
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3.5 font-display text-3xl font-black rounded-2xl border-2 border-emerald-400 bg-emerald-50/20 text-stone-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                    aria-label="Efectivo contado"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(30);
                      setEfectivoManual(Math.max(0, Math.round(plan.esperadoEnCaja * 100) / 100));
                    }}
                    className="h-11 px-3 rounded-xl bg-emerald-100 text-emerald-900 font-black text-xs active:scale-95"
                  >
                    ✓ Es justo lo esperado
                  </button>
                  {[50, 100, 500].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        triggerHaptic(30);
                        setEfectivoManual((p) => (p ?? 0) + v);
                      }}
                      className="h-11 px-3 rounded-xl bg-stone-100 text-stone-700 font-display font-black text-xs active:scale-95"
                    >
                      +${v}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(30);
                      setEfectivoManual(null);
                    }}
                    className="h-11 px-3 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs ml-auto"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {(
                  [
                    { titulo: 'Billetes', tipo: 'billete', denoms: DENOMINACIONES_BILLETES, vals: billetes, Icono: Banknote },
                    { titulo: 'Monedas', tipo: 'moneda', denoms: DENOMINACIONES_MONEDAS, vals: monedas, Icono: Coins },
                  ] as const
                ).map((g) => (
                  <div key={g.tipo} className="bg-white rounded-2xl p-3 border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-stone-600 mb-2">
                      <g.Icono className="w-4 h-4 text-emerald-600" />
                      <span>{g.titulo}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {g.denoms.map((denom) => (
                        <div
                          key={denom}
                          className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200/80"
                        >
                          <span className="text-sm font-black text-stone-700">${denom}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDenom(g.tipo, denom, -1)}
                              className="w-10 h-10 rounded-lg bg-stone-200 active:bg-stone-300 text-stone-700 font-bold flex items-center justify-center"
                              aria-label={`Menos $${denom}`}
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm font-black text-stone-800">
                              {(g.vals as Record<number, number>)[denom] ?? 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDenom(g.tipo, denom, 1)}
                              className="w-10 h-10 rounded-lg bg-emerald-600 active:bg-emerald-700 text-white font-bold flex items-center justify-center"
                              aria-label={`Más $${denom}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {plan.montoNoRegistrado > 0 && (
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 space-y-2">
                <p className="text-xs font-bold text-sky-950">
                  Hay {plan.piezasNoRegistradas} pieza(s) vendidas sin toque ({money(plan.montoNoRegistrado)}).
                  ¿Alguna se cobró por transferencia?
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-black">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={transferenciaNoRegistrada || ''}
                    onChange={(e) => setTransferenciaNoRegistrada(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0 (todo fue efectivo)"
                    className="w-full pl-7 pr-3 h-11 text-sm font-bold rounded-xl border border-sky-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                    aria-label="Transferencias de ventas sin toque"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════ PASO 3 ═════════ */}
        {paso === 3 && !isCompleted && (
          <div className="space-y-4">
            <div className={`p-4 rounded-3xl border flex items-center gap-3.5 shadow-sm ${semClases}`}>
              {sem === 'VERDE' && <CheckCircle2 className="w-12 h-12 text-emerald-600 shrink-0" />}
              {sem === 'AMBAR' && <AlertTriangle className="w-12 h-12 text-amber-600 shrink-0" />}
              {sem === 'ROJO' && <XCircle className="w-12 h-12 text-rose-600 shrink-0" />}
              <div>
                <h2 className="font-display text-lg font-black leading-tight">
                  {sem === 'VERDE'
                    ? '¡Caja cuadrada!'
                    : plan.diferencia > 0
                    ? `Sobran ${money(Math.abs(plan.diferencia))}`
                    : `Faltan ${money(Math.abs(plan.diferencia))}`}
                </h2>
                <p className="text-xs mt-0.5 opacity-90">
                  {sem === 'VERDE'
                    ? 'El dinero coincide con lo vendido y el fondo de cambio.'
                    : sem === 'AMBAR'
                    ? 'Es una diferencia pequeña. Puedes cerrar y dejar una nota.'
                    : 'Revisa las pistas de abajo. Aun así puedes cerrar; queda registrado sin culpas.'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-600">Ventas en efectivo (toques)</span>
                <span className="font-black text-stone-900">{money(plan.resumen.ventas_efectivo)}</span>
              </div>
              {plan.resumen.ventas_transferencia > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">Ventas por transferencia</span>
                  <span className="font-black text-sky-700">{money(plan.resumen.ventas_transferencia)}</span>
                </div>
              )}
              {plan.incluirNoRegistradas && plan.montoNoRegistrado > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">Ventas sin toque ({plan.piezasNoRegistradas} pzas)</span>
                  <span className="font-black text-stone-900">
                    {money(plan.montoNoRegistrado - Math.min(transferenciaNoRegistrada, plan.montoNoRegistrado))}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-600">Fondo de cambio</span>
                <span className="font-black text-stone-700">+{money(fondoInicial)}</span>
              </div>
              <div className="flex justify-between bg-amber-50 rounded-xl px-2 py-1.5">
                <span className="font-bold text-amber-950">🎯 Debe haber</span>
                <span className="font-display font-black text-amber-900">{money(plan.esperadoEnCaja)}</span>
              </div>
              <div className="flex justify-between bg-stone-50 rounded-xl px-2 py-1.5">
                <span className="font-bold text-stone-700">💵 Contaste</span>
                <span className="font-display font-black text-emerald-700">{money(efectivoContado)}</span>
              </div>
            </div>

            {plan.montoNoRegistrado > 0 && (
              <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-3 space-y-2">
                <h3 className="text-sm font-black text-amber-950">
                  Salieron {plan.piezasNoRegistradas} paleta(s) del congelador sin toque
                </h3>
                <p className="text-xs text-amber-900">
                  {plan.noRegistradas.map((n) => `${n.cantidad} ${n.nombre.replace('Paleta de ', '')}`).join(', ')} (
                  {money(plan.montoNoRegistrado)}).{' '}
                  {plan.sugerencia
                    ? 'Tu caja cuadra mejor si las cuentas como vendidas.'
                    : 'Tu caja cuadra mejor si NO las cuentas como ventas.'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(40);
                      setIncluirManual(true);
                    }}
                    className={`flex-1 h-12 rounded-xl text-xs font-black ${
                      plan.incluirNoRegistradas ? 'bg-amber-500 text-white' : 'bg-white border border-stone-200 text-stone-700'
                    }`}
                  >
                    {plan.incluirNoRegistradas ? '✓ ' : ''}Sí, fueron ventas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(40);
                      setIncluirManual(false);
                    }}
                    className={`flex-1 h-12 rounded-xl text-xs font-black ${
                      !plan.incluirNoRegistradas ? 'bg-stone-700 text-white' : 'bg-white border border-stone-200 text-stone-700'
                    }`}
                  >
                    {!plan.incluirNoRegistradas ? '✓ ' : ''}No, fue otra cosa
                  </button>
                </div>
              </div>
            )}

            {plan.piezasDeMasEnToques > 0 && (
              <div className="bg-stone-100 border border-stone-200 rounded-2xl p-3 text-xs text-stone-700">
                Hay {plan.piezasDeMasEnToques} pieza(s) tocadas de más en el mostrador respecto al congelador. Puede
                ser un toque repetido o una merma sin anotar.
              </div>
            )}

            {sem !== 'VERDE' && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  ¿Qué pudo pasar? (toca para anotarlo)
                </span>
                <div className="flex flex-wrap gap-2">
                  {MOTIVOS_RAPIDOS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        triggerHaptic(30);
                        setNotaCierre((p) => (p.includes(m) ? p : p ? `${p} · ${m}` : m));
                      }}
                      className="h-10 px-3 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-700 active:bg-stone-100"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="nota-cierre" className="block text-xs font-semibold text-stone-500 mb-1">
                Nota (opcional)
              </label>
              <input
                id="nota-cierre"
                type="text"
                value={notaCierre}
                onChange={(e) => setNotaCierre(e.target.value)}
                placeholder="Ej. Cuadre perfecto"
                className="w-full text-sm px-3 h-12 rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {plan.resumen.explicaciones.length > 0 && sem !== 'VERDE' && (
              <details className="bg-stone-100 p-3 rounded-2xl border border-stone-200">
                <summary className="text-xs font-bold text-stone-600 cursor-pointer">Ver detalle del diagnóstico</summary>
                <div className="mt-2 space-y-1">
                  {plan.resumen.explicaciones.map((exp, i) => (
                    <p key={i} className="text-xs text-stone-700 leading-relaxed">
                      • {exp}
                    </p>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ═════════ ÉXITO ═════════ */}
        {isCompleted && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-3xl p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-emerald-900">¡Jornada cerrada!</h2>
            <p className="text-sm text-emerald-800">
              {piezasVendidasTotal} piezas · {money(ventasTotal)} en ventas
            </p>
            <p className="text-xs text-emerald-700 max-w-xs mx-auto">
              Resultado: {sem === 'VERDE' ? 'caja cuadrada' : `${signed(plan.diferencia)} de diferencia`}. El cierre quedó
              guardado y no se puede modificar.
            </p>
          </div>
        )}
      </main>

      {/* ─── Hoja de PIN ─── */}
      {mostrarPin && !isCompleted && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 pb-safe flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-black text-stone-800">PIN de supervisora para firmar</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMostrarPin(false);
                  setPinDigits('');
                  setPinError(null);
                }}
                className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500"
                aria-label="Cerrar teclado PIN"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-4 my-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    pinDigits.length > i ? 'bg-emerald-600 scale-125' : 'bg-stone-200 border border-stone-300'
                  }`}
                />
              ))}
            </div>
            {pinError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mb-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={isLockedOut || isSubmitting}
                  onClick={() => pulsarPin(d)}
                  className="h-14 rounded-xl bg-stone-100 active:bg-stone-300 text-stone-800 font-extrabold text-xl disabled:opacity-40"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                disabled={isLockedOut || isSubmitting}
                onClick={() => setPinDigits('')}
                className="h-14 rounded-xl bg-stone-100 text-stone-500 font-bold text-xs disabled:opacity-40"
              >
                Limpiar
              </button>
              <button
                type="button"
                disabled={isLockedOut || isSubmitting}
                onClick={() => pulsarPin('0')}
                className="h-14 rounded-xl bg-stone-100 active:bg-stone-300 text-stone-800 font-extrabold text-xl disabled:opacity-40"
              >
                0
              </button>
              <button
                type="button"
                disabled={isLockedOut || isSubmitting}
                onClick={() => {
                  setPinDigits((p) => p.slice(0, -1));
                  setPinError(null);
                }}
                className="h-14 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center disabled:opacity-40"
                aria-label="Borrar dígito"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Navegación ─── */}
      <footer className="p-3 bg-white border-t border-stone-200 shadow-md shrink-0 flex items-center justify-between gap-3 pb-safe">
        {paso > 1 && !isCompleted ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(40);
              setPaso((p) => Math.max(1, p - 1) as PasoCierre);
            }}
            className="h-14 px-4 rounded-2xl bg-stone-100 text-stone-700 font-bold text-sm flex items-center gap-1.5 active:bg-stone-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Atrás</span>
          </button>
        ) : (
          <div />
        )}

        {isCompleted ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(50);
              onCancel?.();
            }}
            className="flex-1 h-14 bg-emerald-600 text-white font-black text-base rounded-2xl shadow-sm"
          >
            Finalizar y salir
          </button>
        ) : paso < 3 ? (
          <button
            type="button"
            disabled={!puedeAvanzar}
            onClick={() => {
              triggerHaptic(50);
              setPaso((p) => Math.min(3, p + 1) as PasoCierre);
            }}
            className="flex-1 h-14 bg-amber-500 active:bg-amber-600 text-white font-extrabold text-base rounded-2xl shadow-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <span>{textoAvanzar}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(50);
              setMostrarPin(true);
            }}
            className="flex-1 h-14 bg-emerald-600 active:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-sm flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            <span>Firmar y cerrar el día</span>
          </button>
        )}
      </footer>
    </div>
  );
};

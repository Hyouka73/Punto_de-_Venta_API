import React, { useState } from 'react';
import type { CatalogoItem, ParametrosNegocio } from '@/domain/config/types';
import { triggerHaptic } from '../utils/haptics';
import { ItemIcon, ICON_OPTIONS, COLOR_OPTIONS } from '../utils/itemIcons';
import { slugId } from '@/state/configReducer';
import {
  Lock,
  ArrowLeft,
  Settings,
  DollarSign,
  Package,
  Layers,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  Database,
} from 'lucide-react';
import { DEFAULT_PARAMETERS } from '@/domain/config/parameters';
import { SheetsAppsScriptAdapter } from '@/adapters/SheetsAppsScriptAdapter';

export interface ConfiguracionScreenProps {
  initialCatalog: readonly CatalogoItem[];
  initialParameters?: ParametrosNegocio;
  adapterMode?: 'mock' | 'sheets';
  webappUrl?: string;
  adminPin?: string;
  onSaveConfig?: (
    newCatalog: CatalogoItem[],
    newParams: ParametrosNegocio,
    adapterMode: 'mock' | 'sheets',
    webappUrl: string
  ) => void;
  onBack: () => void;
}

type ConfigTab = 'catalogo' | 'combos' | 'parametros' | 'seguridad' | 'conexion';

const BLANK_PRODUCT = {
  nombre: '',
  precio: 0,
  costo: 0,
  icono: 'ice-cream',
  color: COLOR_OPTIONS[0] ?? '#38BDF8',
  controla_stock: true,
};

export const ConfiguracionScreen: React.FC<ConfiguracionScreenProps> = ({
  initialCatalog,
  initialParameters = DEFAULT_PARAMETERS,
  adapterMode: initialAdapterMode = 'mock',
  webappUrl: initialWebappUrl = '',
  adminPin = '654321', // PIN admin por defecto para desarrollo
  onSaveConfig,
  onBack,
}) => {
  // Estado de Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);

  // Pestaña Activa
  const [activeTab, setActiveTab] = useState<ConfigTab>('catalogo');

  // Estado Editable
  const [catalogItems, setCatalogItems] = useState<CatalogoItem[]>([...initialCatalog]);
  const [params, setParams] = useState<ParametrosNegocio>({ ...initialParameters });
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  // Estado de Conexión a Google Sheets
  const [adapterMode, setAdapterMode] = useState<'mock' | 'sheets'>(initialAdapterMode);
  const [webappUrl, setWebappUrl] = useState<string>(
    initialWebappUrl || ((import.meta.env.VITE_SHEETS_WEBAPP_URL as string) ?? '')
  );
  const [newProduct, setNewProduct] = useState<typeof BLANK_PRODUCT | null>(null);
  const [newCombo, setNewCombo] = useState<{
    nombre: string;
    precio: number;
    icono: string;
    color: string;
    qty: Record<string, number>;
  } | null>(null);
  const [testState, setTestState] = useState<{
    testing: boolean;
    success?: boolean;
    message?: string;
    latencyMs?: number;
    itemCount?: number;
  }>({ testing: false });

  const handleTestSheetsConnection = async () => {
    triggerHaptic(40);
    setTestState({ testing: true });
    try {
      const adapter = new SheetsAppsScriptAdapter({ webappUrl });
      const res = await adapter.testConnection(webappUrl);
      if (res.success) {
        triggerHaptic(60);
        setTestState({
          testing: false,
          success: true,
          latencyMs: res.latencyMs,
          itemCount: res.itemCount,
          message: `¡Conexión Exitosa! Latencia: ${res.latencyMs}ms | ${res.itemCount} items leídos del catálogo`,
        });
      } else {
        triggerHaptic(100);
        setTestState({
          testing: false,
          success: false,
          latencyMs: res.latencyMs,
          message: res.error || 'No se pudo conectar a Google Apps Script',
        });
      }
    } catch (err: any) {
      triggerHaptic(100);
      setTestState({
        testing: false,
        success: false,
        message: err.message || 'Error inesperado de red',
      });
    }
  };

  // Manejador del Teclado Numérico para PIN (6 dígitos)
  const handlePinDigit = (digit: string) => {
    if (isLockedOut || enteredPin.length >= 6) return;
    triggerHaptic(40);
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setPinError(null);

    if (newPin.length === 6) {
      if (newPin === adminPin) {
        triggerHaptic(60);
        setIsAuthenticated(true);
        setEnteredPin('');
        setFailedAttempts(0);
      } else {
        triggerHaptic(100);
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setEnteredPin('');

        if (newAttempts >= 3) {
          setIsLockedOut(true);
          setPinError('Demasiados intentos fallidos. Bloqueado temporalmente (30s).');
          setTimeout(() => {
            setIsLockedOut(false);
            setFailedAttempts(0);
            setPinError(null);
          }, 30000);
        } else {
          setPinError(`PIN incorrecto. Intentos restantes: ${3 - newAttempts}`);
        }
      }
    }
  };

  const handleBackspace = () => {
    triggerHaptic(30);
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const patchItem = (id: string, patch: Partial<CatalogoItem>) => {
    setCatalogItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const moveItem = (id: string, dir: -1 | 1) => {
    setCatalogItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.orden - b.orden);
      const i = sorted.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return prev;
      const a = sorted[i];
      const b = sorted[j];
      if (!a || !b) return prev;
      sorted[i] = b;
      sorted[j] = a;
      return sorted.map((c, k) => ({ ...c, orden: k + 1 }));
    });
  };

  // Guardar Cambios (UR3: el store persiste en localStorage y el adaptador se reconstruye)
  const handleSave = () => {
    triggerHaptic(60);
    if (onSaveConfig) {
      onSaveConfig(catalogItems, params, adapterMode, webappUrl);
    }
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  // ─── PANTALLA DE BLOQUEO POR PIN ADMIN ───
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-stone-100 flex flex-col justify-between max-w-sm mx-auto p-4 select-none">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-bold text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Seguridad Admin
          </span>
        </div>

        <div className="my-auto flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-stone-900 text-amber-400 flex items-center justify-center shadow-md mb-3">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-stone-900">Configuración del Sistema</h2>
          <p className="text-xs text-stone-500 mt-1 max-w-xs">
            Ingresa el PIN de Administrador (6 dígitos) para editar catálogo, precios y parámetros.
          </p>

          {/* Indicadores de Dígitos (6 bolitas) */}
          <div className="flex gap-2.5 my-6">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full border-2 transition-all ${
                  idx < enteredPin.length
                    ? 'bg-stone-900 border-stone-900 scale-110'
                    : 'border-stone-300 bg-white'
                }`}
              />
            ))}
          </div>

          {pinError && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}
        </div>

        {/* Teclado Numérico Gigante */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLockedOut}
              onClick={() => handlePinDigit(digit.toString())}
              className="h-16 rounded-2xl bg-white border border-stone-200 text-2xl font-black text-stone-900 shadow-xs active:bg-amber-100 active:scale-95 transition-all disabled:opacity-40"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={onBack}
            className="h-16 rounded-2xl bg-stone-200 text-xs font-extrabold text-stone-700 uppercase tracking-wider active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isLockedOut}
            onClick={() => handlePinDigit('0')}
            className="h-16 rounded-2xl bg-white border border-stone-200 text-2xl font-black text-stone-900 shadow-xs active:bg-amber-100 active:scale-95 transition-all disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-stone-200 text-stone-900 flex items-center justify-center font-bold active:scale-95 transition-all"
          >
            ⌫
          </button>
        </div>
      </div>
    );
  }

  // ─── PANTALLA DE CONFIGURACIÓN AUTENTICADA ───
  return (
    <div className="min-h-screen w-full bg-stone-50 select-none flex flex-col justify-between max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Mostrador</span>
        </button>

        <h1 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
          <Settings className="h-4 w-4 text-amber-500" />
          <span>Configuración Admin</span>
        </h1>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 text-xs font-bold active:scale-95 transition-all shadow-xs"
        >
          <Save className="h-3.5 w-3.5 text-amber-400" />
          <span>Guardar</span>
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-stone-200 bg-white px-2 overflow-x-auto shrink-0">
        {[
          { id: 'catalogo', label: 'Catálogo', icon: Package },
          { id: 'combos', label: 'Combos', icon: Layers },
          { id: 'parametros', label: 'Parámetros', icon: DollarSign },
          { id: 'seguridad', label: 'Seguridad', icon: Shield },
          { id: 'conexion', label: 'Google Sheets', icon: Cloud },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ConfigTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-amber-500 text-stone-900'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Toast de confirmación guardada */}
      {showSavedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-lg animate-bounce-short">
          <CheckCircle2 className="h-4 w-4" />
          <span>Configuración guardada exitosamente</span>
        </div>
      )}

      {/* Contenido de la pestaña */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Pestaña: Catálogo y Precios */}
        {activeTab === 'catalogo' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                Productos ({catalogItems.filter((i) => !i.es_combo).length})
              </h2>
              <button
                type="button"
                data-testid="btn-nuevo-producto"
                onClick={() => setNewProduct({ ...BLANK_PRODUCT })}
                className="min-h-[56px] rounded-2xl bg-stone-900 text-white px-4 text-sm font-extrabold active:scale-95 transition-transform"
              >
                + Nuevo producto
              </button>
            </div>

            {newProduct && (
              <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 space-y-3" data-testid="form-nuevo-producto">
                <ProductFields
                  value={newProduct}
                  onChange={(v) => setNewProduct({ ...newProduct, ...v })}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!newProduct.nombre.trim() || newProduct.precio <= 0}
                    onClick={() => {
                      const id = slugId(newProduct.nombre, 'CAT', catalogItems.map((c) => c.id));
                      setCatalogItems((prev) => [
                        ...prev,
                        { ...newProduct, nombre: newProduct.nombre.trim(), id, orden: prev.length + 1, activo: true, es_combo: false },
                      ]);
                      setNewProduct(null);
                    }}
                    className="flex-1 min-h-[56px] rounded-2xl bg-emerald-600 disabled:opacity-40 text-white font-extrabold text-base"
                  >
                    Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProduct(null)}
                    className="min-h-[56px] px-5 rounded-2xl bg-stone-200 text-stone-800 font-bold text-base"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {catalogItems
              .filter((i) => !i.es_combo)
              .map((item) => (
                <ProductRow
                  key={item.id}
                  item={item}
                  onPatch={(patch) => patchItem(item.id, patch)}
                  onMove={(d) => moveItem(item.id, d)}
                />
              ))}
          </div>
        )}

        {/* Pestaña: Combos */}
        {activeTab === 'combos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                Combos Promocionales
              </h2>
              <button
                type="button"
                data-testid="btn-nuevo-combo"
                onClick={() =>
                  setNewCombo({ nombre: '', precio: 0, icono: 'sparkles', color: COLOR_OPTIONS[4] ?? '#A855F7', qty: {} })
                }
                className="min-h-[56px] rounded-2xl bg-purple-700 text-white px-4 text-sm font-extrabold active:scale-95 transition-transform"
              >
                + Nuevo combo
              </button>
            </div>

            {newCombo && (
              <div className="rounded-2xl border-2 border-purple-400 bg-purple-50 p-4 space-y-3" data-testid="form-nuevo-combo">
                <label className="block text-sm font-bold text-stone-800">
                  Nombre
                  <input
                    type="text"
                    value={newCombo.nombre}
                    onChange={(e) => setNewCombo({ ...newCombo, nombre: e.target.value })}
                    className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-300 px-3 text-base"
                  />
                </label>
                <label className="block text-sm font-bold text-stone-800">
                  Precio ($)
                  <input
                    type="number"
                    min="0"
                    value={newCombo.precio || ''}
                    onChange={(e) => setNewCombo({ ...newCombo, precio: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-300 px-3 text-base"
                  />
                </label>
                <div className="space-y-1.5">
                  <div className="text-sm font-bold text-stone-800">Componentes</div>
                  {catalogItems
                    .filter((i) => !i.es_combo && i.activo)
                    .map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl bg-white border border-stone-200 px-3 py-2">
                        <span className="text-sm font-semibold text-stone-800">{p.nombre}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Quitar ${p.nombre}`}
                            onClick={() =>
                              setNewCombo({ ...newCombo, qty: { ...newCombo.qty, [p.id]: Math.max(0, (newCombo.qty[p.id] ?? 0) - 1) } })
                            }
                            className="w-11 h-11 rounded-xl bg-stone-100 font-black text-lg"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-black text-base">{newCombo.qty[p.id] ?? 0}</span>
                          <button
                            type="button"
                            aria-label={`Agregar ${p.nombre}`}
                            onClick={() =>
                              setNewCombo({ ...newCombo, qty: { ...newCombo.qty, [p.id]: (newCombo.qty[p.id] ?? 0) + 1 } })
                            }
                            className="w-11 h-11 rounded-xl bg-stone-900 text-white font-black text-lg"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={
                      !newCombo.nombre.trim() ||
                      newCombo.precio <= 0 ||
                      Object.values(newCombo.qty).every((q) => q <= 0)
                    }
                    onClick={() => {
                      const componentes = Object.entries(newCombo.qty)
                        .filter(([, q]) => q > 0)
                        .map(([id, q]) => ({ id, cant: q, cantidad: q }));
                      const costo = componentes.reduce(
                        (acc, c) => acc + (catalogItems.find((i) => i.id === c.id)?.costo ?? 0) * c.cant,
                        0
                      );
                      setCatalogItems((prev) => [
                        ...prev,
                        {
                          id: slugId(newCombo.nombre, 'CMB', prev.map((c) => c.id)),
                          nombre: newCombo.nombre.trim(),
                          precio: newCombo.precio,
                          costo,
                          icono: newCombo.icono,
                          color: newCombo.color,
                          orden: prev.length + 1,
                          activo: true,
                          controla_stock: false,
                          es_combo: true,
                          componentes,
                        },
                      ]);
                      setNewCombo(null);
                    }}
                    className="flex-1 min-h-[56px] rounded-2xl bg-emerald-600 disabled:opacity-40 text-white font-extrabold text-base"
                  >
                    Agregar combo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCombo(null)}
                    className="min-h-[56px] px-5 rounded-2xl bg-stone-200 text-stone-800 font-bold text-base"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {catalogItems
              .filter((i) => i.es_combo)
              .map((combo) => (
                <ProductRow
                  key={combo.id}
                  item={combo}
                  subtitle={combo.componentes
                    ?.map((c) => `${c.cant ?? c.cantidad ?? 1}× ${catalogItems.find((i) => i.id === c.id)?.nombre ?? c.id}`)
                    .join(' + ')}
                  onPatch={(patch) => patchItem(combo.id, patch)}
                  onMove={(d) => moveItem(combo.id, d)}
                />
              ))}
          </div>
        )}

        {/* Pestaña: Parámetros de Caja */}
        {activeTab === 'parametros' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Tolerancias de Cuadre y Reglas de Negocio
            </h2>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-800">Tolerancia Semáforo Verde</div>
                  <div className="text-[10px] text-stone-400">Diferencia máxima aceptable ($)</div>
                </div>
                <input
                  type="number"
                  value={params.tolerancia_verde}
                  onChange={(e) =>
                    setParams({ ...params, tolerancia_verde: parseFloat(e.target.value) || 0 })
                  }
                  className="w-16 rounded-xl border border-stone-200 px-2 py-1 text-right font-black"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <div>
                  <div className="font-bold text-stone-800">Tolerancia Semáforo Ámbar</div>
                  <div className="text-[10px] text-stone-400">Diferencia moderada con aviso ($)</div>
                </div>
                <input
                  type="number"
                  value={params.tolerancia_ambar}
                  onChange={(e) =>
                    setParams({ ...params, tolerancia_ambar: parseFloat(e.target.value) || 0 })
                  }
                  className="w-16 rounded-xl border border-stone-200 px-2 py-1 text-right font-black"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <div>
                  <div className="font-bold text-stone-800">Fondo Inicial Predeterminado</div>
                  <div className="text-[10px] text-stone-400">Efectivo sugerido al abrir ($)</div>
                </div>
                <input
                  type="number"
                  value={params.fondo_caja_default}
                  onChange={(e) =>
                    setParams({ ...params, fondo_caja_default: parseFloat(e.target.value) || 0 })
                  }
                  className="w-16 rounded-xl border border-stone-200 px-2 py-1 text-right font-black"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                <div>
                  <div className="font-bold text-stone-800">Ventana de Deshacer</div>
                  <div className="text-[10px] text-stone-400">Tiempo límite para revertir venta (min)</div>
                </div>
                <input
                  type="number"
                  value={params.ventana_deshacer_min}
                  onChange={(e) =>
                    setParams({ ...params, ventana_deshacer_min: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-16 rounded-xl border border-stone-200 px-2 py-1 text-right font-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* Pestaña: Seguridad y Roles */}
        {activeTab === 'seguridad' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Gobernanza de Seguridad (Apps Script / Script Properties)
            </h2>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Shield className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-stone-800">Almacenamiento de PINs</div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Los PINs residen en <code>PropertiesService.getScriptProperties()</code> en Google Apps Script. Jamás se guardan en celdas de la hoja ni en código cliente.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-start gap-2.5">
                <Lock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-stone-800">Roles Activos</div>
                  <ul className="text-stone-500 text-[11px] list-disc list-inside mt-1 space-y-0.5">
                    <li><strong>Mostrador:</strong> Sin PIN (registro en 1 toque).</li>
                    <li><strong>Supervisora:</strong> PIN de 4 dígitos (apertura y cierre).</li>
                    <li><strong>Admin:</strong> PIN de 6 dígitos (catálogo y configuración).</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pestaña: Conexión con Google Sheets */}
        {activeTab === 'conexion' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Conexión & Google Sheets
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  adapterMode === 'sheets'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {adapterMode === 'sheets' ? 'Modo Sheets Activo' : 'Modo Mock Local'}
              </span>
            </div>

            {/* Selector de Adaptador */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
              <div className="font-bold text-xs text-stone-800">Motor de Persistencia</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(40);
                    setAdapterMode('mock');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    adapterMode === 'mock'
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-4 w-4 text-amber-600" />
                    <span className="font-bold text-xs text-stone-900">Mock Local</span>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Almacenamiento en memoria e IndexedDB. Ideal para desarrollo y demostración offline.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(40);
                    setAdapterMode('sheets');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    adapterMode === 'sheets'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400/20'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Cloud className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-xs text-stone-900">Google Sheets</span>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Backend real conectado a Apps Script con append-only ledger y cuadre triple.
                  </p>
                </button>
              </div>
            </div>

            {/* Configuración de URL de Apps Script */}
            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs text-stone-800">
                  URL de Google Apps Script Web App
                </label>
                <span className="text-[10px] text-stone-400 font-mono">/exec</span>
              </div>
              <input
                type="text"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={webappUrl}
                onChange={(e) => setWebappUrl(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-mono text-stone-800 placeholder:text-stone-300 focus:border-amber-500 focus:outline-hidden"
              />

              {/* Botón de Probar Conexión */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={testState.testing || !webappUrl}
                  onClick={handleTestSheetsConnection}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-3.5 py-2 text-xs font-bold active:scale-95 transition-all shadow-xs"
                >
                  {testState.testing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Probando Conexión...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Probar Conexión en Vivo</span>
                    </>
                  )}
                </button>

                <span className="text-[10px] text-stone-400">POST GET_CATALOG</span>
              </div>

              {/* Resultado del Test */}
              {testState.message && (
                <div
                  className={`mt-2 p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                    testState.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {testState.success ? (
                    <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">
                      {testState.success ? 'Conexión Exitosa' : 'Fallo de Conexión'}
                    </div>
                    <p className="text-[11px] mt-0.5 opacity-90">{testState.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Card de Guía Rápida */}
            <div className="rounded-2xl border border-stone-200 bg-amber-50/60 p-4 space-y-2 text-amber-950">
              <div className="flex items-center gap-2 font-bold text-xs">
                <ExternalLink className="h-4 w-4 text-amber-700" />
                <span>¿Cómo conectar tu Google Sheets?</span>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                1. Crea una hoja en <code>sheets.new</code>.<br />
                2. Pega <code>gas/SetupMasterSheets.js</code> para crear las 8 hojas.<br />
                3. Pega <code>gas/Code.js</code> y añade los PINs en Script Properties.<br />
                4. Implementa como Web App pública (Cualquier usuario) y copia la URL.
              </p>
              <div className="text-[10px] font-semibold text-amber-800">
                Consulta la guía completa en <code>docs/GUIA_CONEXION_GOOGLE_SHEETS.md</code>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

interface ProductFieldsValue {
  nombre: string;
  precio: number;
  costo: number;
  icono: string;
  color: string;
  controla_stock: boolean;
}

const ProductFields: React.FC<{
  value: ProductFieldsValue;
  onChange: (patch: Partial<ProductFieldsValue>) => void;
}> = ({ value, onChange }) => (
  <div className="space-y-3">
    <label className="block text-sm font-bold text-stone-800">
      Nombre
      <input
        type="text"
        data-testid="input-nombre"
        value={value.nombre}
        onChange={(e) => onChange({ nombre: e.target.value })}
        className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-300 px-3 text-base"
      />
    </label>
    <div className="grid grid-cols-2 gap-2">
      <label className="block text-sm font-bold text-stone-800">
        Precio ($)
        <input
          type="number"
          min="0"
          data-testid="input-precio"
          value={value.precio || ''}
          onChange={(e) => onChange({ precio: parseFloat(e.target.value) || 0 })}
          className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-300 px-3 text-base"
        />
      </label>
      <label className="block text-sm font-bold text-stone-800">
        Costo ($)
        <input
          type="number"
          min="0"
          value={value.costo || ''}
          onChange={(e) => onChange({ costo: parseFloat(e.target.value) || 0 })}
          className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-300 px-3 text-base"
        />
      </label>
    </div>
    <div>
      <div className="text-sm font-bold text-stone-800 mb-1">Icono</div>
      <div className="flex flex-wrap gap-2">
        {ICON_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-label={`Icono ${o.label}`}
            aria-pressed={value.icono === o.id}
            onClick={() => onChange({ icono: o.id })}
            className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
              value.icono === o.id ? 'border-stone-900 bg-white' : 'border-stone-200 bg-stone-50'
            }`}
          >
            <ItemIcon icono={o.id} color={value.color} className="w-6 h-6" />
          </button>
        ))}
      </div>
    </div>
    <div>
      <div className="text-sm font-bold text-stone-800 mb-1">Color</div>
      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            aria-pressed={value.color === c}
            onClick={() => onChange({ color: c })}
            className={`w-12 h-12 rounded-full border-4 ${
              value.color === c ? 'border-stone-900' : 'border-white shadow'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
    <label className="flex items-center gap-3 min-h-[48px] text-sm font-bold text-stone-800">
      <input
        type="checkbox"
        checked={value.controla_stock}
        onChange={(e) => onChange({ controla_stock: e.target.checked })}
        className="w-6 h-6"
      />
      Controla inventario
    </label>
  </div>
);

const ProductRow: React.FC<{
  item: CatalogoItem;
  subtitle?: string;
  onPatch: (patch: Partial<CatalogoItem>) => void;
  onMove: (dir: -1 | 1) => void;
}> = ({ item, subtitle, onPatch, onMove }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      data-testid={`row-${item.id}`}
      className={`rounded-2xl border bg-white p-3 shadow-2xs space-y-2 ${
        item.es_combo ? 'border-purple-200' : 'border-stone-200'
      } ${item.activo ? '' : 'opacity-60'}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${item.color}33` }}>
          <ItemIcon icono={item.icono} color={item.color} className="w-7 h-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-stone-900 text-base truncate">{item.nombre}</div>
          <div className="text-sm text-stone-600 truncate">{subtitle ?? item.id}</div>
        </div>
        <div className="flex items-center rounded-xl bg-stone-100 px-2">
          <span className="text-base font-extrabold text-stone-600">$</span>
          <input
            type="number"
            min="0"
            aria-label={`Precio de ${item.nombre}`}
            data-testid={`price-${item.id}`}
            value={item.precio}
            onChange={(e) => onPatch({ precio: Math.max(0, parseFloat(e.target.value) || 0) })}
            className="w-16 min-h-[48px] bg-transparent text-right text-base font-black text-stone-900 focus:outline-amber-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          aria-label={`Subir ${item.nombre}`}
          onClick={() => onMove(-1)}
          className="w-12 h-12 rounded-xl bg-stone-100 font-black"
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`Bajar ${item.nombre}`}
          onClick={() => onMove(1)}
          className="w-12 h-12 rounded-xl bg-stone-100 font-black"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => onPatch({ activo: !item.activo })}
          className={`min-h-[48px] px-4 rounded-xl text-sm font-extrabold ${
            item.activo ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-700'
          }`}
        >
          {item.activo ? 'Activo' : 'Oculto'}
        </button>
        {!item.es_combo && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="min-h-[48px] px-4 rounded-xl bg-stone-100 text-sm font-bold text-stone-800"
          >
            {open ? 'Cerrar' : 'Editar'}
          </button>
        )}
        <button
          type="button"
          aria-label={`Eliminar ${item.nombre}`}
          onClick={() => onPatch({ activo: false })}
          className="min-h-[48px] px-4 rounded-xl bg-rose-100 text-rose-800 text-sm font-extrabold ml-auto"
        >
          Eliminar
        </button>
      </div>
      {open && !item.es_combo && (
        <div className="pt-2 border-t border-stone-100">
          <ProductFields value={item} onChange={onPatch} />
        </div>
      )}
    </div>
  );
};

export default ConfiguracionScreen;

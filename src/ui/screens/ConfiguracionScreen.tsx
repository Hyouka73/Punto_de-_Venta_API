import React, { useState } from 'react';
import type { CatalogoItem, ParametrosNegocio } from '@/domain/config/types';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '@/domain/config/parameters';
import { triggerHaptic } from '../utils/haptics';
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
} from 'lucide-react';

export interface ConfiguracionScreenProps {
  initialCatalog?: readonly CatalogoItem[];
  initialParameters?: ParametrosNegocio;
  adminPin?: string;
  onSaveConfig?: (newCatalog: CatalogoItem[], newParams: ParametrosNegocio) => void;
  onBack: () => void;
}

type ConfigTab = 'catalogo' | 'combos' | 'parametros' | 'seguridad';

export const ConfiguracionScreen: React.FC<ConfiguracionScreenProps> = ({
  initialCatalog = DEFAULT_CATALOG,
  initialParameters = DEFAULT_PARAMETERS,
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

  // Actualización de Precios en Catálogo
  const handlePriceChange = (id: string, newPrice: number) => {
    setCatalogItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, precio: Math.max(0, newPrice) } : item))
    );
  };

  // Toggle de Activo
  const handleToggleActive = (id: string) => {
    setCatalogItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, activo: !item.activo } : item))
    );
  };

  // Guardar Cambios
  const handleSave = () => {
    triggerHaptic(60);
    if (onSaveConfig) {
      onSaveConfig(catalogItems, params);
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Productos Base (Precios al Mostrador)
            </h2>

            {catalogItems
              .filter((i) => !i.es_combo)
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl">{item.icono}</span>
                    <div className="truncate">
                      <div className="font-extrabold text-stone-900 text-xs truncate">
                        {item.nombre}
                      </div>
                      <div className="text-[10px] text-stone-400 uppercase">
                        {item.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center rounded-xl bg-stone-100 p-1">
                      <span className="text-xs font-extrabold text-stone-500 px-1">$</span>
                      <input
                        type="number"
                        min="0"
                        value={item.precio}
                        onChange={(e) =>
                          handlePriceChange(item.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-14 rounded-lg bg-white px-2 py-1 text-right text-xs font-black text-stone-900 focus:outline-amber-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(item.id)}
                      className={`h-7 px-2 rounded-lg text-[10px] font-extrabold transition-all ${
                        item.activo
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {item.activo ? 'Activo' : 'Oculto'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Pestaña: Combos */}
        {activeTab === 'combos' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Combos Promocionales
            </h2>

            {catalogItems
              .filter((i) => i.es_combo)
              .map((combo) => (
                <div
                  key={combo.id}
                  className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{combo.icono}</span>
                      <div>
                        <div className="font-black text-purple-950 text-sm">
                          {combo.nombre}
                        </div>
                        <div className="text-[11px] text-purple-700">
                          {combo.componentes?.map((c) => `${c.cant ?? c.cantidad ?? 1}x ${c.id}`).join(' + ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center rounded-xl bg-white border border-purple-200 p-1">
                      <span className="text-xs font-extrabold text-purple-600 px-1">$</span>
                      <input
                        type="number"
                        min="0"
                        value={combo.precio}
                        onChange={(e) =>
                          handlePriceChange(combo.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-14 rounded-lg bg-stone-50 px-2 py-1 text-right text-xs font-black text-stone-900 focus:outline-purple-500"
                      />
                    </div>
                  </div>
                </div>
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
      </main>
    </div>
  );
};

export default ConfiguracionScreen;

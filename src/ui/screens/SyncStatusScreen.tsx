import React, { useState } from 'react';
import type { SyncWorkerStatus } from '@/infrastructure/offline/SyncWorker';
import {
  Cloud,
  CloudCheck,
  CloudAlert,
  CloudOff,
  RefreshCw,
  ArrowLeft,
  Server,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { ENV } from '@/config/env';

export interface SyncStatusScreenProps {
  status?: Partial<SyncWorkerStatus>;
  onForceSync?: () => Promise<void> | void;
  onBack: () => void;
  backendName?: string;
}

export const SyncStatusScreen: React.FC<SyncStatusScreenProps> = ({
  status = {},
  onForceSync,
  onBack,
  backendName = ENV.dataAdapter === 'sheets'
    ? 'Google Sheets (Apps Script)'
    : 'Almacenamiento Local (IndexedDB)',
}) => {
  const {
    isSyncing = false,
    pendingCount = 0,
    isOnline = true,
    lastSyncTime = Date.now(),
    lastError = null,
  } = status;

  const [loadingSync, setLoadingSync] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  const handleManualSync = async () => {
    if (loadingSync || isSyncing) return;
    setLoadingSync(true);
    try {
      if (onForceSync) {
        await onForceSync();
      } else {
        // Simular retraso de red si no se inyectó callback
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } finally {
      setLoadingSync(false);
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Ninguna en esta sesión';
    const date = new Date(ts);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="h-full w-full bg-stone-50 select-none flex flex-col overflow-hidden">
      {/* Encabezado con safe area */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-4 sm:px-6 py-3 shadow-xs pt-safe">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Mostrador</span>
        </button>

        <h1 className="text-base font-extrabold text-stone-900">
          Sincronización & Red
        </h1>

        <div className="w-16" /> {/* Spacer */}
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 max-w-2xl mx-auto w-full pb-safe">
        {/* Card Gigante de Estado */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col items-center text-center">
          <div className="my-3">
            {!isOnline ? (
              <div className="h-24 w-24 rounded-full bg-rose-50 border-2 border-rose-200 flex items-center justify-center text-rose-500 shadow-inner">
                <CloudOff className="h-12 w-12" />
              </div>
            ) : isSyncing || loadingSync ? (
              <div className="h-24 w-24 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-500 shadow-inner animate-pulse">
                <RefreshCw className="h-12 w-12 animate-spin" />
              </div>
            ) : pendingCount > 0 ? (
              <div className="h-24 w-24 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-500 shadow-inner">
                <CloudAlert className="h-12 w-12" />
              </div>
            ) : (
              <div className="h-24 w-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-500 shadow-inner">
                <CloudCheck className="h-12 w-12" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-black text-stone-900 mt-2">
            {!isOnline
              ? 'Sin Conexión a Internet'
              : isSyncing || loadingSync
              ? 'Sincronizando Lotes...'
              : pendingCount > 0
              ? `${pendingCount} Ventas en Cola Offline`
              : 'Todo Sincronizado'}
          </h2>

          <p className="text-xs font-medium text-stone-500 mt-1 max-w-xs">
            {!isOnline
              ? 'Las ventas se guardan seguras en tu teléfono. Se sincronizarán automáticamente al volver la señal.'
              : pendingCount > 0
              ? 'Tus movimientos están asegurados en IndexedDB y esperando confirmación del servidor.'
              : 'Todos los movimientos de esta jornada están respaldados y confirmados en la nube.'}
          </p>

          {/* Botón de Sincronización Forzada */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={!isOnline || loadingSync || isSyncing}
            className={`mt-6 w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 ${
              !isOnline
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow-amber-200'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loadingSync || isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {loadingSync || isSyncing
                ? 'Sincronizando ahora...'
                : 'Forzar Sincronización Ahora'}
            </span>
          </button>
        </div>

        {/* Detalles de la Cola */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Métricas de Conectividad
          </h3>

          <div className="divide-y divide-stone-100 text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-stone-600 font-medium">Estado de Red</span>
              <span
                className={`font-bold flex items-center gap-1.5 ${
                  isOnline ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                {isOnline ? 'Online (Conectado)' : 'Offline (Sin Red)'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-stone-600 font-medium">Pendientes en Cola</span>
              <span className="font-extrabold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg">
                {pendingCount} registros
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-stone-600 font-medium">Última Confirmación</span>
              <span className="font-bold text-stone-800">
                {formatLastSync(lastSyncTime)}
              </span>
            </div>

            {lastError && (
              <div className="py-2.5 text-rose-600 font-medium">
                Última alerta: {lastError}
              </div>
            )}
          </div>
        </div>

        {/* Tarjeta de Diagnóstico Técnico (Colapsable) */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
              <Server className="h-4 w-4 text-stone-500" />
              <span>Diagnóstico de Arquitectura (Capa 2)</span>
            </div>
            {showDiagnostics ? (
              <ChevronUp className="h-4 w-4 text-stone-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-stone-400" />
            )}
          </button>

          {showDiagnostics && (
            <div className="p-4 pt-0 border-t border-stone-100 space-y-3 text-xs bg-stone-50/50">
              <div className="flex items-start gap-2.5 pt-3">
                <Database className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-stone-800">Almacén IndexedDB</div>
                  <div className="text-stone-500 text-[11px]">
                    Base: <code>pos_paleteria_offline_db</code> (Store: <code>offline_movements</code>)
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-stone-800">Idempotencia Garantizada</div>
                  <div className="text-stone-500 text-[11px]">
                    UUID v4 generado en cliente al toque. Cero duplicados en retransmisión.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Cloud className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-stone-800">Adaptador Activo</div>
                  <div className="text-stone-500 text-[11px]">
                    <code>{backendName}</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SyncStatusScreen;

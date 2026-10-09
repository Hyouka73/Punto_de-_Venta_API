import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  MostradorScreen,
  AperturaScreen,
  CierreScreen,
  MermaScreen,
  EntradaScreen,
} from './ui';
import type { CatalogoItem, MotivoMermaId } from './domain/config/types';
import type { Movimiento } from './domain/types';
import { VisualVerifierBar } from './ui/components/VisualVerifierBar';
import { ConfigProvider, useConfig } from './state/ConfigStore';
import {
  loadSession,
  saveSession,
  computeTotalHoy,
  soldByProduct,
  stockRemaining,
  type SessionState,
} from './state/sessionStore';
import { createDataAdapter } from './adapters';
import { OfflineQueue } from './infrastructure/offline/OfflineQueue';
import { SyncWorker, type SyncWorkerStatus } from './infrastructure/offline/SyncWorker';

const PanelScreen = lazy(() => import('./ui/screens/PanelScreen'));
const SyncStatusScreen = lazy(() => import('./ui/screens/SyncStatusScreen'));
const ConfiguracionScreen = lazy(() => import('./ui/screens/ConfiguracionScreen'));
const LaboratorioScreen = lazy(() => import('./ui/screens/LaboratorioScreen'));

type ActiveView =
  | 'mostrador'
  | 'apertura'
  | 'cierre'
  | 'merma'
  | 'entrada'
  | 'panel'
  | 'sync'
  | 'config'
  | 'laboratorio';

const DISPOSITIVO_ID = 'disp-local';

const LazyFallback: React.FC = () => (
  <div className="flex h-screen w-full items-center justify-center bg-stone-50">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
  </div>
);

const AppInner: React.FC = () => {
  const config = useConfig();
  const { catalog, params, adapterMode, webappUrl } = config;

  const [currentView, setCurrentView] = useState<ActiveView>('mostrador');
  const [session, setSession] = useState<SessionState>(() =>
    loadSession(typeof window !== 'undefined' ? window.localStorage : null, params.fondo_caja_default)
  );
  const [syncStatus, setSyncStatus] = useState<Partial<SyncWorkerStatus>>({ pendingCount: 0 });

  const queueRef = useRef<OfflineQueue>(new OfflineQueue());
  const workerRef = useRef<SyncWorker | null>(null);

  // UR3: la sesión (jornada, inventario, movimientos) sobrevive a recargas
  useEffect(() => {
    saveSession(typeof window !== 'undefined' ? window.localStorage : null, session);
  }, [session]);

  // UR4: el adaptador se construye según el modo guardado; la cola envía movimientos
  useEffect(() => {
    const adapter = createDataAdapter(adapterMode, webappUrl || undefined);
    const worker = new SyncWorker({
      queue: queueRef.current,
      adapter,
      onSyncStatusChange: (s) => setSyncStatus(s),
    });
    workerRef.current = worker;
    worker.start();
    return () => worker.stop();
  }, [adapterMode, webappUrl]);

  const totalHoy = useMemo(() => computeTotalHoy(session.movimientos), [session.movimientos]);
  const sold = useMemo(() => soldByProduct(session.movimientos), [session.movimientos]);
  const stock = useMemo(
    () => stockRemaining(catalog, session.inventarioInicial, session.movimientos),
    [catalog, session.inventarioInicial, session.movimientos]
  );
  const activeCatalog = useMemo(() => catalog.filter((c) => c.activo), [catalog]);

  /** Todo movimiento nace con UUID v4 en el cliente y pasa por OfflineQueue → SyncWorker. */
  const record = useCallback((movs: Movimiento[]) => {
    setSession((prev) => ({ ...prev, movimientos: [...prev.movimientos, ...movs] }));
    movs.forEach((m) => {
      void queueRef.current.enqueue(m).then(() => workerRef.current?.triggerSync());
    });
  }, []);

  const baseMov = (): Pick<
    Movimiento,
    'jornada_id' | 'metodo_pago' | 'dispositivo_id' | 'ts_cliente' | 'estado_sincronizacion'
  > => ({
    jornada_id: session.jornadaId,
    metodo_pago: 'EFECTIVO',
    dispositivo_id: DISPOSITIVO_ID,
    ts_cliente: new Date().toISOString(),
    estado_sincronizacion: 'PENDIENTE' as Movimiento['estado_sincronizacion'],
  });

  const handleRegisterSale = (item: CatalogoItem, cantidad: number) => {
    const id = uuidv4();
    record([
      {
        ...baseMov(),
        id_mov: id,
        tipo: 'VENTA',
        categoria_id: item.id,
        cantidad,
        precio_unitario: item.precio,
        monto_total: item.precio * cantidad,
        usuario: 'mostrador',
      },
    ]);
    return id;
  };

  const handleUndoSale = (saleId: string) => {
    const sale = session.movimientos.find((m) => m.id_mov === saleId);
    if (!sale) return;
    record([
      {
        ...baseMov(),
        id_mov: uuidv4(),
        tipo: 'ANULACION',
        categoria_id: sale.categoria_id,
        cantidad: sale.cantidad,
        precio_unitario: sale.precio_unitario,
        monto_total: sale.monto_total,
        ref_mov: saleId,
        usuario: 'mostrador',
      },
    ]);
  };

  const handleConfirmApertura = (data: {
    fecha: string;
    fondoInicial: number;
    inventarioInicial: Record<string, number>;
  }) => {
    setSession({
      jornadaActiva: true,
      jornadaId: `JOR-${data.fecha}-${Date.now().toString(36).toUpperCase()}`,
      fondoInicial: data.fondoInicial,
      inventarioInicial: data.inventarioInicial,
      movimientos: [],
      entradas: {},
      mermas: {},
    });
    setCurrentView('mostrador');
  };

  const handleSaveMerma = (data: {
    categoriaId: string;
    cantidad: number;
    motivo: MotivoMermaId;
    nota?: string;
  }) => {
    setSession((prev) => ({
      ...prev,
      mermas: { ...prev.mermas, [data.categoriaId]: (prev.mermas[data.categoriaId] ?? 0) + data.cantidad },
    }));
    record([
      {
        ...baseMov(),
        id_mov: uuidv4(),
        tipo: 'MERMA',
        categoria_id: data.categoriaId,
        cantidad: data.cantidad,
        precio_unitario: 0,
        monto_total: 0,
        motivo: data.motivo,
        usuario: 'mostrador',
        nota: data.nota,
      },
    ]);
    setCurrentView('mostrador');
  };

  const handleSaveEntrada = (data: { entradas: Record<string, number>; nota?: string }) => {
    const movs: Movimiento[] = [];
    const acc: Record<string, number> = {};
    for (const [catId, cant] of Object.entries(data.entradas)) {
      if (cant > 0) {
        acc[catId] = cant;
        movs.push({
          ...baseMov(),
          id_mov: uuidv4(),
          tipo: 'ENTRADA',
          categoria_id: catId,
          cantidad: cant,
          precio_unitario: 0,
          monto_total: 0,
          usuario: 'supervisora',
          nota: data.nota,
        });
      }
    }
    setSession((prev) => {
      const entradas = { ...prev.entradas };
      for (const [k, v] of Object.entries(acc)) entradas[k] = (entradas[k] ?? 0) + v;
      return { ...prev, entradas };
    });
    record(movs);
    setCurrentView('mostrador');
  };

  const handleConfirmCierre = () => {
    setSession((prev) => ({ ...prev, jornadaActiva: false }));
  };

  const go = (v: ActiveView) => () => setCurrentView(v);

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      {currentView === 'mostrador' && (
        <MostradorScreen
          catalog={activeCatalog}
          totalHoy={totalHoy}
          pendingSyncCount={syncStatus.pendingCount ?? 0}
          jornadaActiva={session.jornadaActiva}
          stock={stock}
          sold={sold}
          adapterMode={adapterMode}
          onRegisterSale={handleRegisterSale}
          onUndoSale={handleUndoSale}
          onNavigateToApertura={go('apertura')}
          onNavigateToMerma={go('merma')}
          onNavigateToEntrada={go('entrada')}
          onNavigateToCierre={go('cierre')}
          onNavigateToPanel={go('panel')}
          onNavigateToSync={go('sync')}
        />
      )}

      {currentView === 'panel' && (
        <Suspense fallback={<LazyFallback />}>
          <PanelScreen
            movimientos={session.movimientos}
            catalog={catalog}
            onBackToMostrador={go('mostrador')}
            onNavigateToConfig={go('config')}
          />
        </Suspense>
      )}

      {currentView === 'sync' && (
        <Suspense fallback={<LazyFallback />}>
          <SyncStatusScreen
            status={{ isOnline: true, isSyncing: false, pendingCount: 0, ...syncStatus }}
            backendName={adapterMode === 'sheets' ? 'Google Sheets (Apps Script)' : undefined}
            onForceSync={async () => {
              await workerRef.current?.triggerSync();
            }}
            onBack={go('mostrador')}
          />
        </Suspense>
      )}

      {currentView === 'config' && (
        <Suspense fallback={<LazyFallback />}>
          <ConfiguracionScreen
            initialCatalog={catalog}
            initialParameters={params}
            adapterMode={adapterMode}
            webappUrl={webappUrl}
            onSaveConfig={(newCatalog, newParams, mode, url) => {
              config.replaceCatalog(newCatalog);
              config.updateParams(newParams);
              config.setAdapter(mode, url);
            }}
            onBack={go('panel')}
          />
        </Suspense>
      )}

      {currentView === 'laboratorio' && (
        <Suspense fallback={<LazyFallback />}>
          <LaboratorioScreen onBack={go('mostrador')} />
        </Suspense>
      )}

      {currentView === 'apertura' && (
        <AperturaScreen
          initialStock={session.inventarioInicial}
          defaultFondoInicial={params.fondo_caja_default}
          catalog={activeCatalog}
          onConfirmApertura={handleConfirmApertura}
          onCancel={go('mostrador')}
        />
      )}

      {currentView === 'cierre' && (
        <CierreScreen
          jornadaId={session.jornadaId}
          fondoInicial={session.fondoInicial}
          inventarioInicial={session.inventarioInicial}
          entradas={session.entradas}
          mermas={session.mermas}
          movimientos={session.movimientos}
          catalog={activeCatalog}
          onConfirmCierre={handleConfirmCierre}
          onCancel={go('mostrador')}
        />
      )}

      {currentView === 'merma' && (
        <MermaScreen catalog={activeCatalog} onSaveMerma={handleSaveMerma} onCancel={go('mostrador')} />
      )}

      {currentView === 'entrada' && (
        <EntradaScreen catalog={activeCatalog} onSaveEntrada={handleSaveEntrada} onCancel={go('mostrador')} />
      )}

      {/* Inspector de verificación visual: sólo DEV (UR9) */}
      {import.meta.env.DEV && (
        <VisualVerifierBar currentView={currentView} onSelectScreen={(screen) => setCurrentView(screen)} />
      )}
    </div>
  );
};

export const App: React.FC = () => (
  <ConfigProvider>
    <AppInner />
  </ConfigProvider>
);

export default App;

import React, { useState, lazy, Suspense } from 'react';
import {
  MostradorScreen,
  AperturaScreen,
  CierreScreen,
  MermaScreen,
  EntradaScreen,
} from './ui';
import { DEFAULT_CATALOG } from './domain/config/defaultCatalog';
import type { CatalogoItem, MotivoMermaId } from './domain/config/types';
import type { Movimiento } from './domain/types';
import { VisualVerifierBar } from './ui/components/VisualVerifierBar';

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

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ActiveView>('mostrador');
  const [jornadaActiva, setJornadaActiva] = useState<boolean>(true);
  const [jornadaId, setJornadaId] = useState<string>('JOR-2026-10-09-001');
  const [fondoInicial, setFondoInicial] = useState<number>(200);
  const [inventarioInicial, setInventarioInicial] = useState<Record<string, number>>({
    CAT_AGUA: 45,
    CAT_CREMA: 38,
    CAT_SANDWICH: 14,
    CAT_NIEVE: 10,
  });
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [entradasAcumuladas, setEntradasAcumuladas] = useState<Record<string, number>>({});
  const [mermasAcumuladas, setMermasAcumuladas] = useState<Record<string, number>>({});
  const [totalHoy, setTotalHoy] = useState<number>(0);

  // Registro de Venta desde Mostrador
  const handleRegisterSale = (item: CatalogoItem, cantidad: number) => {
    const saleId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const monto = item.precio * cantidad;

    const nuevoMov: Movimiento = {
      id_mov: saleId,
      jornada_id: jornadaId,
      tipo: 'VENTA',
      categoria_id: item.id,
      cantidad,
      precio_unitario: item.precio,
      monto_total: monto,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'disp-local',
      ts_cliente: new Date().toISOString(),
      estado_sincronizacion: 'CONFIRMADO',
    };

    setTotalHoy((prev) => prev + monto);
    setMovimientos((prev) => [...prev, nuevoMov]);
    return saleId;
  };

  // Deshacer Venta desde Mostrador
  const handleUndoSale = (saleId: string) => {
    const sale = movimientos.find((m) => m.id_mov === saleId);
    if (sale) {
      setTotalHoy((prev) => Math.max(0, prev - sale.monto_total));
      const anulaciónMov: Movimiento = {
        id_mov: `anul-${Date.now()}`,
        jornada_id: jornadaId,
        tipo: 'ANULACION',
        categoria_id: sale.categoria_id,
        cantidad: sale.cantidad,
        precio_unitario: sale.precio_unitario,
        monto_total: sale.monto_total,
        metodo_pago: sale.metodo_pago,
        ref_mov: saleId,
        usuario: 'mostrador',
        dispositivo_id: 'disp-local',
        ts_cliente: new Date().toISOString(),
        estado_sincronizacion: 'CONFIRMADO',
      };
      setMovimientos((prev) => [...prev, anulaciónMov]);
    }
  };

  // Confirmación de Apertura
  const handleConfirmApertura = (data: {
    fecha: string;
    fondoInicial: number;
    inventarioInicial: Record<string, number>;
  }) => {
    const newJorId = `JOR-${data.fecha}-${Date.now().toString(36).toUpperCase()}`;
    setJornadaId(newJorId);
    setFondoInicial(data.fondoInicial);
    setInventarioInicial(data.inventarioInicial);
    setMovimientos([]);
    setEntradasAcumuladas({});
    setMermasAcumuladas({});
    setTotalHoy(0);
    setJornadaActiva(true);
    setCurrentView('mostrador');
  };

  // Registro de Merma
  const handleSaveMerma = (data: {
    categoriaId: string;
    cantidad: number;
    motivo: MotivoMermaId;
    nota?: string;
  }) => {
    const nuevoMov: Movimiento = {
      id_mov: `merma-${Date.now()}`,
      jornada_id: jornadaId,
      tipo: 'MERMA',
      categoria_id: data.categoriaId,
      cantidad: data.cantidad,
      precio_unitario: 0,
      monto_total: 0,
      metodo_pago: 'EFECTIVO',
      motivo: data.motivo,
      usuario: 'mostrador',
      dispositivo_id: 'disp-local',
      ts_cliente: new Date().toISOString(),
      nota: data.nota,
      estado_sincronizacion: 'CONFIRMADO',
    };

    setMermasAcumuladas((prev) => ({
      ...prev,
      [data.categoriaId]: (prev[data.categoriaId] ?? 0) + data.cantidad,
    }));
    setMovimientos((prev) => [...prev, nuevoMov]);
    setCurrentView('mostrador');
  };

  // Registro de Entrada
  const handleSaveEntrada = (data: {
    entradas: Record<string, number>;
    nota?: string;
  }) => {
    const nowIso = new Date().toISOString();
    const nuevosMovs: Movimiento[] = [];

    for (const [catId, cant] of Object.entries(data.entradas)) {
      if (cant > 0) {
        nuevosMovs.push({
          id_mov: `entrada-${catId}-${Date.now()}`,
          jornada_id: jornadaId,
          tipo: 'ENTRADA',
          categoria_id: catId,
          cantidad: cant,
          precio_unitario: 0,
          monto_total: 0,
          metodo_pago: 'EFECTIVO',
          usuario: 'supervisora',
          dispositivo_id: 'disp-local',
          ts_cliente: nowIso,
          nota: data.nota,
          estado_sincronizacion: 'CONFIRMADO',
        });
        setEntradasAcumuladas((prev) => ({
          ...prev,
          [catId]: (prev[catId] ?? 0) + cant,
        }));
      }
    }

    setMovimientos((prev) => [...prev, ...nuevosMovs]);
    setCurrentView('mostrador');
  };

  // Confirmación de Cierre
  const handleConfirmCierre = () => {
    setJornadaActiva(false);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      {currentView === 'mostrador' && (
        <MostradorScreen
          catalog={DEFAULT_CATALOG}
          totalHoy={totalHoy}
          pendingSyncCount={0}
          jornadaActiva={jornadaActiva}
          onRegisterSale={handleRegisterSale}
          onUndoSale={handleUndoSale}
          onNavigateToMerma={() => setCurrentView('merma')}
          onNavigateToEntrada={() => setCurrentView('entrada')}
          onNavigateToCierre={() => setCurrentView('cierre')}
          onNavigateToPanel={() => setCurrentView('panel')}
          onNavigateToSync={() => setCurrentView('sync')}
        />
      )}

      {currentView === 'panel' && (
        <Suspense
          fallback={
            <div className="flex h-screen w-full items-center justify-center bg-stone-50">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                <span className="text-xs font-bold text-stone-500">Cargando Panel Ejecutivo...</span>
              </div>
            </div>
          }
        >
          <PanelScreen
            movimientos={movimientos}
            catalog={DEFAULT_CATALOG}
            onBackToMostrador={() => setCurrentView('mostrador')}
            onNavigateToConfig={() => setCurrentView('config')}
          />
        </Suspense>
      )}

      {currentView === 'sync' && (
        <Suspense
          fallback={
            <div className="flex h-screen w-full items-center justify-center bg-stone-50">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          }
        >
          <SyncStatusScreen
            status={{
              isOnline: true,
              isSyncing: false,
              pendingCount: 0,
            }}
            onBack={() => setCurrentView('mostrador')}
          />
        </Suspense>
      )}

      {currentView === 'config' && (
        <Suspense
          fallback={
            <div className="flex h-screen w-full items-center justify-center bg-stone-50">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          }
        >
          <ConfiguracionScreen onBack={() => setCurrentView('panel')} />
        </Suspense>
      )}

      {currentView === 'laboratorio' && (
        <Suspense
          fallback={
            <div className="flex h-screen w-full items-center justify-center bg-stone-50">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          }
        >
          <LaboratorioScreen onBack={() => setCurrentView('mostrador')} />
        </Suspense>
      )}

      {currentView === 'apertura' && (
        <AperturaScreen
          initialStock={inventarioInicial}
          defaultFondoInicial={fondoInicial}
          catalog={DEFAULT_CATALOG}
          onConfirmApertura={handleConfirmApertura}
          onCancel={() => setCurrentView('mostrador')}
        />
      )}

      {currentView === 'cierre' && (
        <CierreScreen
          jornadaId={jornadaId}
          fondoInicial={fondoInicial}
          inventarioInicial={inventarioInicial}
          entradas={entradasAcumuladas}
          mermas={mermasAcumuladas}
          movimientos={movimientos}
          catalog={DEFAULT_CATALOG}
          onConfirmCierre={handleConfirmCierre}
          onCancel={() => setCurrentView('mostrador')}
        />
      )}

      {currentView === 'merma' && (
        <MermaScreen
          catalog={DEFAULT_CATALOG}
          onSaveMerma={handleSaveMerma}
          onCancel={() => setCurrentView('mostrador')}
        />
      )}

      {currentView === 'entrada' && (
        <EntradaScreen
          catalog={DEFAULT_CATALOG}
          onSaveEntrada={handleSaveEntrada}
          onCancel={() => setCurrentView('mostrador')}
        />
      )}

      {/* Inspector Flotante de Verificación Visual E2E (Permite auditar las 9 pantallas) */}
      <VisualVerifierBar
        currentView={currentView}
        onSelectScreen={(screen) => setCurrentView(screen)}
      />
    </div>
  );
};

export default App;

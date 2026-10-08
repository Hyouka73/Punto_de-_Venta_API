import React, { useState } from 'react';
import { MostradorScreen } from './ui/screens/MostradorScreen';
import { DEFAULT_CATALOG } from './domain/config/defaultCatalog';
import type { CatalogoItem } from './domain/config/types';

export const App: React.FC = () => {
  const [totalHoy, setTotalHoy] = useState<number>(0);
  const [salesHistory, setSalesHistory] = useState<Array<{ id: string; monto: number }>>([]);

  const handleRegisterSale = (item: CatalogoItem, cantidad: number) => {
    const saleId = `sale-${Date.now()}`;
    const monto = item.precio * cantidad;

    setTotalHoy((prev) => prev + monto);
    setSalesHistory((prev) => [...prev, { id: saleId, monto }]);
    return saleId;
  };

  const handleUndoSale = (saleId: string) => {
    const sale = salesHistory.find((s) => s.id === saleId);
    if (sale) {
      setTotalHoy((prev) => Math.max(0, prev - sale.monto));
      setSalesHistory((prev) => prev.filter((s) => s.id !== saleId));
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <MostradorScreen
        catalog={DEFAULT_CATALOG}
        totalHoy={totalHoy}
        pendingSyncCount={0}
        jornadaActiva={true}
        onRegisterSale={handleRegisterSale}
        onUndoSale={handleUndoSale}
        onNavigateToMerma={() => alert('Navegar a Merma')}
        onNavigateToEntrada={() => alert('Navegar a Entrada')}
        onNavigateToCierre={() => alert('Navegar a Cierre')}
      />
    </div>
  );
};

export default App;

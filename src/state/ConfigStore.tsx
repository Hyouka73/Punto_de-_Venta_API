import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { CatalogoItem, ParametrosNegocio } from '@/domain/config/types';
import {
  configReducer,
  loadConfigState,
  persistConfigState,
  type AdapterMode,
  type ConfigState,
} from './configReducer';

export interface ConfigContextValue extends ConfigState {
  addProduct: (item: Omit<CatalogoItem, 'orden' | 'id'> & { id?: string }) => void;
  updateProduct: (id: string, patch: Partial<CatalogoItem>) => void;
  removeProduct: (id: string) => void;
  reorder: (id: string, direction: -1 | 1) => void;
  updateParams: (patch: Partial<ParametrosNegocio>) => void;
  setAdapter: (mode: AdapterMode, webappUrl: string) => void;
  replaceCatalog: (catalog: readonly CatalogoItem[]) => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

const browserStorage = () => (typeof window !== 'undefined' ? window.localStorage : null);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(configReducer, null, () => loadConfigState(browserStorage()));

  // UR3: cada cambio se persiste de inmediato
  useEffect(() => {
    persistConfigState(browserStorage(), state);
  }, [state]);

  const value = useMemo<ConfigContextValue>(
    () => ({
      ...state,
      addProduct: (item) => dispatch({ type: 'ADD_PRODUCT', item }),
      updateProduct: (id, patch) => dispatch({ type: 'UPDATE_PRODUCT', id, patch }),
      removeProduct: (id) => dispatch({ type: 'REMOVE_PRODUCT', id }),
      reorder: (id, direction) => dispatch({ type: 'REORDER', id, direction }),
      updateParams: (patch) => dispatch({ type: 'UPDATE_PARAMS', patch }),
      setAdapter: (mode, webappUrl) => dispatch({ type: 'SET_ADAPTER', mode, webappUrl }),
      replaceCatalog: (catalog) => dispatch({ type: 'SET_CATALOG', catalog }),
    }),
    [state]
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig debe usarse dentro de <ConfigProvider>');
  return ctx;
}

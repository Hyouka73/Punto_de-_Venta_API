import type { CatalogoItem, ParametrosNegocio } from '@/domain/config/types';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '@/domain/config/parameters';

export type AdapterMode = 'mock' | 'sheets';

export interface ConfigState {
  readonly catalog: readonly CatalogoItem[];
  readonly params: ParametrosNegocio;
  readonly adapterMode: AdapterMode;
  readonly webappUrl: string;
}

export const LS_KEYS = {
  catalog: 'pos_catalog',
  params: 'pos_params',
  adapterMode: 'pos_adapter_mode',
  webappUrl: 'pos_webapp_url',
} as const;

export type ConfigAction =
  | { type: 'SET_CATALOG'; catalog: readonly CatalogoItem[] }
  | { type: 'ADD_PRODUCT'; item: Omit<CatalogoItem, 'orden' | 'id'> & { id?: string } }
  | { type: 'UPDATE_PRODUCT'; id: string; patch: Partial<CatalogoItem> }
  | { type: 'REMOVE_PRODUCT'; id: string }
  | { type: 'REORDER'; id: string; direction: -1 | 1 }
  | { type: 'UPDATE_PARAMS'; patch: Partial<ParametrosNegocio> }
  | { type: 'SET_ADAPTER'; mode: AdapterMode; webappUrl: string };

export function slugId(nombre: string, prefix: string, existing: readonly string[]): string {
  const base = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'ITEM';
  let id = `${prefix}_${base}`;
  let n = 2;
  while (existing.includes(id)) id = `${prefix}_${base}_${n++}`;
  return id;
}

function normalizeOrder(items: readonly CatalogoItem[]): CatalogoItem[] {
  return [...items]
    .sort((a, b) => a.orden - b.orden)
    .map((it, i) => ({ ...it, orden: i + 1 }));
}

export function configReducer(state: ConfigState, action: ConfigAction): ConfigState {
  switch (action.type) {
    case 'SET_CATALOG':
      return { ...state, catalog: normalizeOrder(action.catalog) };
    case 'ADD_PRODUCT': {
      const prefix = action.item.es_combo ? 'CMB' : 'CAT';
      const id =
        action.item.id ?? slugId(action.item.nombre, prefix, state.catalog.map((c) => c.id));
      const item: CatalogoItem = {
        ...action.item,
        id,
        orden: state.catalog.length + 1,
      };
      return { ...state, catalog: normalizeOrder([...state.catalog, item]) };
    }
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        catalog: state.catalog.map((c) => (c.id === action.id ? { ...c, ...action.patch, id: c.id } : c)),
      };
    case 'REMOVE_PRODUCT':
      // Borrado lógico: nunca se pierde el historial de movimientos
      return {
        ...state,
        catalog: state.catalog.map((c) => (c.id === action.id ? { ...c, activo: false } : c)),
      };
    case 'REORDER': {
      const sorted = normalizeOrder(state.catalog);
      const idx = sorted.findIndex((c) => c.id === action.id);
      const j = idx + action.direction;
      if (idx < 0 || j < 0 || j >= sorted.length) return state;
      const a = sorted[idx];
      const b = sorted[j];
      if (!a || !b) return state;
      sorted[idx] = { ...b, orden: a.orden };
      sorted[j] = { ...a, orden: b.orden };
      return { ...state, catalog: normalizeOrder(sorted) };
    }
    case 'UPDATE_PARAMS':
      return { ...state, params: { ...state.params, ...action.patch } };
    case 'SET_ADAPTER':
      return { ...state, adapterMode: action.mode, webappUrl: action.webappUrl };
    default:
      return state;
  }
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function readJson<T>(storage: StorageLike | null, key: string): T | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Hidratación: localStorage → DEFAULT_* (semilla de primera ejecución). */
export function loadConfigState(storage: StorageLike | null): ConfigState {
  const catalog = readJson<CatalogoItem[]>(storage, LS_KEYS.catalog);
  const params = readJson<ParametrosNegocio>(storage, LS_KEYS.params);
  const mode = storage?.getItem(LS_KEYS.adapterMode);
  return {
    catalog: catalog && catalog.length > 0 ? normalizeOrder(catalog) : normalizeOrder(DEFAULT_CATALOG),
    params: params ? { ...DEFAULT_PARAMETERS, ...params } : DEFAULT_PARAMETERS,
    adapterMode: mode === 'sheets' ? 'sheets' : 'mock',
    webappUrl: storage?.getItem(LS_KEYS.webappUrl) ?? '',
  };
}

export function persistConfigState(storage: StorageLike | null, state: ConfigState): void {
  if (!storage) return;
  try {
    storage.setItem(LS_KEYS.catalog, JSON.stringify(state.catalog));
    storage.setItem(LS_KEYS.params, JSON.stringify(state.params));
    storage.setItem(LS_KEYS.adapterMode, state.adapterMode);
    storage.setItem(LS_KEYS.webappUrl, state.webappUrl);
  } catch {
    /* cuota llena o modo privado: se ignora */
  }
}

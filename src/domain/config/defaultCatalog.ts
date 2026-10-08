import type { CatalogoItem } from './types';

/**
 * Catálogo base predeterminado del POS Paletería v2.
 * Refleja fielmente las categorías base y combos de la Fase 0.
 */
export const DEFAULT_CATALOG: readonly CatalogoItem[] = [
  {
    id: 'CAT_AGUA',
    nombre: 'Paleta de Agua',
    precio: 15,
    costo: 6,
    icono: 'droplets',
    color: '#38BDF8',
    orden: 1,
    activo: true,
    controla_stock: true,
    es_combo: false,
  },
  {
    id: 'CAT_CREMA',
    nombre: 'Paleta de Crema',
    precio: 20,
    costo: 9,
    icono: 'ice-cream',
    color: '#FDE047',
    orden: 2,
    activo: true,
    controla_stock: true,
    es_combo: false,
  },
  {
    id: 'CAT_SANDWICH',
    nombre: 'Sándwich Helado',
    precio: 25,
    costo: 12,
    icono: 'cookie',
    color: '#F59E0B',
    orden: 3,
    activo: true,
    controla_stock: true,
    es_combo: false,
  },
  {
    id: 'CAT_NIEVE',
    nombre: 'Nieve (Vaso)',
    precio: 18,
    costo: 7,
    icono: 'sparkles',
    color: '#FB7185',
    orden: 4,
    activo: true,
    controla_stock: true,
    es_combo: false,
  },
  {
    id: 'CMB_DUO',
    nombre: 'Combo Dúo (Agua + Crema)',
    precio: 32,
    costo: 15, // Costo suma de componentes ($6 + $9)
    icono: 'sparkles',
    color: '#A855F7',
    orden: 5,
    activo: true,
    controla_stock: false, // Descuenta stock mediante la expansión de componentes
    es_combo: true,
    componentes: [
      { id: 'CAT_AGUA', cant: 1, cantidad: 1 },
      { id: 'CAT_CREMA', cant: 1, cantidad: 1 },
    ],
  },
] as const;

/**
 * Mapa de acceso rápido O(1) indexado por ID de categoría o combo
 */
export const DEFAULT_CATALOG_MAP: Readonly<Record<string, CatalogoItem>> = Object.freeze(
  DEFAULT_CATALOG.reduce<Record<string, CatalogoItem>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {})
);

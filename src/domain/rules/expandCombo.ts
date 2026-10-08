import type { CatalogoItem } from '../config/types';

export interface ComponenteExpandido {
  readonly categoriaId: string;
  readonly cantidad: number;
}

/**
 * Expande un ítem del catálogo (categoría simple o combo) en sus componentes base
 * para el correcto descuento de inventario (R4).
 *
 * @param itemId ID de la categoría o combo vendido
 * @param cantidad Cantidad de unidades vendidas (por defecto 1)
 * @param catalogo Lista o mapa del catálogo de productos
 * @returns Lista de componentes con sus cantidades totales
 */
export function expandCombo(
  itemId: string,
  cantidad: number = 1,
  catalogo: readonly CatalogoItem[] | Readonly<Record<string, CatalogoItem>>
): ComponenteExpandido[] {
  if (cantidad <= 0) return [];

  const catalogMap: Record<string, CatalogoItem> = Array.isArray(catalogo)
    ? catalogo.reduce<Record<string, CatalogoItem>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {})
    : (catalogo as Record<string, CatalogoItem>);

  const item = catalogMap[itemId];
  if (!item) {
    // Si no se encuentra en el catálogo, se asume categoría simple por compatibilidad
    return [{ categoriaId: itemId, cantidad }];
  }

  if (item.es_combo && item.componentes && item.componentes.length > 0) {
    return item.componentes.map((comp) => {
      const cantPorUnidad = comp.cant ?? comp.cantidad ?? 1;
      return {
        categoriaId: comp.id,
        cantidad: cantPorUnidad * cantidad,
      };
    });
  }

  return [{ categoriaId: item.id, cantidad }];
}

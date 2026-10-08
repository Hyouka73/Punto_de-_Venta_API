import { describe, it, expect } from 'vitest';
import { DEFAULT_CATALOG } from '@/domain/config/defaultCatalog';
import { DEFAULT_PARAMETERS } from '@/domain/config/parameters';

describe('Verificación del Entorno F1.1 (Smoke Test)', () => {
  it('debe tener el catálogo por defecto cargado con 5 ítems base', () => {
    expect(DEFAULT_CATALOG).toBeDefined();
    expect(DEFAULT_CATALOG.length).toBe(5);
  });

  it('debe contener los parámetros del negocio correctamente definidos', () => {
    expect(DEFAULT_PARAMETERS.tolerancia_verde).toBe(15);
    expect(DEFAULT_PARAMETERS.tolerancia_ambar).toBe(30);
    expect(DEFAULT_PARAMETERS.ventana_deshacer_min).toBe(10);
    expect(DEFAULT_PARAMETERS.fondo_caja_default).toBe(200);
  });
});

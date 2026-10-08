import { describe, it, expect } from 'vitest';
import type {
  Movimiento,
  Jornada,
  CierreDetalle,
  CierreResumen,
  TipoMovimiento,
  MetodoPago,
  SemaforoCierre,
} from '@/domain/types';

describe('Modelo de Datos e Interfaces de Dominio (F1.2)', () => {
  it('debe construir un objeto Movimiento inmutable conforme a la especificación', () => {
    const mov: Movimiento = {
      id_mov: '123e4567-e89b-12d3-a456-426614174000',
      jornada_id: 'JOR-2026-10-08-01',
      tipo: 'VENTA',
      categoria_id: 'CAT_AGUA',
      cantidad: 2,
      precio_unitario: 15,
      monto_total: 30,
      metodo_pago: 'EFECTIVO',
      usuario: 'mostrador',
      dispositivo_id: 'DISP-01',
      ts_cliente: '2026-10-08T10:00:00.000Z',
    };

    expect(mov.id_mov).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(mov.tipo).toBe('VENTA');
    expect(mov.monto_total).toBe(30);
  });

  it('debe admitir todos los tipos de movimiento del dominio', () => {
    const tiposValidos: TipoMovimiento[] = [
      'VENTA',
      'ANULACION',
      'MERMA',
      'ENTRADA',
      'AJUSTE',
      'RECONSTRUCCION',
      'APERTURA',
    ];

    expect(tiposValidos.length).toBe(7);
  });

  it('debe admitir los métodos de pago y semáforos definidos', () => {
    const metodos: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA'];
    const semaforos: SemaforoCierre[] = ['VERDE', 'AMBAR', 'ROJO'];

    expect(metodos).toContain('EFECTIVO');
    expect(semaforos).toContain('VERDE');
  });

  it('debe estructurar una Jornada y CierreResumen completos', () => {
    const jornada: Jornada = {
      id: 'JOR-001',
      fecha: '2026-10-08',
      estado: 'ABIERTA',
      ts_apertura: '2026-10-08T08:00:00.000Z',
      fondo_inicial: 200,
      usuario_apertura: 'supervisora',
      inventario_inicial: {
        CAT_AGUA: 50,
        CAT_CREMA: 40,
      },
    };

    const detalle: CierreDetalle = {
      categoria_id: 'CAT_AGUA',
      categoria_nombre: 'Paleta de Agua',
      apertura: 50,
      entradas: 10,
      mermas: 2,
      restantes_fisicos: 20,
      piezas_conteo: 38,
      piezas_toques: 35,
      discrepancia_piezas: 3,
      precio_unitario: 15,
      dinero_esperado: 525,
      propuesta_reconstruccion: 3,
    };

    const resumen: CierreResumen = {
      jornada_id: jornada.id,
      fecha: jornada.fecha,
      ts_cierre: '2026-10-08T20:00:00.000Z',
      usuario_cierre: 'supervisora',
      fondo_inicial: 200,
      efectivo_contado: 725,
      efectivo_neto: 525,
      ventas_efectivo: 525,
      ventas_transferencia: 0,
      reconstrucciones_total: 0,
      dinero_esperado: 525,
      diferencia_final: 0,
      semaforo: 'VERDE',
      detalles_por_categoria: [detalle],
      explicaciones: ['Cierre perfecto sin diferencias'],
      total_piezas_conteo: 38,
      total_piezas_toques: 35,
      total_mermas: 2,
      total_consumo_casa: 0,
    };

    expect(resumen.semaforo).toBe('VERDE');
    expect(resumen.diferencia_final).toBe(0);
    expect(resumen.detalles_por_categoria[0]?.discrepancia_piezas).toBe(3);
  });
});

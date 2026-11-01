import { describe, expect, it } from 'vitest';
import {
  aprendido, escalonDe, estadoVacio, migrarAprendizaje, registrarEscalon, registrarRespuesta, regionSuperada,
} from '../src/logic/progreso';
import { validarEstado } from '../src/logic/almacen';
import type { Pais } from '../src/logic/types';

const pais = (id: string): Pais => ({
  id, isoNumerico: null, nombre: id, capital: id, variantes: [], antiguos: [],
  continentes: ['europa'], region: 'r', capitalCoords: [0, 0], opcional: false, trucos: [],
});

describe('escalones de aprendizaje', () => {
  it('sin empezar: Elegir', () => {
    expect(escalonDe(estadoVacio(), 'A')).toBe('elegir');
  });

  it('dos aciertos suben de escalón; cuatro escalones y queda aprendido', () => {
    const e = estadoVacio();
    const pasos = ['elegir', 'colocar', 'escribir', 'mapamudo'] as const;
    for (const [i, modo] of pasos.entries()) {
      expect(escalonDe(e, 'A')).toBe(modo);
      expect(registrarEscalon(e, 'A', modo, 'acierto')).toEqual({ subio: false, aprendido: false });
      const r = registrarEscalon(e, 'A', modo, 'acierto');
      expect(r.subio).toBe(true);
      expect(r.aprendido).toBe(i === 3);
    }
    expect(aprendido(e, 'A')).toBe(true);
    expect(escalonDe(e, 'A')).toBeNull();
  });

  it('un fallo reinicia el contador pero no baja de escalón', () => {
    const e = estadoVacio();
    registrarEscalon(e, 'A', 'elegir', 'acierto');
    registrarEscalon(e, 'A', 'elegir', 'acierto'); // sube a colocar
    registrarEscalon(e, 'A', 'colocar', 'acierto');
    registrarEscalon(e, 'A', 'colocar', 'fallo');
    expect(escalonDe(e, 'A')).toBe('colocar');
    expect(registrarEscalon(e, 'A', 'colocar', 'acierto').subio).toBe(false); // empieza de cero
    expect(registrarEscalon(e, 'A', 'colocar', 'acierto').subio).toBe(true);
  });

  it('solo cuentan las respuestas en el modo del escalón (Colocar admite Al revés); la errata no cuenta', () => {
    const e = estadoVacio();
    registrarEscalon(e, 'A', 'escribir', 'acierto');
    registrarEscalon(e, 'A', 'escribir', 'acierto');
    expect(escalonDe(e, 'A')).toBe('elegir');
    registrarEscalon(e, 'A', 'elegir', 'acierto');
    registrarEscalon(e, 'A', 'elegir', 'acierto');
    registrarEscalon(e, 'A', 'alreves', 'acierto');
    registrarEscalon(e, 'A', 'alreves', 'repasar');
    expect(escalonDe(e, 'A')).toBe('colocar');
    registrarEscalon(e, 'A', 'alreves', 'acierto');
    expect(escalonDe(e, 'A')).toBe('escribir');
  });

  it('región superada cuando todos sus países llegan a Escribir', () => {
    const e = estadoVacio();
    const ps = [pais('A'), pais('B')];
    for (const id of ['A', 'B']) {
      for (const modo of ['elegir', 'colocar'] as const) {
        registrarEscalon(e, id, modo, 'acierto');
        registrarEscalon(e, id, modo, 'acierto');
      }
    }
    expect(regionSuperada(e, ps)).toBe(true);
    expect(regionSuperada(e, [...ps, pais('C')])).toBe(false);
  });
});

describe('migración del progreso v1', () => {
  it('dominado → aprendido; en repaso → Escribir; aprendiendo → Colocar', () => {
    const e = estadoVacio();
    const t0 = new Date('2026-11-01T10:00:00Z').getTime();
    // A: aprendiendo (un acierto)
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 3000, new Date(t0));
    // B: en repaso (dos aciertos)
    registrarRespuesta(e, 'B', 'elegir', 'acierto', 3000, new Date(t0));
    registrarRespuesta(e, 'B', 'elegir', 'acierto', 3000, new Date(t0 + 15 * 60000));
    // C: dominado (muchos aciertos espaciados)
    let t = t0;
    for (let i = 0; i < 10; i++) {
      registrarRespuesta(e, 'C', 'escribir', 'acierto', 6000, new Date(t));
      t = Math.max(t + 60000, new Date(e.tarjetas.C.due).getTime());
    }
    const m = migrarAprendizaje(e.tarjetas);
    expect(m.A).toEqual({ escalon: 1, aciertos: 0, aprendido: false });
    expect(m.B).toEqual({ escalon: 2, aciertos: 0, aprendido: false });
    expect(m.C.aprendido).toBe(true);
    // Al cargar un estado v1 sin escalones, se convierte solo.
    const cargado = validarEstado(JSON.parse(JSON.stringify({ version: 1, tarjetas: e.tarjetas })))!;
    expect(cargado.aprendizaje).toEqual(m);
    expect(cargado.prioridad).toEqual([]);
  });
});

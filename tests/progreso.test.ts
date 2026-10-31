import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { deducirNota } from '../src/logic/nota';
import {
  estadoVacio, modoSegunDominio, nivelDominio, registrarRespuesta, regionDominada,
  regionesDesbloqueadas, regionSuperada, type EstadoProgreso,
} from '../src/logic/progreso';
import { crearSesion } from '../src/logic/sesionDiaria';
import { Almacen, validarEstado, type AlmacenTexto } from '../src/logic/almacen';
import { rngConSemilla } from '../src/logic/rng';
import type { Pais, Region } from '../src/logic/types';

const pais = (id: string, region = 'r1'): Pais => ({
  id, isoNumerico: null, nombre: id, capital: id, variantes: [], antiguos: [],
  continentes: ['europa'], region, capitalCoords: [0, 0], opcional: false, trucos: [],
});
const D = (s: string) => new Date(s);
const DIA = 86400000;

describe('deducirNota', () => {
  it('fallo, errata, lento, normal y rápido', () => {
    expect(deducirNota({ modo: 'elegir', resultado: 'fallo', tiempoMs: 1000 })).toBe(Rating.Again);
    expect(deducirNota({ modo: 'escribir', resultado: 'repasar', tiempoMs: 1000 })).toBe(Rating.Hard);
    expect(deducirNota({ modo: 'elegir', resultado: 'acierto', tiempoMs: 60000 })).toBe(Rating.Hard);
    expect(deducirNota({ modo: 'elegir', resultado: 'acierto', tiempoMs: 4000 })).toBe(Rating.Good);
    expect(deducirNota({ modo: 'escribir', resultado: 'acierto', tiempoMs: 3000 })).toBe(Rating.Easy);
    expect(deducirNota({ modo: 'alreves', resultado: 'acierto', tiempoMs: 2000 })).toBe(Rating.Easy);
  });
  it('en elegir y colocar, como máximo Good aunque sea rapidísimo', () => {
    expect(deducirNota({ modo: 'elegir', resultado: 'acierto', tiempoMs: 300 })).toBe(Rating.Good);
    expect(deducirNota({ modo: 'colocar', resultado: 'acierto', tiempoMs: 300 })).toBe(Rating.Good);
  });
});

describe('registrarRespuesta y dominio', () => {
  it('crea la tarjeta, avanza niveles y guarda historial', () => {
    const e = estadoVacio();
    expect(nivelDominio(e.tarjetas.A)).toBe(0);
    expect(modoSegunDominio(e.tarjetas.A)).toBe('elegir');
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 3000, D('2026-11-01T10:00:00Z'));
    expect(nivelDominio(e.tarjetas.A)).toBe(1); // aprendiendo
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 3000, D('2026-11-01T10:15:00Z'));
    expect(nivelDominio(e.tarjetas.A)).toBe(2); // en repaso
    expect(modoSegunDominio(e.tarjetas.A)).toBe('alreves');
    // Varios repasos buenos espaciados: llega a dominado.
    let t = new Date(e.tarjetas.A.due).getTime();
    for (let i = 0; i < 6 && nivelDominio(e.tarjetas.A) < 3; i++) {
      registrarRespuesta(e, 'A', 'escribir', 'acierto', 6000, new Date(t));
      t = new Date(e.tarjetas.A.due).getTime();
    }
    expect(nivelDominio(e.tarjetas.A)).toBe(3);
    expect(modoSegunDominio(e.tarjetas.A)).toBe('escribir');
    expect(e.historial.length).toBeGreaterThanOrEqual(3);
    expect(e.historial[0]).toMatchObject({ pais: 'A', modo: 'elegir', res: 'acierto', nota: Rating.Good });
  });

  it('un fallo en un país dominado lo devuelve a aprendiendo', () => {
    const e = estadoVacio();
    let t = D('2026-11-01T10:00:00Z').getTime();
    for (let i = 0; i < 10 && nivelDominio(e.tarjetas.A) < 3; i++) {
      registrarRespuesta(e, 'A', 'escribir', 'acierto', 6000, new Date(t));
      t = new Date(e.tarjetas.A.due).getTime();
    }
    registrarRespuesta(e, 'A', 'escribir', 'fallo', 6000, new Date(t));
    expect(nivelDominio(e.tarjetas.A)).toBe(1);
    expect(modoSegunDominio(e.tarjetas.A)).toBe('elegir');
  });

  it('modo examen: los fallos no tocan FSRS, los aciertos sí', () => {
    const e = estadoVacio();
    registrarRespuesta(e, 'A', 'elegir', 'fallo', 1000, D('2026-11-01T10:00:00Z'), { examen: true });
    expect(e.tarjetas.A).toBeUndefined();
    expect(e.historial[0].examen).toBe(true);
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 1000, D('2026-11-01T10:01:00Z'), { examen: true });
    expect(e.tarjetas.A.reps).toBe(1);
  });

  it('el historial no crece sin límite', () => {
    const e = estadoVacio();
    for (let i = 0; i < 3100; i++) registrarRespuesta(e, 'A', 'elegir', 'acierto', 1000, new Date(Date.UTC(2026, 10, 1) + i * 60000));
    expect(e.historial.length).toBe(3000);
  });
});

function aprender(e: EstadoProgreso, id: string, hasta: 2 | 3, desde = D('2026-11-01T10:00:00Z')) {
  let t = desde.getTime();
  for (let i = 0; i < 12 && nivelDominio(e.tarjetas[id]) < hasta; i++) {
    registrarRespuesta(e, id, 'escribir', 'acierto', 6000, new Date(t));
    t = Math.max(t + 60000, new Date(e.tarjetas[id].due).getTime());
  }
}

describe('regiones', () => {
  const r1 = [pais('A'), pais('B')];
  const r2 = [pais('C', 'r2')];
  const r3 = [pais('D', 'r3')];
  const regiones: Region[] = [
    { id: 'r2', nombre: '2', continente: 'europa', orden: 2, color: '' },
    { id: 'r1', nombre: '1', continente: 'europa', orden: 1, color: '' },
    { id: 'r3', nombre: '3', continente: 'europa', orden: 3, color: '' },
  ];
  const paisesDe = (id: string) => ({ r1, r2, r3 })[id as 'r1'];

  it('solo la primera abierta al principio; la siguiente al superar la anterior', () => {
    const e = estadoVacio();
    expect([...regionesDesbloqueadas(e, regiones, paisesDe)]).toEqual(['r1']);
    aprender(e, 'A', 2);
    expect(regionSuperada(e, r1)).toBe(false);
    aprender(e, 'B', 2);
    expect(regionSuperada(e, r1)).toBe(true);
    expect([...regionesDesbloqueadas(e, regiones, paisesDe)]).toEqual(['r1', 'r2']);
  });

  it('región dominada cuando todos sus países lo están', () => {
    const e = estadoVacio();
    aprender(e, 'A', 3);
    expect(regionDominada(e, r1)).toBe(false);
    aprender(e, 'B', 3);
    expect(regionDominada(e, r1)).toBe(true);
    expect(regionDominada(e, [])).toBe(false);
  });
});

describe('crearSesion', () => {
  const region = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((x) => pais(x));
  const otra = ['X', 'Y'].map((x) => pais(x, 'r0'));
  const ahora = D('2026-11-10T10:00:00Z');

  it('sin progreso: solo nuevas, como mucho maxNuevas', () => {
    const s = crearSesion({ estado: estadoVacio(), region, desbloqueados: region, ahora, rng: rngConSemilla(1), maxNuevas: 5 });
    expect(s).toHaveLength(5);
    expect(new Set(s).size).toBe(5);
  });

  it('vencidas primero (también de otras regiones), luego nuevas, luego adelantadas', () => {
    const e = estadoVacio();
    registrarRespuesta(e, 'X', 'elegir', 'acierto', 3000, new Date(ahora.getTime() - 5 * DIA));
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 3000, new Date(ahora.getTime() - 2 * DIA));
    registrarRespuesta(e, 'B', 'elegir', 'acierto', 3000, new Date(ahora.getTime() - 60000)); // vence en 10 min
    const s = crearSesion({ estado: e, region, desbloqueados: [...otra, ...region], ahora, rng: rngConSemilla(2), maxNuevas: 3 });
    expect(s.slice(0, 2)).toEqual(['X', 'A']); // X más atrasada
    const nuevas = s.slice(2, 5);
    for (const n of nuevas) expect(['C', 'D', 'E', 'F', 'G', 'H']).toContain(n);
    expect(s[5]).toBe('B'); // adelantada
    expect(s).toHaveLength(6);
  });

  it('respeta el tamaño máximo', () => {
    const e = estadoVacio();
    for (const p of region) registrarRespuesta(e, p.id, 'elegir', 'acierto', 3000, new Date(ahora.getTime() - 3 * DIA));
    const s = crearSesion({ estado: e, region, desbloqueados: region, ahora, rng: rngConSemilla(3), tam: 4 });
    expect(s).toHaveLength(4);
  });
});

class Memoria implements AlmacenTexto {
  datos = new Map<string, string>();
  fallarAlGuardar = false;
  getItem(k: string) { return this.datos.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.fallarAlGuardar) throw new Error('lleno'); this.datos.set(k, v); }
  removeItem(k: string) { this.datos.delete(k); }
}

describe('Almacen', () => {
  it('guarda y carga', () => {
    const m = new Memoria();
    const a = new Almacen(m);
    const e = estadoVacio();
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 3000, D('2026-11-01T10:00:00Z'));
    expect(a.guardar(e)).toBe(true);
    expect(new Almacen(m).cargar()).toEqual(e);
  });

  it('sin almacenamiento: funciona en memoria', () => {
    const a = new Almacen(null);
    expect(a.disponible).toBe(false);
    expect(a.cargar()).toEqual(estadoVacio());
    expect(a.guardar(estadoVacio())).toBe(false);
  });

  it('si falla al guardar, lo indica y no rompe', () => {
    const m = new Memoria();
    m.fallarAlGuardar = true;
    const a = new Almacen(m);
    expect(a.guardar(estadoVacio())).toBe(false);
    expect(a.disponible).toBe(false);
  });

  it('datos ilegibles: empieza de cero y aparta una copia', () => {
    const m = new Memoria();
    m.datos.set('progreso-capitales', '{roto');
    expect(new Almacen(m).cargar()).toEqual(estadoVacio());
    expect(m.datos.get('progreso-capitales-ilegible')).toBe('{roto');
  });

  it('validarEstado completa campos que falten', () => {
    const e = validarEstado({ version: 1, tarjetas: {} });
    expect(e).toEqual(estadoVacio());
    expect(validarEstado({ version: 2, tarjetas: {} })).toBeNull();
    expect(validarEstado(null)).toBeNull();
  });
});

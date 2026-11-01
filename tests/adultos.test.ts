import { describe, expect, it } from 'vitest';
import {
  actividadReciente, comprobarPin, diasHastaExamen, dominioPorRegion, hashPin, paisesAtascados,
  pinValido, regionesConExamen, seleccionarExamen,
} from '../src/logic/adultos';
import { estadoVacio, nivelDominio, registrarRespuesta } from '../src/logic/progreso';
import type { Pais, Region } from '../src/logic/types';

const pais = (id: string, region = 'r1', extra?: string[]): Pais => ({
  id, isoNumerico: null, nombre: id, capital: id, variantes: [], antiguos: [], continentes: ['europa'],
  region, ...(extra ? { regionesExtra: extra } : {}), capitalCoords: [0, 0], opcional: false, trucos: [],
});
const D = (s: string) => new Date(s);

describe('PIN', () => {
  it('formato: 4 a 6 cifras', () => {
    expect(['1234', '123456'].every(pinValido)).toBe(true);
    expect(['123', '1234567', 'abcd', '12 34'].some(pinValido)).toBe(false);
  });
  it('hash y comprobación', async () => {
    const h = await hashPin('2468');
    expect(h).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(h).not.toContain('2468');
    expect(await comprobarPin('2468', h)).toBe(true);
    expect(await comprobarPin('2469', h)).toBe(false);
    expect(await comprobarPin('2468', null)).toBe(false);
  });
});

describe('estadísticas', () => {
  const r1: Region = { id: 'r1', nombre: 'Uno', continente: 'europa', orden: 1, color: '' };
  const r2: Region = { id: 'r2', nombre: 'Dos', continente: 'asia', orden: 1, color: '' };
  const paises = [pais('A'), pais('B'), pais('C', 'r2')];

  it('dominio por región', () => {
    const e = estadoVacio();
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 3000, D('2026-11-01T10:00:00Z'));
    const d = dominioPorRegion(e, [r2, r1], (id) => paises.filter((p) => p.region === id));
    expect(d.map((x) => x.region.id)).toEqual(['r1', 'r2']); // Europa primero
    expect(d[0]).toMatchObject({ total: 2, porNivel: [1, 1, 0, 0] });
    expect(d[1]).toMatchObject({ total: 1, porNivel: [1, 0, 0, 0] });
  });

  it('países que más se atascan (solo fallos recientes)', () => {
    const e = estadoVacio();
    registrarRespuesta(e, 'A', 'elegir', 'fallo', 3000, D('2026-11-01T10:00:00Z'));
    registrarRespuesta(e, 'B', 'elegir', 'fallo', 3000, D('2026-11-01T10:01:00Z'));
    registrarRespuesta(e, 'B', 'elegir', 'fallo', 3000, D('2026-11-01T10:02:00Z'));
    registrarRespuesta(e, 'C', 'elegir', 'fallo', 3000, D('2026-08-01T10:00:00Z')); // antiguo
    registrarRespuesta(e, 'C', 'elegir', 'acierto', 3000, D('2026-11-01T10:03:00Z'));
    const a = paisesAtascados(e, paises, D('2026-11-02T10:00:00Z'));
    expect(a.map((x) => [x.pais.id, x.fallos])).toEqual([['B', 2], ['A', 1]]);
  });

  it('actividad de los últimos días', () => {
    const e = estadoVacio();
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 3000, new Date(2026, 10, 1, 10));
    registrarRespuesta(e, 'A', 'elegir', 'fallo', 3000, new Date(2026, 10, 1, 11));
    registrarRespuesta(e, 'B', 'elegir', 'acierto', 3000, new Date(2026, 9, 30, 12));
    const act = actividadReciente(e, new Date(2026, 10, 1, 20), 3);
    expect(act).toEqual([
      { dia: '2026-10-30', respuestas: 1, aciertos: 1 },
      { dia: '2026-10-31', respuestas: 0, aciertos: 0 },
      { dia: '2026-11-01', respuestas: 2, aciertos: 1 },
    ]);
  });
});

describe('modo examen', () => {
  it('días hasta el examen', () => {
    expect(diasHastaExamen('2026-11-10', new Date(2026, 10, 1, 23))).toBe(9);
    expect(diasHastaExamen('2026-11-01', new Date(2026, 10, 1, 8))).toBe(0);
    expect(diasHastaExamen('2026-10-30', new Date(2026, 10, 1))).toBe(-2);
    expect(diasHastaExamen(null, new Date())).toBeNull();
  });

  it('lo flojo primero', () => {
    const e = estadoVacio();
    const ps = ['A', 'B', 'C', 'D'].map((x) => pais(x));
    // A: en repaso; B: nueva; C: aprendiendo; D: en repaso con más estabilidad
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 3000, D('2026-11-01T10:00:00Z'));
    registrarRespuesta(e, 'A', 'elegir', 'acierto', 3000, D('2026-11-01T10:15:00Z'));
    registrarRespuesta(e, 'C', 'elegir', 'acierto', 3000, D('2026-11-01T10:00:00Z'));
    registrarRespuesta(e, 'D', 'escribir', 'acierto', 3000, D('2026-11-01T10:00:00Z'));
    registrarRespuesta(e, 'D', 'escribir', 'acierto', 3000, D('2026-11-01T10:15:00Z'));
    expect(nivelDominio(e.tarjetas.D)).toBeGreaterThanOrEqual(2);
    const orden = seleccionarExamen(e, ps);
    expect(orden[0]).toBe('B');
    expect(orden[1]).toBe('C');
    expect(orden.slice(2).sort()).toEqual(['A', 'D']);
    expect(seleccionarExamen(e, ps, 2)).toHaveLength(2);
  });

  it('regiones con países de examen (incluye regiones extra)', () => {
    const ps = [pais('A', 'r1'), pais('R', 'r1', ['r9']), pais('C', 'r2')];
    expect([...regionesConExamen(['R'], ps)].sort()).toEqual(['r1', 'r9']);
    expect(regionesConExamen(null, ps).size).toBe(0);
  });
});

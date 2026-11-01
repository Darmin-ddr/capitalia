import { describe, expect, it } from 'vitest';
import { continenteQueToca, ordenCurso, paisesDeHoy, resumenPortada } from '../src/logic/portada';
import { estadoVacio, nivelMapa, registrarEscalon } from '../src/logic/progreso';
import type { Pais, Region } from '../src/logic/types';

const pais = (id: string, continentes: Pais['continentes'] = ['europa']): Pais => ({
  id, isoNumerico: null, nombre: id, capital: id, variantes: [], antiguos: [],
  continentes, region: 'r', capitalCoords: [0, 0], opcional: false, trucos: [],
});
const region = (id: string, continente: Region['continente'], orden: number) => ({ id, nombre: id, continente, orden, color: '#fff' }) as unknown as Region;
const AHORA = new Date('2026-11-10T10:00:00Z');

describe('portada de Hoy', () => {
  it('aprendidos en total, por continente, en la semana y de la lista de examen', () => {
    const e = estadoVacio();
    const ps = [pais('A'), pais('B'), pais('C', ['asia']), pais('R', ['europa', 'asia'])];
    e.aprendizaje.A = { escalon: 3, aciertos: 0, aprendido: true, aprendidoEl: '2026-11-08T10:00:00Z' };
    e.aprendizaje.R = { escalon: 3, aciertos: 0, aprendido: true, aprendidoEl: '2026-10-01T10:00:00Z' };
    e.aprendizaje.C = { escalon: 3, aciertos: 0, aprendido: true }; // convertido de la v1, sin fecha
    e.ajustes.listaExamen = ['A', 'B'];
    const r = resumenPortada(e, ps, ['europa', 'asia'], AHORA);
    expect(r.aprendidos).toBe(3);
    expect(r.total).toBe(4);
    expect(r.porContinente).toEqual([
      { continente: 'europa', aprendidos: 2, total: 3 },
      { continente: 'asia', aprendidos: 2, total: 2 },
    ]);
    expect(r.aprendidosSemana).toBe(1);
    expect(r.examen).toEqual({ aprendidos: 1, total: 2 });
  });

  it('al quedar aprendido se guarda la fecha', () => {
    const e = estadoVacio();
    e.aprendizaje.A = { escalon: 3, aciertos: 1, aprendido: false };
    registrarEscalon(e, 'A', 'mapamudo', 'acierto', undefined, AHORA);
    expect(e.aprendizaje.A).toMatchObject({ aprendido: true, aprendidoEl: AHORA.toISOString() });
  });

  it('orden del curso: Europa y luego Asia, cada una por sus regiones', () => {
    const rs = [region('e2', 'europa', 2), region('a2', 'asia', 2), region('a1', 'asia', 1), region('e1', 'europa', 1)];
    expect(ordenCurso(rs).map((r) => r.id)).toEqual(['e1', 'e2', 'a1', 'a2']);
  });

  it('continente que toca: el primero con países sin aprender', () => {
    const e = estadoVacio();
    const ps = [pais('A'), pais('C', ['asia'])];
    const rs = [region('e1', 'europa', 1), region('a1', 'asia', 1)];
    expect(continenteQueToca(e, ps, rs)).toBe('europa');
    e.aprendizaje.A = { escalon: 3, aciertos: 0, aprendido: true };
    expect(continenteQueToca(e, ps, rs)).toBe('asia');
  });

  it('nivel del mapa según escalones', () => {
    const e = estadoVacio();
    expect(nivelMapa(e, 'A')).toBe(0);
    e.aprendizaje.A = { escalon: 1, aciertos: 0, aprendido: false };
    expect(nivelMapa(e, 'A')).toBe(1);
    e.aprendizaje.A = { escalon: 2, aciertos: 0, aprendido: false };
    expect(nivelMapa(e, 'A')).toBe(2);
    e.aprendizaje.A.aprendido = true;
    expect(nivelMapa(e, 'A')).toBe(3);
  });
});

describe('qué estudia Hoy', () => {
  it('todo, o solo un continente (los de los dos continentes entran siempre)', () => {
    const ps = [pais('A'), pais('C', ['asia']), pais('R', ['europa', 'asia'])];
    expect(paisesDeHoy(ps, null).map((p) => p.id)).toEqual(['A', 'C', 'R']);
    expect(paisesDeHoy(ps, 'asia').map((p) => p.id)).toEqual(['C', 'R']);
    expect(paisesDeHoy(ps, 'europa').map((p) => p.id)).toEqual(['A', 'R']);
  });
});

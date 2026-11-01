import { describe, expect, it } from 'vitest';
import { ColaHoy, crearSesionHoy, modoHoy, nuevosDeHoy, repasoAdelantado, repasosPendientes } from '../src/logic/hoy';
import { estadoVacio, registrarRespuesta, type EstadoProgreso } from '../src/logic/progreso';
import { rngConSemilla } from '../src/logic/rng';
import type { Pais } from '../src/logic/types';

const pais = (id: string, region = 'r1'): Pais => ({
  id, isoNumerico: null, nombre: id, capital: id, variantes: [], antiguos: [],
  continentes: ['europa'], region, capitalCoords: [0, 0], opcional: false, trucos: [],
});
const AHORA = new Date('2026-11-10T10:00:00Z');
const DIA = 864e5;

/** Marca un país como aprendido con una tarjeta que vence `venceEnDias` días después de AHORA. */
function aprendidoCon(e: EstadoProgreso, id: string, venceEnDias: number, estabilidad = 3) {
  e.aprendizaje[id] = { escalon: 3, aciertos: 0, aprendido: true };
  e.tarjetas[id] = {
    due: new Date(AHORA.getTime() + venceEnDias * DIA).toISOString(), stability: estabilidad, difficulty: 5,
    elapsed_days: 1, scheduled_days: 3, reps: 5, lapses: 0, learning_steps: 0, state: 2,
    last_review: new Date(AHORA.getTime() - 3 * DIA).toISOString(),
  };
}

const sesion = (e: EstadoProgreso, disponibles: Pais[], extra: Partial<Parameters<typeof crearSesionHoy>[0]> = {}) =>
  crearSesionHoy({ estado: e, disponibles, ordenRegiones: ['r1', 'r2'], prioridad: new Set(), nuevos: 5, ahora: AHORA, rng: rngConSemilla(1), ...extra });

describe('sesión de Hoy', () => {
  it('primer día: solo nuevos, cada uno dos veces y nunca seguidas', () => {
    const ps = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((x) => pais(x));
    const s = sesion(estadoVacio(), ps, { nuevos: 5 });
    expect(s.every((i) => i.tipo === 'nuevo')).toBe(true);
    const ids = s.map((i) => i.paisId);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toHaveLength(10);
    for (let i = 1; i < ids.length; i++) expect(ids[i]).not.toBe(ids[i - 1]);
  });

  it('repasos vencidos primero (el más atrasado antes) y nuevos intercalados después del calentamiento', () => {
    const e = estadoVacio();
    const ps = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'N1', 'N2'].map((x) => pais(x));
    aprendidoCon(e, 'R1', -1);
    aprendidoCon(e, 'R2', -5);
    aprendidoCon(e, 'R3', -2);
    aprendidoCon(e, 'R4', -3);
    aprendidoCon(e, 'R5', -4);
    aprendidoCon(e, 'R6', 4); // no vence hoy
    const s = sesion(e, ps, { nuevos: 2 });
    const ids = s.map((i) => i.paisId);
    expect(ids.slice(0, 3)).toEqual(['R2', 'R5', 'R4']);
    expect(ids).not.toContain('R6');
    expect(ids.filter((x) => x === 'N1')).toHaveLength(2);
    expect(ids.indexOf('N1')).toBeGreaterThanOrEqual(3);
  });

  it('los países del examen tienen prioridad, también entre los nuevos', () => {
    const ps = [pais('A', 'r1'), pais('B', 'r1'), pais('Z', 'r2')];
    const s = sesion(estadoVacio(), ps, { nuevos: 1, prioridad: new Set(['Z']) });
    expect(s[0].paisId).toBe('Z');
  });

  it('los nuevos salen primero de la región preferida', () => {
    const ps = [pais('A', 'r2'), pais('B', 'r2'), pais('C', 'r1')];
    const s = sesion(estadoVacio(), ps, { nuevos: 1 });
    expect(s[0].paisId).toBe('C');
  });

  it('agrupa por región (el mapa salta poco) y deja la región de los nuevos para el final', () => {
    const e = estadoVacio();
    const ps = [pais('A1', 'r1'), pais('A2', 'r1'), pais('B1', 'r2'), pais('B2', 'r2'), pais('C1', 'r3'), pais('N1', 'r1'), pais('N2', 'r1')];
    aprendidoCon(e, 'A1', -5);
    aprendidoCon(e, 'B1', -4);
    aprendidoCon(e, 'A2', -3);
    aprendidoCon(e, 'C1', -2);
    aprendidoCon(e, 'B2', -1);
    const s = sesion(e, ps, { nuevos: 2 });
    const regiones = s.map((i) => ps.find((x) => x.id === i.paisId)!.region);
    const saltos = regiones.filter((r, i) => i > 0 && r !== regiones[i - 1]).length;
    expect(saltos).toBe(2);
    expect(regiones.at(-1)).toBe('r1');
    expect(s.map((i) => i.paisId).slice(0, 3)).toEqual(['B1', 'B2', 'C1']);
  });

  it('los países en aprendizaje salen una vez al día', () => {
    const e = estadoVacio();
    const ps = [pais('A'), pais('B')];
    e.aprendizaje.A = { escalon: 1, aciertos: 0, aprendido: false };
    e.aprendizaje.B = { escalon: 1, aciertos: 0, aprendido: false };
    registrarRespuesta(e, 'A', 'alreves', 'acierto', 3000, new Date(AHORA.getTime() - 3600e3));
    registrarRespuesta(e, 'B', 'alreves', 'acierto', 3000, new Date(AHORA.getTime() - 2 * DIA));
    expect(sesion(e, ps, { nuevos: 0 }).map((i) => i.paisId)).toEqual(['B']);
  });

  it('no supera el tamaño de la sesión', () => {
    const e = estadoVacio();
    const ps = Array.from({ length: 40 }, (_, i) => pais(`P${i}`));
    for (const p of ps.slice(0, 30)) aprendidoCon(e, p.id, -1);
    expect(sesion(e, ps, { nuevos: 5, tam: 20 })).toHaveLength(20);
  });

  it('nada que hacer: sesión vacía, pero hay repaso adelantado', () => {
    const e = estadoVacio();
    const ps = [pais('A'), pais('B')];
    aprendidoCon(e, 'A', 3);
    aprendidoCon(e, 'B', 1);
    expect(sesion(e, ps, { nuevos: 0 })).toEqual([]);
    expect(repasoAdelantado(e, ps).map((i) => i.paisId)).toEqual(['B', 'A']);
    expect(repasosPendientes(e, ps, AHORA)).toHaveLength(0);
  });
});

describe('nuevos por día autorregulados', () => {
  const conRespuestas = (aciertos: number, fallos: number) => {
    const e = estadoVacio();
    const ayer = new Date(AHORA.getTime() - DIA);
    for (let i = 0; i < aciertos + fallos; i++) {
      registrarRespuesta(e, 'X', 'elegir', i < aciertos ? 'acierto' : 'fallo', 3000, new Date(ayer.getTime() + i * 1000));
    }
    return e;
  };

  it('entre 5 y 10 según los aciertos recientes', () => {
    expect(nuevosDeHoy(conRespuestas(38, 2), 0, AHORA)).toBe(10);
    expect(nuevosDeHoy(conRespuestas(20, 20), 0, AHORA)).toBe(5);
    const medio = nuevosDeHoy(conRespuestas(33, 7), 0, AHORA);
    expect(medio).toBeGreaterThan(5);
    expect(medio).toBeLessThan(10);
  });

  it('con muchos repasos pendientes, el mínimo', () => {
    expect(nuevosDeHoy(conRespuestas(40, 0), 100, AHORA)).toBe(5);
  });

  it('respeta el máximo del panel y descuenta los ya empezados hoy', () => {
    const e = conRespuestas(40, 0);
    e.ajustes.maxNuevos = 7;
    expect(nuevosDeHoy(e, 0, AHORA)).toBe(7);
    registrarRespuesta(e, 'NUEVO1', 'elegir', 'acierto', 3000, AHORA);
    registrarRespuesta(e, 'NUEVO2', 'elegir', 'acierto', 3000, AHORA);
    expect(nuevosDeHoy(e, 0, AHORA)).toBe(5);
  });
});

describe('tipo de pregunta en Hoy', () => {
  it('en aprendizaje, el de su escalón (Colocar como Al revés)', () => {
    const e = estadoVacio();
    expect(modoHoy(e, 'A', rngConSemilla(1))).toBe('elegir');
    e.aprendizaje.A = { escalon: 1, aciertos: 0, aprendido: false };
    expect(modoHoy(e, 'A', rngConSemilla(1))).toBe('alreves');
    e.aprendizaje.A = { escalon: 3, aciertos: 0, aprendido: false };
    expect(modoHoy(e, 'A', rngConSemilla(1))).toBe('mapamudo');
  });

  it('aprendidos: variedad entre Mapa mudo, Escribir y Al revés', () => {
    const e = estadoVacio();
    aprendidoCon(e, 'A', 0, 10);
    const modos = new Set(Array.from({ length: 50 }, (_, i) => modoHoy(e, 'A', rngConSemilla(i))));
    expect([...modos].sort()).toEqual(['alreves', 'escribir', 'mapamudo']);
  });
});

describe('cola de Hoy', () => {
  const items = (s: string) => s.split(' ').map((x) => ({ id: x, region: x[0] }));
  const recorrer = (c: ColaHoy, fallar: Set<string>) => {
    const visto: string[] = [];
    while (c.actual()) {
      const id = c.actual()!;
      visto.push(id);
      c.responder(fallar.has(id) && visto.filter((x) => x === id).length === 1 ? 'fallo' : 'acierto');
    }
    return visto.join(' ');
  };

  it('el fallo vuelve dentro del bloque de su región', () => {
    expect(recorrer(new ColaHoy(items('a1 a2 a3 a4 a5 b1')), new Set(['a1']))).toBe('a1 a2 a3 a4 a1 a5 b1');
    expect(recorrer(new ColaHoy(items('a1 a2 b1 b2')), new Set(['a1']))).toBe('a1 a2 a1 b1 b2');
  });

  it('si su bloque se acaba, tras la última de su región o al final', () => {
    expect(recorrer(new ColaHoy(items('a1 b1 b2 a2 c1')), new Set(['a1']))).toBe('a1 b1 b2 a2 a1 c1');
    expect(recorrer(new ColaHoy(items('a1 b1 b2')), new Set(['a1']))).toBe('a1 b1 b2 a1');
  });

  it('resumen como en las rondas', () => {
    const c = new ColaHoy(items('a1 a2'));
    recorrer(c, new Set(['a2']));
    expect(c.resumen()).toEqual({ total: 2, aLaPrimera: 1, fallos: 1 });
  });
});

import { describe, expect, it } from 'vitest';
import { crearPreguntaOpciones } from '../src/logic/opciones';
import { rngConSemilla } from '../src/logic/rng';
import type { Pais } from '../src/logic/types';

function pais(id: string, capital: string, region: string): Pais {
  return {
    id, isoNumerico: null, nombre: id, capital, variantes: [], antiguos: [],
    continentes: ['europa'], region, capitalCoords: [0, 0], opcional: false, trucos: [],
  };
}

const balcanes = [
  pais('A', 'Tirana', 'b'), pais('B', 'Sarajevo', 'b'), pais('C', 'Sofía', 'b'),
  pais('D', 'Zagreb', 'b'), pais('E', 'Atenas', 'b'),
];
const nordicos = [pais('N', 'Oslo', 'n'), pais('S', 'Estocolmo', 'n'), pais('F', 'Helsinki', 'n')];

describe('crearPreguntaOpciones', () => {
  it('da 4 opciones distintas con la correcta en su índice', () => {
    for (let s = 0; s < 50; s++) {
      const p = crearPreguntaOpciones(balcanes[0], balcanes, rngConSemilla(s));
      expect(p.opciones).toHaveLength(4);
      expect(new Set(p.opciones).size).toBe(4);
      expect(p.opciones[p.correcta]).toBe('Tirana');
    }
  });

  it('prefiere distractores de la misma región', () => {
    for (let s = 0; s < 50; s++) {
      const p = crearPreguntaOpciones(balcanes[0], [...balcanes, ...nordicos], rngConSemilla(s));
      for (const o of p.opciones) expect(['Oslo', 'Estocolmo', 'Helsinki']).not.toContain(o);
    }
  });

  it('completa con otras regiones si la región no da para tanto', () => {
    const p = crearPreguntaOpciones(balcanes[0], [balcanes[0], balcanes[1], ...nordicos], rngConSemilla(1));
    expect(p.opciones).toHaveLength(4);
    expect(p.opciones).toContain('Sarajevo');
  });

  it('no repite capitales aunque cambien tildes o mayúsculas', () => {
    const conDuplicado = [...balcanes, pais('X', 'sofia', 'b')];
    for (let s = 0; s < 50; s++) {
      const p = crearPreguntaOpciones(balcanes[2], conDuplicado, rngConSemilla(s));
      expect(p.opciones.filter((o) => o.toLowerCase().startsWith('sof'))).toHaveLength(1);
    }
  });

  it('la posición de la correcta varía', () => {
    const posiciones = new Set<number>();
    for (let s = 0; s < 50; s++) posiciones.add(crearPreguntaOpciones(balcanes[0], balcanes, rngConSemilla(s)).correcta);
    expect(posiciones.size).toBe(4);
  });
});

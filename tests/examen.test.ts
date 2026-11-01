import { describe, expect, it } from 'vitest';
import { corregirMapaMudo, notaExamen, paisesDeAmbito, prepararExamen } from '../src/logic/examen';
import { paises } from '../src/data';
import { paisesActivos } from '../src/logic/datos';
import { rngConSemilla } from '../src/logic/rng';

const activos = paisesActivos(paises);
const p = (id: string) => paises.find((x) => x.id === id)!;

describe('examen', () => {
  it('ámbitos: Europa, Asia, todo y lista (Rusia y Turquía en los dos continentes)', () => {
    expect(paisesDeAmbito('europa', activos, null)).toHaveLength(46);
    expect(paisesDeAmbito('asia', activos, null)).toHaveLength(49);
    expect(paisesDeAmbito('todo', activos, null)).toHaveLength(93);
    expect(paisesDeAmbito('lista', activos, ['FRA', 'JPN']).map((x) => x.id).sort()).toEqual(['FRA', 'JPN']);
    expect(paisesDeAmbito('lista', activos, null)).toHaveLength(0);
  });

  it('preguntas: n distintas al azar, o todas', () => {
    const eu = paisesDeAmbito('europa', activos, null);
    const diez = prepararExamen(eu, 10, rngConSemilla(1));
    expect(new Set(diez).size).toBe(10);
    expect(prepararExamen(eu, null, rngConSemilla(1))).toHaveLength(46);
  });

  it('corrección: punto entero, medio punto y cero', () => {
    const c = (pais: string, capital: string) => corregirMapaMudo(pais, capital, p('FRA'), paises);
    expect(c('Francia', 'París')).toMatchObject({ puntos: 1, resultado: 'acierto' });
    expect(c('francia', 'Madrid')).toMatchObject({ puntos: 0.5, resultado: 'repasar' });
    expect(c('España', 'París')).toMatchObject({ puntos: 0.5, resultado: 'repasar' });
    expect(c('', '')).toMatchObject({ puntos: 0, resultado: 'fallo' });
  });

  it('erratas y avisos valen el punto, pero se repasan', () => {
    expect(corregirMapaMudo('Holanda', 'Ámsterdam', p('NLD'), paises)).toMatchObject({ puntos: 1, resultado: 'repasar' });
    expect(corregirMapaMudo('Francia', 'Pari', p('FRA'), paises)).toMatchObject({ puntos: 1, resultado: 'repasar' });
  });

  it('nota sobre 10 con un decimal', () => {
    expect(notaExamen([1, 1, 0.5, 0])).toBe(6.3);
    expect(notaExamen([1, 1])).toBe(10);
    expect(notaExamen([])).toBe(0);
  });
});

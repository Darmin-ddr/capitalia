import { describe, expect, it } from 'vitest';
import { ColaRonda } from '../src/logic/sesion';
import { rngConSemilla } from '../src/logic/rng';

const ids = ['A', 'B', 'C', 'D', 'E', 'F'];

describe('ColaRonda', () => {
  it('termina tras acertar cada país una vez', () => {
    const cola = new ColaRonda(ids, rngConSemilla(1));
    const vistos: string[] = [];
    let r;
    do {
      vistos.push(cola.actual()!);
      r = cola.responder(true);
    } while (!r.terminada);
    expect(vistos.sort()).toEqual([...ids].sort());
    expect(cola.actual()).toBeNull();
    expect(cola.resumen()).toEqual({ total: 6, aLaPrimera: 6, fallos: 0 });
  });

  it('un fallo vuelve a salir tras el hueco indicado', () => {
    const cola = new ColaRonda(ids, rngConSemilla(2), 3);
    const fallado = cola.actual()!;
    cola.responder(false);
    for (let i = 0; i < 3; i++) {
      expect(cola.actual()).not.toBe(fallado);
      cola.responder(true);
    }
    expect(cola.actual()).toBe(fallado);
  });

  it('marca como recuperado el acierto de algo antes fallado', () => {
    const cola = new ColaRonda(['A', 'B'], rngConSemilla(3), 3);
    const primero = cola.actual()!;
    expect(cola.responder(false).recuperado).toBe(false);
    expect(cola.responder(true).recuperado).toBe(false); // el otro país, a la primera
    expect(cola.actual()).toBe(primero);
    const r = cola.responder(true);
    expect(r).toEqual({ recuperado: true, terminada: true });
    expect(cola.resumen()).toEqual({ total: 2, aLaPrimera: 1, fallos: 1 });
  });

  it('si solo queda un país, el fallo vuelve enseguida', () => {
    const cola = new ColaRonda(['A'], rngConSemilla(4));
    cola.responder(false);
    expect(cola.actual()).toBe('A');
    expect(cola.pendientes()).toBe(1);
  });

  it('no se puede responder con la ronda terminada', () => {
    const cola = new ColaRonda(['A'], rngConSemilla(5));
    cola.responder(true);
    expect(() => cola.responder(true)).toThrow();
  });
});

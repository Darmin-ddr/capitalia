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
      r = cola.responder('acierto');
    } while (!r.terminada);
    expect(vistos.sort()).toEqual([...ids].sort());
    expect(cola.actual()).toBeNull();
    expect(cola.resumen()).toEqual({ total: 6, aLaPrimera: 6, fallos: 0 });
  });

  it('un fallo vuelve a salir tras el hueco indicado', () => {
    const cola = new ColaRonda(ids, rngConSemilla(2), 3);
    const fallado = cola.actual()!;
    cola.responder('fallo');
    for (let i = 0; i < 3; i++) {
      expect(cola.actual()).not.toBe(fallado);
      cola.responder('acierto');
    }
    expect(cola.actual()).toBe(fallado);
  });

  it('marca como recuperado el acierto de algo antes fallado', () => {
    const cola = new ColaRonda(['A', 'B'], rngConSemilla(3), 3);
    const primero = cola.actual()!;
    expect(cola.responder('fallo').recuperado).toBe(false);
    expect(cola.responder('acierto').recuperado).toBe(false); // el otro país, a la primera
    expect(cola.actual()).toBe(primero);
    const r = cola.responder('acierto');
    expect(r).toEqual({ recuperado: true, terminada: true });
    expect(cola.resumen()).toEqual({ total: 2, aLaPrimera: 1, fallos: 1 });
  });

  it('si solo queda un país, el fallo vuelve enseguida', () => {
    const cola = new ColaRonda(['A'], rngConSemilla(4));
    cola.responder('fallo');
    expect(cola.actual()).toBe('A');
    expect(cola.pendientes()).toBe(1);
  });

  it('repasar (errata o nombre antiguo) vuelve a salir pero no cuenta como fallo', () => {
    const cola = new ColaRonda(['A', 'B', 'C', 'D', 'E'], rngConSemilla(6), 3);
    const errata = cola.actual()!;
    expect(cola.responder('repasar')).toEqual({ recuperado: false, terminada: false });
    for (let i = 0; i < 3; i++) cola.responder('acierto');
    expect(cola.actual()).toBe(errata);
    // Al acertarlo después no hay celebración: no era un fallo.
    expect(cola.responder('acierto').recuperado).toBe(false);
    cola.responder('acierto');
    expect(cola.resumen()).toEqual({ total: 5, aLaPrimera: 5, fallos: 0 });
  });

  it('no se puede responder con la ronda terminada', () => {
    const cola = new ColaRonda(['A'], rngConSemilla(5));
    cola.responder('acierto');
    expect(() => cola.responder('acierto')).toThrow();
  });
});

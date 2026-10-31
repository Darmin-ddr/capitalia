import { describe, expect, it } from 'vitest';
import { RondaColocar } from '../src/logic/colocar';
import { rngConSemilla } from '../src/logic/rng';

const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

describe('RondaColocar', () => {
  it('tandas de 5 y luego el resto', () => {
    const r = new RondaColocar(ids, rngConSemilla(1));
    expect(r.tanda()).toHaveLength(5);
    expect(r.numeroTanda()).toBe(1);
    for (const id of [...r.tanda()]) r.colocar(id, id);
    expect(r.numeroTanda()).toBe(2);
    expect(r.tanda()).toHaveLength(4);
    let ultimo;
    for (const id of [...r.tanda()]) ultimo = r.colocar(id, id);
    expect(ultimo).toEqual({ acierto: true, recuperado: false, tandaTerminada: true, rondaTerminada: true });
    expect(r.resumen()).toEqual({ total: 9, aLaPrimera: 9, fallos: 0 });
  });

  it('una capital mal colocada vuelve en una tanda posterior, no en la misma', () => {
    const r = new RondaColocar(ids, rngConSemilla(2));
    const [mala, otra] = r.tanda();
    const res = r.colocar(mala, otra);
    expect(res.acierto).toBe(false);
    expect(r.tanda()).not.toContain(mala);
    for (const id of [...r.tanda()]) r.colocar(id, id);
    expect(r.numeroTanda()).toBe(2);
    expect(r.tanda()).toHaveLength(5); // 4 que quedaban + la fallada
    expect(r.tanda()).toContain(mala);
    expect(r.colocar(mala, mala).recuperado).toBe(true);
  });

  it('el país tocado por error no se penaliza', () => {
    const r = new RondaColocar(['A', 'B'], rngConSemilla(3));
    const [x, y] = r.tanda();
    r.colocar(x, y);
    expect(r.tanda()).toEqual([y]);
  });

  it('si solo queda la fallada, forma una tanda propia', () => {
    const r = new RondaColocar(['A'], rngConSemilla(4));
    r.colocar('A', 'Z');
    expect(r.terminada()).toBe(false);
    expect(r.tanda()).toEqual(['A']);
    expect(r.numeroTanda()).toBe(2);
    expect(r.colocar('A', 'A').rondaTerminada).toBe(true);
    expect(r.resumen()).toEqual({ total: 1, aLaPrimera: 0, fallos: 1 });
  });

  it('error si la capital no está en la tanda', () => {
    const r = new RondaColocar(ids, rngConSemilla(5));
    const fuera = ids.find((i) => !r.tanda().includes(i))!;
    expect(() => r.colocar(fuera, fuera)).toThrow();
  });
});

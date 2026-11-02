import { describe, expect, it } from 'vitest';
import { CLAVE, type AlmacenTexto } from '../src/logic/almacen';
import {
  CLAVE_PERFILES, ID_PRIMERO, borrarPerfil, cargarIndice, claveProgreso, crearPerfil, faltaNombre, guardarIndice, inicial, limpiarNombre,
} from '../src/logic/perfiles';

class Memoria implements AlmacenTexto {
  datos = new Map<string, string>();
  getItem(k: string) { return this.datos.get(k) ?? null; }
  setItem(k: string, v: string) { this.datos.set(k, v); }
  removeItem(k: string) { this.datos.delete(k); }
}
const imagen = { tipo: 'inicial' as const, color: '#fff' };

describe('perfiles de alumno', () => {
  it('sin índice: un solo alumno, dueño del progreso de siempre y con el PIN que hubiera', () => {
    const m = new Memoria();
    const i = cargarIndice(m, 'hash');
    expect(i.perfiles).toHaveLength(1);
    expect(i.ultimo).toBe(ID_PRIMERO);
    expect(i.pinHash).toBe('hash');
    expect(claveProgreso(ID_PRIMERO)).toBe(CLAVE);
  });

  it('crear, guardar y volver a cargar; cada alumno con su clave de progreso', () => {
    const m = new Memoria();
    const i = cargarIndice(m);
    const b = crearPerfil(i, 'Lucía', { tipo: 'icono', icono: '🧭', color: '#fff' });
    i.ultimo = b.id;
    guardarIndice(m, i);
    const otra = cargarIndice(m);
    expect(otra.perfiles.map((p) => p.nombre)).toEqual(['', 'Lucía']);
    expect(otra.ultimo).toBe(b.id);
    expect(claveProgreso(b.id)).not.toBe(CLAVE);
    expect(claveProgreso(b.id)).toContain(CLAVE);
  });

  it('borrar: nunca el último que queda; si era el último usado, pasa al primero', () => {
    const m = new Memoria();
    const i = cargarIndice(m);
    expect(borrarPerfil(i, ID_PRIMERO)).toBe(false);
    const b = crearPerfil(i, 'Pablo', imagen);
    i.ultimo = b.id;
    expect(borrarPerfil(i, b.id)).toBe(true);
    expect(i.perfiles).toHaveLength(1);
    expect(i.ultimo).toBe(ID_PRIMERO);
    // Ids sin repetir aunque se borre y se vuelva a crear.
    const c = crearPerfil(i, 'Ana', imagen);
    const d = crearPerfil(i, 'Eva', imagen);
    expect(new Set(i.perfiles.map((p) => p.id)).size).toBe(3);
    expect(c.id).not.toBe(d.id);
  });

  it('índice roto o de otra versión: se rehace sin perder el progreso del primero', () => {
    const m = new Memoria();
    m.setItem(CLAVE_PERFILES, '{roto');
    expect(cargarIndice(m).perfiles).toHaveLength(1);
    m.setItem(CLAVE_PERFILES, JSON.stringify({ version: 7, perfiles: [] }));
    expect(cargarIndice(m).perfiles[0].id).toBe(ID_PRIMERO);
  });

  it('nombres e iniciales', () => {
    expect(limpiarNombre('  Lucía   María ')).toBe('Lucía María');
    expect(limpiarNombre('   ')).toBeNull();
    expect(limpiarNombre('x'.repeat(21))).toBeNull();
    expect(inicial('álvaro')).toBe('Á');
    expect(inicial('')).toBe('?');
  });

  it('pedir nombre al primer alumno: una sola vez, y nunca con varios', () => {
    const m = new Memoria();
    const i = cargarIndice(m);
    expect(faltaNombre(i)).toBe(true);
    i.nombrePedido = true;
    guardarIndice(m, i);
    expect(faltaNombre(cargarIndice(m))).toBe(false);
    const j = cargarIndice(new Memoria());
    j.perfiles[0].nombre = 'Lucía';
    expect(faltaNombre(j)).toBe(false);
    const k = cargarIndice(new Memoria());
    crearPerfil(k, 'Pablo', imagen);
    expect(faltaNombre(k)).toBe(false);
  });
});

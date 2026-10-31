import { describe, expect, it } from 'vitest';
import { distancia, margenErratas, normalizar, validarTexto } from '../src/logic/texto';
import { paises } from '../src/data';
import type { Pais } from '../src/logic/types';

function pais(id: string, capital: string, extra: Partial<Pais> = {}): Pais {
  return {
    id, isoNumerico: null, nombre: id, capital, variantes: [], antiguos: [],
    continentes: ['europa'], region: 'r', capitalCoords: [0, 0], opcional: false, trucos: [], ...extra,
  };
}

// Datos de prueba inventados para casos que aún no están en countries.json.
const HUN = pais('HUN', 'Budapest');
const ROU = pais('ROU', 'Bucarest');
const SVK = pais('SVK', 'Bratislava');
const KAZ = pais('KAZ', 'Astaná', { antiguos: ['Nursultán', 'Astana'] });
const UKR = pais('UKR', 'Kiev', { variantes: ['Kyiv'] });
const PSE = pais('PSE', 'Jerusalén Este / Ramala');
const MYS = pais('MYS', 'Kuala Lumpur');
const LVA = pais('LVA', 'Riga');
const SAU = pais('SAU', 'Riad');
const prueba = [HUN, ROU, SVK, KAZ, UKR, PSE, MYS, LVA, SAU];
const real = (id: string) => paises.find((p) => p.id === id)!;

describe('normalizar y distancia', () => {
  it('quita tildes, mayúsculas, espacios y guiones', () => {
    expect(normalizar('  Kuala-Lumpur ')).toBe('kualalumpur');
    expect(normalizar('SOFÍA')).toBe('sofia');
  });
  it('dos letras intercambiadas cuentan como un error', () => {
    expect(distancia('sofia', 'sofai')).toBe(1);
    expect(distancia('tirana', 'tirnaa')).toBe(1);
    expect(distancia('abc', 'abc')).toBe(0);
    expect(distancia('', 'abc')).toBe(3);
  });
  it('margen según longitud', () => {
    expect([4, 5, 8, 9].map(margenErratas)).toEqual([0, 1, 1, 2]);
  });
});

describe('validarTexto', () => {
  const v = (texto: string, objetivo: Pais, todos: readonly Pais[] = prueba) => validarTexto(texto, objetivo, todos);

  it('correcto sin tildes ni mayúsculas', () => {
    expect(v('sofia', real('BGR'), paises).tipo).toBe('correcto');
    expect(v('LIUBLIANA', real('SVN'), paises).tipo).toBe('correcto');
    expect(v('kuala lumpur', MYS).tipo).toBe('correcto');
  });

  it('variantes aceptadas sin aviso', () => {
    expect(v('Ljubljana', real('SVN'), paises).tipo).toBe('correcto');
    expect(v('Kyiv', UKR).tipo).toBe('correcto');
  });

  it('nombres antiguos: aceptados con aviso', () => {
    expect(v('Titogrado', real('MNE'), paises).tipo).toBe('antiguo');
    expect(v('nursultan', KAZ).tipo).toBe('antiguo');
    expect(v('Nursultam', KAZ).tipo).toBe('antiguo'); // errata en el nombre antiguo
  });

  it('erratas pequeñas: aceptadas con aviso', () => {
    expect(v('Liubiana', real('SVN'), paises).tipo).toBe('errata');
    expect(v('Podgorika', real('MNE'), paises).tipo).toBe('errata');
    expect(v('Bratislaba', SVK).tipo).toBe('errata');
    expect(v('Bratisalva', SVK).tipo).toBe('errata'); // letras cambiadas de sitio
  });

  it('nombres cortos: sin margen de erratas', () => {
    expect(v('Kiec', UKR).tipo).toBe('fallo');
    expect(v('Rida', SAU).tipo).toBe('fallo');
  });

  it('demasiadas erratas: fallo', () => {
    expect(v('Liubna', real('SVN'), paises).tipo).toBe('fallo'); // 3 erratas en 9 letras
    expect(v('Bratslv', SVK).tipo).toBe('fallo');
  });

  it('otra capital existente: fallo, aunque se parezca', () => {
    const r = v('Bucarest', HUN);
    expect(r.tipo).toBe('fallo');
    expect(r.otroPais?.id).toBe('ROU');
    expect(v('Riga', SAU).tipo).toBe('fallo');
    expect(v('Belgrado', real('HRV'), paises).otroPais?.id).toBe('SRB');
  });

  it('si se parece tanto o más a otra capital, no cuenta como errata', () => {
    // "Budarest" está a 1 de Budapest y a 1 de Bucarest: ambiguo, fallo.
    expect(v('Budarest', HUN).tipo).toBe('fallo');
  });

  it('dos capitales válidas separadas por " / "', () => {
    expect(v('Ramala', PSE).tipo).toBe('correcto');
    expect(v('Jerusalén Este', PSE).tipo).toBe('correcto');
    expect(v('Jerusalen Este / Ramala', PSE).tipo).not.toBe('correcto');
  });

  it('vacío', () => {
    expect(v('   ', HUN).tipo).toBe('vacio');
  });

  it('la forma correcta mostrada es la del listado', () => {
    expect(v('Ljubljana', real('SVN'), paises).formaCorrecta).toBe('Liubliana');
  });

  it('cada capital de los datos se valida como correcta', () => {
    for (const p of paises) expect(v(p.capital, p, paises).tipo, p.capital).toBe('correcto');
  });
});

import { describe, expect, it } from 'vitest';
import { nombresCorrectos, validarPais } from '../src/logic/texto';
import { paises } from '../src/data';

const p = (id: string) => paises.find((x) => x.id === id)!;
const v = (texto: string, id: string) => validarPais(texto, p(id), paises).tipo;

describe('validar el nombre del país (mapa mudo)', () => {
  it('el nombre del listado, sin tildes ni mayúsculas', () => {
    expect(v('francia', 'FRA')).toBe('correcto');
    expect(v('PAÍSES BAJOS', 'NLD')).toBe('correcto');
    expect(v('Bosnia y Herzegovina', 'BIH')).toBe('correcto');
  });

  it('nombres con paréntesis: valen el completo y cada parte', () => {
    expect(nombresCorrectos(p('MMR'))).toContain('Birmania');
    expect(v('Birmania (Myanmar)', 'MMR')).toBe('correcto');
    expect(v('Birmania', 'MMR')).toBe('correcto');
    expect(v('Myanmar', 'MMR')).toBe('correcto');
  });

  it('variantes evidentes sin aviso', () => {
    expect(v('Chequia', 'CZE')).toBe('correcto');
    expect(v('Arabia Saudí', 'SAU')).toBe('correcto');
    expect(v('Bangladesh', 'BGD')).toBe('correcto');
    expect(v('Qatar', 'QAT')).toBe('correcto');
  });

  it('Holanda: aceptado con aviso', () => {
    expect(v('Holanda', 'NLD')).toBe('antiguo');
    expect(validarPais('Holanda', p('NLD'), paises).formaCorrecta).toBe('Países Bajos');
  });

  it('erratas pequeñas', () => {
    expect(v('Alemnia', 'DEU')).toBe('errata');
    expect(v('Kazajistan', 'KAZ')).toBe('correcto');
  });

  it('otro país (aunque se parezca) es fallo', () => {
    expect(v('Eslovenia', 'SVK')).toBe('fallo');
    expect(validarPais('Eslovenia', p('SVK'), paises).otroPais?.id).toBe('SVN');
    expect(v('Irán', 'IRQ')).toBe('fallo');
    expect(validarPais('Irán', p('IRQ'), paises).otroPais?.id).toBe('IRN');
  });

  it('todos los países se validan con su nombre del listado', () => {
    for (const x of paises) expect(validarPais(x.nombre, x, paises).tipo, x.nombre).toBe('correcto');
  });
});

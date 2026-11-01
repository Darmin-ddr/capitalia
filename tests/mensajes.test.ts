import { describe, expect, it } from 'vitest';
import { mensajeFallo, mensajeResumen, OTRA_OPORTUNIDAD } from '../src/logic/mensajes';

describe('mensajes', () => {
  it('el fallo incluye el truco si existe', () => {
    expect(mensajeFallo('Atenea')).toBe(`Acuérdate: Atenea ${OTRA_OPORTUNIDAD}`);
    expect(mensajeFallo(null)).toBe(OTRA_OPORTUNIDAD);
  });
  it('resumen de ronda', () => {
    expect(mensajeResumen(9, 9)).toContain('Todas a la primera');
    expect(mensajeResumen(6, 9)).toBe('6 de 9 a la primera. Las demás, recuperadas.');
  });
});

import { conArticulo, preposicionDe } from '../src/logic/mensajes';
import { paises } from '../src/data';

describe('preposición delante del país', () => {
  it('con artículo cuando el nombre lo lleva', () => {
    expect(preposicionDe('Vaticano')).toBe('del ');
    expect(preposicionDe('Reino Unido')).toBe('del ');
    expect(preposicionDe('Países Bajos')).toBe('de los ');
    expect(preposicionDe('Emiratos Árabes Unidos')).toBe('de los ');
    expect(preposicionDe('Francia')).toBe('de ');
    expect(conArticulo('Países Bajos')).toBe('los Países Bajos');
    expect(conArticulo('Vaticano')).toBe('el Vaticano');
    expect(conArticulo('Francia')).toBe('Francia');
  });
  it('todos los nombres con artículo existen en los datos', () => {
    const nombres = new Set(paises.map((p) => p.nombre));
    for (const n of ['Vaticano', 'Reino Unido', 'Países Bajos', 'Emiratos Árabes Unidos']) expect(nombres.has(n), n).toBe(true);
  });
});

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

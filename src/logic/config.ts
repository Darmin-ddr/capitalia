/**
 * Umbrales ajustables. Empiezan conservadores (SPEC 6): es mejor tardar más
 * en dar algo por dominado que darlo por sabido antes de tiempo.
 */
export type ModoId = 'elegir' | 'colocar' | 'escribir' | 'alreves';

export const CONFIG = {
  /** Por encima de este tiempo (ms), un acierto cuenta como Hard. */
  lento: { elegir: 12000, colocar: 15000, escribir: 20000, alreves: 12000 } as Record<ModoId, number>,
  /** Por debajo de este tiempo (ms), un acierto en modos 4 y 5 cuenta como Easy. */
  rapido: { escribir: 5000, alreves: 3500 } as Partial<Record<ModoId, number>>,
  /** Estabilidad FSRS (días) a partir de la cual un país está "dominado". */
  estabilidadDominado: 5,
  /** Preguntas orientativas por sesión normal. */
  preguntasSesion: 20,
  /** Países nuevos como máximo por sesión. */
  maxNuevasSesion: 5,
  /** Respuestas guardadas en el historial como máximo (las más antiguas se descartan). */
  maxHistorial: 3000,
};

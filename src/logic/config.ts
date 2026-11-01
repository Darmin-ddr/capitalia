/**
 * Umbrales ajustables. Empiezan conservadores (SPEC 6): es mejor tardar más
 * en dar algo por dominado que darlo por sabido antes de tiempo.
 */
export type ModoId = 'elegir' | 'colocar' | 'escribir' | 'alreves' | 'mapamudo';

export const CONFIG = {
  /** Por encima de este tiempo (ms), un acierto cuenta como Hard. */
  lento: { elegir: 12000, colocar: 15000, escribir: 20000, alreves: 12000, mapamudo: 30000 } as Record<ModoId, number>,
  /** Por debajo de este tiempo (ms), un acierto en modos de recuerdo cuenta como Easy. */
  rapido: { escribir: 5000, alreves: 3500, mapamudo: 10000 } as Partial<Record<ModoId, number>>,
  /** Estabilidad FSRS (días) a partir de la cual un país está "dominado". */
  estabilidadDominado: 5,
  /** Preguntas orientativas por sesión de Hoy (contando las repeticiones de los nuevos). */
  preguntasSesion: 20,
  /** Países nuevos por día en Hoy: se autorregulan entre estos dos valores (SPEC 7). */
  nuevosMinimo: 5,
  nuevosMaximo: 10,
  /** Con más repasos pendientes que esto, Hoy solo mete el mínimo de nuevos. */
  pendientesMuchos: 40,
  /** Aciertos (separados) para subir de escalón en Aprender (SPEC 4.3). */
  aciertosPorEscalon: 2,
  /** Respuestas guardadas en el historial como máximo (las más antiguas se descartan). */
  maxHistorial: 3000,
};

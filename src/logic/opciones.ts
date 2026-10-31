import type { Pais } from './types';
import { barajar, type Rng } from './rng';

export interface PreguntaOpciones {
  paisId: string;
  opciones: string[];
  /** Índice de la opción correcta dentro de `opciones`. */
  correcta: number;
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Pregunta del modo 2: la capital correcta y distractores, preferentemente de
 * la misma región. Si la región no da para tantos, completa con el resto.
 * Nunca repite una capital (comparando sin tildes ni mayúsculas).
 */
export function crearPreguntaOpciones(
  objetivo: Pais,
  candidatos: readonly Pais[],
  rng: Rng,
  numOpciones = 4,
): PreguntaOpciones {
  const usadas = new Set([normalizar(objetivo.capital)]);
  const distractores: string[] = [];

  const otros = candidatos.filter((p) => p.id !== objetivo.id);
  const mismaRegion = barajar(otros.filter((p) => p.region === objetivo.region), rng);
  const resto = barajar(otros.filter((p) => p.region !== objetivo.region), rng);

  for (const p of [...mismaRegion, ...resto]) {
    if (distractores.length >= numOpciones - 1) break;
    const clave = normalizar(p.capital);
    if (usadas.has(clave)) continue;
    usadas.add(clave);
    distractores.push(p.capital);
  }

  const opciones = barajar([objetivo.capital, ...distractores], rng);
  return { paisId: objetivo.id, opciones, correcta: opciones.indexOf(objetivo.capital) };
}

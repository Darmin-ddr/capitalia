import { barajar, type Rng } from './rng';
import type { Resultado } from './sesion';
import { validarPais, validarTexto, type ResultadoTexto } from './texto';
import type { Pais } from './types';

/**
 * Examen y preguntas de mapa mudo (SPEC 4.2 y 4.4): se ve la estrella de una
 * capital y hay que escribir el país y la capital. Lógica pura.
 */

export type AmbitoExamen = 'europa' | 'asia' | 'todo' | 'lista';

export function paisesDeAmbito(ambito: AmbitoExamen, activos: readonly Pais[], lista: readonly string[] | null): Pais[] {
  if (ambito === 'lista') return activos.filter((p) => lista?.includes(p.id));
  if (ambito === 'todo') return [...activos];
  return activos.filter((p) => p.continentes.includes(ambito));
}

/** Preguntas del examen: `n` países al azar del ámbito (todos si n es null). */
export function prepararExamen(paises: readonly Pais[], n: number | null, rng: Rng): string[] {
  const ids = barajar(paises.map((p) => p.id), rng);
  return n === null ? ids : ids.slice(0, n);
}

export interface CorreccionMapaMudo {
  /** 1 si país y capital son correctos; 0,5 si solo uno; 0 si ninguno. */
  puntos: number;
  pais: ResultadoTexto;
  capital: ResultadoTexto;
  /**
   * Para la planificación (SPEC 4.4): completo y sin avisos → acierto; medio
   * punto, o completo con errata o aviso → repasar (Hard); nada → fallo.
   * Fuera del examen, el medio punto cuenta como fallo para el escalón (ver la pregunta de mapa mudo).
   */
  resultado: Resultado;
}

const valido = (r: ResultadoTexto) => r.tipo === 'correcto' || r.tipo === 'errata' || r.tipo === 'antiguo';

export function corregirMapaMudo(textoPais: string, textoCapital: string, objetivo: Pais, todos: readonly Pais[]): CorreccionMapaMudo {
  const pais = validarPais(textoPais, objetivo, todos);
  const capital = validarTexto(textoCapital, objetivo, todos);
  const aciertos = Number(valido(pais)) + Number(valido(capital));
  const puntos = aciertos / 2;
  const limpio = pais.tipo === 'correcto' && capital.tipo === 'correcto';
  const resultado: Resultado = aciertos === 0 ? 'fallo' : aciertos === 2 && limpio ? 'acierto' : 'repasar';
  return { puntos, pais, capital, resultado };
}

/** Nota sobre 10, con un decimal. */
export function notaExamen(puntos: readonly number[]): number {
  if (!puntos.length) return 0;
  const suma = puntos.reduce((s, x) => s + x, 0);
  return Math.round((suma / puntos.length) * 100) / 10;
}

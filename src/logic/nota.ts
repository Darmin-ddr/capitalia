import { Rating, type Grade } from 'ts-fsrs';
import { CONFIG, type ModoId } from './config';
import type { Resultado } from './sesion';

export interface DatosRespuesta {
  modo: ModoId;
  resultado: Resultado;
  tiempoMs: number;
}

/**
 * Nota FSRS deducida de la respuesta, nunca preguntada (SPEC 6):
 * - fallo: Again
 * - errata o nombre antiguo ("repasar"), o acierto lento: Hard
 * - acierto normal: Good
 * - acierto rápido en modos 4 (escribir) y 5 (al revés): Easy
 * - en modos 2 (elegir) y 3 (colocar), como máximo Good
 */
export function deducirNota(r: DatosRespuesta, config = CONFIG): Grade {
  if (r.resultado === 'fallo') return Rating.Again;
  if (r.resultado === 'repasar') return Rating.Hard;
  if (r.tiempoMs > config.lento[r.modo]) return Rating.Hard;
  const rapido = config.rapido[r.modo];
  if (rapido !== undefined && r.tiempoMs < rapido) return Rating.Easy;
  return Rating.Good;
}

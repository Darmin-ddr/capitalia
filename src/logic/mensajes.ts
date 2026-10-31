import type { Rng } from './rng';

const ACIERTOS = ['¡Correcto!', '¡Eso es!', 'Bien visto.', 'Exacto.'];

export function mensajeAcierto(rng: Rng): string {
  return ACIERTOS[Math.floor(rng() * ACIERTOS.length)];
}

export const MENSAJE_RECUPERADO = '¡Ahora sí! Esta ya es tuya.';

export const OTRA_OPORTUNIDAD = 'En seguida tendrás otra oportunidad 😉';

/** Texto que acompaña a un fallo: el truco (si hay) y la promesa de repetir. */
export function mensajeFallo(truco: string | null): string {
  return truco ? `Acuérdate: ${truco} ${OTRA_OPORTUNIDAD}` : OTRA_OPORTUNIDAD;
}

export function mensajeResumen(aLaPrimera: number, total: number): string {
  if (aLaPrimera === total) return `Todas a la primera: ${total} de ${total}.`;
  return `${aLaPrimera} de ${total} a la primera. Las demás, recuperadas.`;
}

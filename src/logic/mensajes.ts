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

/**
 * Preposición correcta delante del nombre de un país: "del Vaticano",
 * "del Reino Unido", "de los Países Bajos"... (el nombre se muestra tal cual,
 * como en el listado).
 */
const ARTICULO: Record<string, 'el ' | 'los '> = {
  Vaticano: 'el ',
  'Reino Unido': 'el ',
  'Países Bajos': 'los ',
  'Emiratos Árabes Unidos': 'los ',
};

export function preposicionDe(nombrePais: string): string {
  const a = ARTICULO[nombrePais];
  return a === 'el ' ? 'del ' : a === 'los ' ? 'de los ' : 'de ';
}

/** "el Vaticano", "los Países Bajos", "Francia". */
export function conArticulo(nombrePais: string): string {
  return (ARTICULO[nombrePais] ?? '') + nombrePais;
}

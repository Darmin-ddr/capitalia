/**
 * Zoom y desplazamiento del mapa (SPEC 10), como cálculo puro.
 * Un punto p del mapa se ve en pantalla en k·p + (x, y).
 * Se puede alejar un poco más que la vista de la región (para ver el entorno)
 * y moverse con algo de holgura, pero sin perder la región de vista.
 */
export interface Vista {
  k: number;
  x: number;
  y: number;
}

export const VISTA_INICIAL: Vista = { k: 1, x: 0, y: 0 };
export const ZOOM_MAXIMO = 8;
/** Cuánto se puede alejar respecto a la vista de la región. */
export const ZOOM_MINIMO = 0.6;
/** Holgura de desplazamiento más allá de los bordes, en fracción del tamaño del mapa. */
export const HOLGURA = 0.35;

export function esInicial(v: Vista): boolean {
  return Math.abs(v.k - 1) < 0.001 && Math.abs(v.x) < 0.5 && Math.abs(v.y) < 0.5;
}

function limitarEje(pos: number, tam: number, k: number): number {
  const contenido = tam * k;
  const margen = tam * HOLGURA;
  // Sin holgura, el contenido cubriría la vista (si es mayor) o quedaría dentro (si es menor).
  const min = Math.min(0, tam - contenido) - margen;
  const max = Math.max(0, tam - contenido) + margen;
  return Math.min(max, Math.max(min, pos));
}

/** Mantiene la vista dentro de los límites de zoom y de desplazamiento. */
export function limitar(v: Vista, ancho: number, alto: number): Vista {
  const k = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, v.k));
  return { k, x: limitarEje(v.x, ancho, k), y: limitarEje(v.y, alto, k) };
}

/** Acerca o aleja con un factor, manteniendo fijo el punto de pantalla (px, py). */
export function zoomEn(v: Vista, factor: number, px: number, py: number, ancho: number, alto: number): Vista {
  const k = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, v.k * factor));
  const r = k / v.k;
  return limitar({ k, x: px - (px - v.x) * r, y: py - (py - v.y) * r }, ancho, alto);
}

export function desplazar(v: Vista, dx: number, dy: number, ancho: number, alto: number): Vista {
  return limitar({ k: v.k, x: v.x + dx, y: v.y + dy }, ancho, alto);
}

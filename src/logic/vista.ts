/**
 * Zoom y desplazamiento del mapa (SPEC 10), como cálculo puro.
 * Un punto p del mapa se ve en pantalla en k·p + (x, y).
 * El mapa nunca deja ver huecos fuera de su recuadro, y no se aleja más que la vista completa.
 */
export interface Vista {
  k: number;
  x: number;
  y: number;
}

export const VISTA_INICIAL: Vista = { k: 1, x: 0, y: 0 };
export const ZOOM_MAXIMO = 8;

/** Mantiene la vista dentro de los límites (zoom entre 1 y el máximo; sin salirse del recuadro). */
export function limitar(v: Vista, ancho: number, alto: number, kMax = ZOOM_MAXIMO): Vista {
  const k = Math.min(kMax, Math.max(1, v.k));
  const x = Math.min(0, Math.max(ancho * (1 - k), v.x));
  const y = Math.min(0, Math.max(alto * (1 - k), v.y));
  return { k, x, y };
}

/** Acerca o aleja con un factor, manteniendo fijo el punto de pantalla (px, py). */
export function zoomEn(v: Vista, factor: number, px: number, py: number, ancho: number, alto: number): Vista {
  const k = Math.min(ZOOM_MAXIMO, Math.max(1, v.k * factor));
  const r = k / v.k;
  return limitar({ k, x: px - (px - v.x) * r, y: py - (py - v.y) * r }, ancho, alto);
}

export function desplazar(v: Vista, dx: number, dy: number, ancho: number, alto: number): Vista {
  return limitar({ k: v.k, x: v.x + dx, y: v.y + dy }, ancho, alto);
}

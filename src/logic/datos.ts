import type { Pais } from './types';

/**
 * Países activos: los no opcionales, más los opcionales que se hayan activado
 * (Kosovo, por ejemplo). En el hito 1 no hay configuración, así que la lista
 * de activados está vacía.
 */
export function paisesActivos(paises: readonly Pais[], opcionalesActivados: ReadonlySet<string> = new Set()): Pais[] {
  return paises.filter((p) => !p.opcional || opcionalesActivados.has(p.id));
}

export function perteneceARegion(p: Pais, regionId: string): boolean {
  return p.region === regionId || (p.regionesExtra?.includes(regionId) ?? false);
}

export function paisesDeRegion(paises: readonly Pais[], regionId: string): Pais[] {
  return paises.filter((p) => perteneceARegion(p, regionId));
}

/** Primer truco del país, o null si no tiene. (Los trucos propios llegan en hitos posteriores.) */
export function trucoPrincipal(pais: Pais): string | null {
  return pais.trucos[0]?.texto ?? null;
}

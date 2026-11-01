export type Continente = 'europa' | 'asia';

export type TipoTruco = 'historia' | 'palabras' | 'comparacion' | 'familia';

export interface Truco {
  tipo: TipoTruco;
  texto: string;
  /** false mientras un adulto no lo haya revisado. */
  revisado?: boolean;
}

export interface Pais {
  /** ISO 3166-1 alfa-3 (Kosovo usa XKX, código provisional habitual). */
  id: string;
  /** ISO 3166-1 numérico, para enlazar con las formas del mapa (world-atlas). */
  isoNumerico: string | null;
  nombre: string;
  capital: string;
  variantes: string[];
  /** Nombres de país equivalentes, aceptados sin aviso al escribir el país (Chequia, Myanmar...). */
  variantesPais?: string[];
  /** Nombres de país aceptados con aviso (Holanda). */
  avisosPais?: string[];
  antiguos: string[];
  continentes: Continente[];
  region: string;
  /**
   * Regiones de otro continente en las que también aparece (transcontinentales:
   * Rusia y Turquía salen en un mapa de Europa y en otro de Asia, con una sola tarjeta).
   */
  regionesExtra?: string[];
  /** [longitud, latitud] */
  capitalCoords: [number, number];
  geonamesId?: number;
  opcional: boolean;
  nota?: string;
  trucos: Truco[];
}

export interface Region {
  id: string;
  nombre: string;
  continente: Continente;
  orden: number;
  color: string;
}

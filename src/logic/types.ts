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
  antiguos: string[];
  continentes: Continente[];
  region: string;
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

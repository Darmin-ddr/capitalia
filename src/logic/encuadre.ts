import { geoArea, geoCentroid, geoDistance } from 'd3-geo';
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';

/** Más lejos que esto de la capital (radianes; 8° ≈ 900 km) un trozo pequeño no cuenta para encuadrar. */
const DISTANCIA_LEJANA = (8 * Math.PI) / 180;
/** "Pequeño": menos de esta fracción del trozo más grande del país. */
const FRACCION_PEQUENA = 0.25;

/**
 * Parte de un país que cuenta para encuadrar el mapa: se quitan los trozos
 * pequeños y lejanos de la capital (territorios de ultramar como la Guayana
 * Francesa, Svalbard, Azores, Madeira o Canarias), que alejarían el encuadre de lo
 * que importa. Los trozos grandes se quedan aunque estén lejos (Nueva Guinea
 * en Indonesia, Borneo en Malasia). Devuelve null si no queda nada.
 */
export function formaParaEncuadre(f: Feature<Geometry>, capital: [number, number]): Feature<Geometry> | null {
  const g = f.geometry;
  if (!g || g.type !== 'MultiPolygon') return f;
  const trozos = (g as MultiPolygon).coordinates.map((coords) => {
    const poligono: Polygon = { type: 'Polygon', coordinates: coords };
    return { coords, area: geoArea(poligono), distancia: geoDistance(geoCentroid(poligono), capital) };
  });
  const mayor = Math.max(...trozos.map((t) => t.area));
  const quedan = trozos.filter((t) => t.distancia <= DISTANCIA_LEJANA || t.area >= mayor * FRACCION_PEQUENA);
  if (!quedan.length) return null;
  return { ...f, geometry: { type: 'MultiPolygon', coordinates: quedan.map((t) => t.coords) } };
}

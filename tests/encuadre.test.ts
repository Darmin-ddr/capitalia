import { describe, expect, it } from 'vitest';
import { feature } from 'topojson-client';
import { geoBounds } from 'd3-geo';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import mundo from '../src/data/mapa-50m.json';
import { paises } from '../src/data';
import { formaParaEncuadre } from '../src/logic/encuadre';

const topo = mundo as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const formas = feature(topo, topo.objects.countries).features as Feature<Geometry>[];
const pais = (id: string) => paises.find((p) => p.id === id)!;
const encuadre = (id: string) => {
  const p = pais(id);
  return geoBounds(formaParaEncuadre(formas.find((f) => f.id === p.isoNumerico)!, p.capitalCoords)!);
};

describe('forma para encuadrar el mapa', () => {
  it('Francia sin ultramar: solo la Francia europea', () => {
    const [[x0, y0], [x1, y1]] = encuadre('FRA');
    expect(x0).toBeGreaterThan(-6);
    expect(x1).toBeLessThan(10);
    expect(y0).toBeGreaterThan(41);
    expect(y1).toBeLessThan(52);
  });

  it('Países Bajos sin el Caribe, Noruega sin Svalbard, Portugal sin Azores ni Madeira, España sin Canarias', () => {
    expect(encuadre('NLD')[0][0]).toBeGreaterThan(3);
    expect(encuadre('NOR')[1][1]).toBeLessThan(72);
    expect(encuadre('PRT')[0][0]).toBeGreaterThan(-10);
    expect(encuadre('ESP')[0][1]).toBeGreaterThan(35);
  });

  it('los trozos grandes se quedan aunque estén lejos: Indonesia con Nueva Guinea, Malasia con Borneo', () => {
    expect(encuadre('IDN')[1][0]).toBeGreaterThan(140);
    expect(encuadre('MYS')[1][0]).toBeGreaterThan(118);
  });

  it('países de una sola pieza no cambian', () => {
    const p = pais('HUN');
    const f = formas.find((x) => x.id === p.isoNumerico)!;
    expect(formaParaEncuadre(f, p.capitalCoords)).toBe(f);
  });
});

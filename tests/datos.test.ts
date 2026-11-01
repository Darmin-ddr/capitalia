import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoContains, geoDistance } from 'd3-geo';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import mundo from '../src/data/mapa-50m.json';
import { paises } from '../src/data';
import { regiones } from '../src/data';
import { paisesActivos } from '../src/logic/datos';
import type { Pais } from '../src/logic/types';

const topo = mundo as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const formas = feature(topo, topo.objects.countries).features as Feature[];

function formaDe(p: Pais): Feature | undefined {
  return p.isoNumerico
    ? formas.find((f) => f.id === p.isoNumerico)
    : formas.find((f) => (f.properties as { name: string }).name === p.nombre);
}

describe('countries.json', () => {
  it('ids únicos y en formato alfa-3', () => {
    const ids = paises.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Z]{3}$/);
  });

  it('cada país pertenece a una región existente', () => {
    const ids = new Set(regiones.map((r) => r.id));
    for (const p of paises) expect(ids.has(p.region), p.nombre).toBe(true);
  });

  it('cada país tiene su forma en el mapa', () => {
    for (const p of paises) expect(formaDe(p), p.nombre).toBeDefined();
  });

  it('cada capital cae dentro de su país en el mapa (o a menos de ~10 km, por la costa simplificada)', () => {
    const RADIO_TIERRA_KM = 6371;
    const verticesDe = (g: Geometry): number[][] =>
      g.type === 'Polygon' ? g.coordinates.flat() : g.type === 'MultiPolygon' ? g.coordinates.flat(2) : [];
    for (const p of paises) {
      const forma = formaDe(p)!;
      const dentro = geoContains(forma, p.capitalCoords);
      const km = Math.min(...verticesDe(forma.geometry).map((v) => geoDistance(v as [number, number], p.capitalCoords))) * RADIO_TIERRA_KM;
      expect(dentro || km < 10, `${p.capital} (${p.nombre}): a ${km.toFixed(1)} km`).toBe(true);
    }
  });

  it('capitales únicas', () => {
    const caps = paises.map((p) => p.capital);
    expect(new Set(caps).size).toBe(caps.length);
  });

  it('Kosovo es opcional y está desactivado por defecto (SPEC 3.2)', () => {
    const activos = paisesActivos(paises).map((p) => p.id);
    expect(activos).not.toContain('XKX');
    expect(paisesActivos(paises, new Set(['XKX'])).map((p) => p.id)).toContain('XKX');
  });

  for (const continente of ['europa', 'asia'] as const) {
    const fichero = continente === 'europa' ? 'Europa' : 'Asia';
    const listado = readFileSync(new URL(`../docs/listas/${fichero}.md`, import.meta.url), 'utf8');
    const filas = new Map(
      [...listado.matchAll(/^\|\s*\**([^|*]+?)\**\s*\|\s*([^|]+?)\s*\|$/gm)]
        .map((m) => [m[1], m[2]] as const)
        .filter(([nombre]) => nombre !== 'País' && !nombre.startsWith('-')),
    );

    it(`${fichero}: nombre y capital coinciden con el listado de clase (fuente de verdad)`, () => {
      for (const p of paisesActivos(paises).filter((x) => x.continentes.includes(continente))) {
        expect(filas.get(p.nombre), p.nombre).toBe(p.capital);
      }
    });

    it(`${fichero}: todos los países del listado están en los datos`, () => {
      const nombres = new Set(paisesActivos(paises).filter((x) => x.continentes.includes(continente)).map((p) => p.nombre));
      for (const nombre of filas.keys()) expect(nombres.has(nombre), nombre).toBe(true);
      expect(nombres.size).toBe(filas.size);
    });
  }

  it('regiones de tamaño razonable y cada país en una región de su continente', () => {
    for (const r of regiones) {
      const n = paises.filter((p) => !p.opcional && (p.region === r.id || p.regionesExtra?.includes(r.id))).length;
      expect(n, r.id).toBeGreaterThanOrEqual(5);
      expect(n, r.id).toBeLessThanOrEqual(10);
    }
    for (const p of paises) {
      for (const id of [p.region, ...(p.regionesExtra ?? [])]) {
        const r = regiones.find((x) => x.id === id)!;
        expect(p.continentes, `${p.nombre} en ${id}`).toContain(r.continente);
      }
    }
  });

  it('transcontinentales según el listado (SPEC 3.2)', () => {
    const cont = (id: string) => paises.find((p) => p.id === id)!.continentes;
    expect(cont('RUS')).toEqual(['europa', 'asia']);
    expect(cont('TUR')).toEqual(['europa', 'asia']);
    expect(cont('CYP')).toEqual(['europa']);
    for (const id of ['GEO', 'ARM', 'AZE', 'KAZ']) expect(cont(id)).toEqual(['asia']);
  });

  it('los trucos no revisados están marcados', () => {
    for (const p of paises) for (const t of p.trucos) expect(t.revisado, p.nombre).toBe(false);
  });
});

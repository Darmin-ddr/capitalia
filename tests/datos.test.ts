import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature } from 'geojson';
import mundo from 'world-atlas/countries-50m.json';
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

  it('cada capital cae dentro de su país en el mapa', () => {
    for (const p of paises) expect(geoContains(formaDe(p)!, p.capitalCoords), `${p.capital} (${p.nombre})`).toBe(true);
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

  it('nombre y capital coinciden con el listado de clase (fuente de verdad)', () => {
    const listado = readFileSync(new URL('../docs/listas/Europa.md', import.meta.url), 'utf8');
    const filas = new Map(
      [...listado.matchAll(/^\|\s*\**([^|*]+?)\**\s*\|\s*([^|]+?)\s*\|$/gm)].map((m) => [m[1], m[2]]),
    );
    for (const p of paisesActivos(paises).filter((x) => x.continentes.includes('europa'))) {
      expect(filas.get(p.nombre), p.nombre).toBe(p.capital);
    }
  });

  it('los trucos no revisados están marcados', () => {
    for (const p of paises) for (const t of p.trucos) expect(t.revisado, p.nombre).toBe(false);
  });
});

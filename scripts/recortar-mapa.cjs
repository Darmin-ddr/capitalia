// Recorta el mapa del mundo (world-atlas 50m) a Europa, Asia y alrededores, para que pese menos.
// Quita los países que caen fuera del recuadro y los arcos que solo usaban ellos.
// Uso: node scripts/recortar-mapa.cjs   (escribe src/data/mapa-50m.json)
const fs = require('fs');
const path = require('path');
const topo = require('world-atlas/countries-50m.json');
const [LON_MIN, LON_MAX, LAT_MIN, LAT_MAX] = [-32, 180, -12, 85];

// Decodificar arcos (cuantizados y en deltas) para saber el recuadro de cada país.
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
const arcosAbs = topo.arcs.map((arco) => {
  let x = 0, y = 0;
  return arco.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
});
const arcosDe = (g) => (g.type === 'Polygon' ? g.arcs.flat() : g.type === 'MultiPolygon' ? g.arcs.flat(2) : []);
const indice = (i) => (i < 0 ? ~i : i);
const dentro = (g) => arcosDe(g).some((i) => arcosAbs[indice(i)].some(([lon, lat]) => lon >= LON_MIN && lon <= LON_MAX && lat >= LAT_MIN && lat <= LAT_MAX));

const geometrias = topo.objects.countries.geometries.filter(dentro);
const usados = [...new Set(geometrias.flatMap((g) => arcosDe(g).map(indice)))].sort((a, b) => a - b);
const nuevo = new Map(usados.map((v, i) => [v, i]));
const remapear = (i) => (i < 0 ? ~nuevo.get(~i) : nuevo.get(i));
const remapearArcos = (g) => ({
  ...g,
  arcs: g.type === 'Polygon' ? g.arcs.map((anillo) => anillo.map(remapear)) : g.arcs.map((pol) => pol.map((anillo) => anillo.map(remapear))),
});
const salida = {
  type: 'Topology',
  transform: topo.transform,
  objects: { countries: { type: 'GeometryCollection', geometries: geometrias.map(remapearArcos) } },
  arcs: usados.map((i) => topo.arcs[i]),
};
const destino = path.join(__dirname, '../src/data/mapa-50m.json');
fs.writeFileSync(destino, JSON.stringify(salida));
console.log(`países: ${topo.objects.countries.geometries.length} -> ${geometrias.length}; arcos: ${topo.arcs.length} -> ${usados.length}`);
console.log(`tamaño: ${(JSON.stringify(topo).length / 1024).toFixed(0)} KB -> ${(fs.statSync(destino).size / 1024).toFixed(0)} KB`);

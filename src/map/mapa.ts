import { geoAzimuthalEqualArea, geoBounds, geoPath, type GeoProjection } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import mundo from 'world-atlas/countries-50m.json';
import type { Pais } from '../logic/types';

type PropsMundo = { name: string };
type TopoMundo = Topology<{ countries: GeometryCollection<PropsMundo> }>;

export type EstadoPais = 'objetivo' | 'acierto' | 'fallo' | 'seleccion';

const SVG = 'http://www.w3.org/2000/svg';

interface FormaPais {
  pais: Pais | null;
  feature: Feature<Geometry>;
}

/**
 * Prepara las formas del mapa. Los países opcionales desactivados se tratan
 * según SPEC 3.2: Kosovo desactivado se dibuja unido a Serbia.
 */
function prepararFormas(paises: readonly Pais[], activos: ReadonlySet<string>): FormaPais[] {
  const topo = mundo as unknown as TopoMundo;
  const geoms = topo.objects.countries.geometries;
  const nombre = (g: (typeof geoms)[number]) => (g.properties as PropsMundo | undefined)?.name;
  const kosovo = geoms.find((g) => g.id === undefined && nombre(g) === 'Kosovo');
  const serbia = geoms.find((g) => g.id === '688');
  const unirKosovo = kosovo && serbia && !activos.has('XKX');

  const porIso = new Map(paises.filter((p) => p.isoNumerico).map((p) => [p.isoNumerico!, p]));
  const formas: FormaPais[] = [];

  for (const g of geoms) {
    if (unirKosovo && (g === kosovo || g === serbia)) continue;
    const f = feature(topo, g) as Feature<Geometry>;
    let pais: Pais | null = null;
    if (g.id !== undefined) pais = porIso.get(String(g.id)) ?? null;
    else if (nombre(g) === 'Kosovo') pais = paises.find((p) => p.id === 'XKX') ?? null;
    if (pais && !activos.has(pais.id)) pais = null;
    formas.push({ pais, feature: f });
  }

  if (unirKosovo) {
    type Poligono = Extract<Parameters<typeof merge>[1], unknown[]>[number];
    const unida = merge(topo, [serbia as Poligono, kosovo as Poligono]);
    formas.push({
      pais: porIso.get('688') ?? null,
      feature: { type: 'Feature', id: '688', properties: {}, geometry: unida },
    });
  }
  return formas;
}

export interface OpcionesMapa {
  contenedor: HTMLElement;
  /** Todos los países con datos (para enlazar formas). */
  paises: readonly Pais[];
  /** Ids de los países activos. */
  activos: ReadonlySet<string>;
  /** Países de la región en juego: encuadre y países tocables. */
  region: readonly Pais[];
  onSeleccion?: (paisId: string) => void;
}

export class Mapa {
  private readonly svg: SVGSVGElement;
  private readonly capaPaises: SVGGElement;
  private readonly capaCapital: SVGGElement;
  private readonly formas: FormaPais[];
  private readonly idsRegion: Set<string>;
  private readonly elementos = new Map<string, SVGPathElement>();
  private proyeccion: GeoProjection = geoAzimuthalEqualArea();
  private interactivo = true;
  private estados = new Map<string, EstadoPais>();
  private capitalVisible: string | null = null;
  private ancho = 0;

  constructor(private readonly op: OpcionesMapa) {
    this.formas = prepararFormas(op.paises, op.activos);
    this.idsRegion = new Set(op.region.map((p) => p.id));

    this.svg = document.createElementNS(SVG, 'svg');
    this.svg.classList.add('mapa-svg');
    this.svg.setAttribute('role', 'group');
    this.svg.setAttribute('aria-label', 'Mapa de la región');
    this.capaPaises = document.createElementNS(SVG, 'g');
    this.capaCapital = document.createElementNS(SVG, 'g');
    this.capaCapital.classList.add('capa-capital');
    this.svg.append(this.capaPaises, this.capaCapital);
    op.contenedor.append(this.svg);

    new ResizeObserver(() => this.dibujar()).observe(op.contenedor);
    this.dibujar();
  }

  /** Activa o desactiva los toques sobre países (en el modo Elegir no se toca el mapa). */
  setInteractivo(valor: boolean): void {
    this.interactivo = valor;
    for (const [id, el] of this.elementos) this.prepararTocable(el, id);
  }

  setEstado(paisId: string, estado: EstadoPais | null): void {
    if (estado) this.estados.set(paisId, estado);
    else this.estados.delete(paisId);
    const el = this.elementos.get(paisId);
    if (el) this.aplicarEstado(el, paisId);
  }

  limpiarEstados(): void {
    const ids = [...this.estados.keys()];
    this.estados.clear();
    for (const id of ids) {
      const el = this.elementos.get(id);
      if (el) this.aplicarEstado(el, id);
    }
  }

  /** Muestra la estrella y el nombre de la capital de un país (o los oculta con null). */
  mostrarCapital(paisId: string | null): void {
    this.capitalVisible = paisId;
    this.dibujarCapital();
  }

  private dibujar(): void {
    const { width, height } = this.op.contenedor.getBoundingClientRect();
    if (width < 10 || height < 10) return;
    this.ancho = width;
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const region: FeatureCollection = {
      type: 'FeatureCollection',
      features: this.formas.filter((f) => f.pais && this.idsRegion.has(f.pais.id)).map((f) => f.feature),
    };
    const [[x0, y0], [x1, y1]] = geoBounds(region);
    const margen = Math.max(12, Math.min(width, height) * 0.06);
    this.proyeccion = geoAzimuthalEqualArea()
      .rotate([-(x0 + x1) / 2, -(y0 + y1) / 2])
      .clipAngle(40)
      .fitExtent([[margen, margen], [width - margen, height - margen]], region);
    const ruta = geoPath(this.proyeccion);

    this.capaPaises.replaceChildren();
    this.elementos.clear();

    const mar = document.createElementNS(SVG, 'rect');
    mar.setAttribute('class', 'mar');
    mar.setAttribute('width', String(width));
    mar.setAttribute('height', String(height));
    this.capaPaises.append(mar);

    const tocables: SVGPathElement[] = [];
    for (const forma of this.formas) {
      const d = ruta(forma.feature);
      if (!d) continue;
      const [[bx0, by0], [bx1, by1]] = ruta.bounds(forma.feature);
      if (bx1 < 0 || by1 < 0 || bx0 > width || by0 > height) continue;

      const el = document.createElementNS(SVG, 'path');
      el.setAttribute('d', d);
      const id = forma.pais?.id;
      if (id && this.idsRegion.has(id)) {
        el.setAttribute('class', 'pais');
        el.dataset.id = id;
        this.elementos.set(id, el);
        this.prepararTocable(el, id);
        this.aplicarEstado(el, id);
        tocables.push(el);
      } else {
        el.setAttribute('class', 'tierra');
        this.capaPaises.append(el);
      }
    }
    // Los países de la región, encima: su borde se ve completo.
    this.capaPaises.append(...tocables);
    this.dibujarCapital();
  }

  private prepararTocable(el: SVGPathElement, id: string): void {
    const pais = this.op.region.find((p) => p.id === id)!;
    if (this.interactivo) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', pais.nombre);
      el.onclick = () => this.op.onSeleccion?.(id);
      el.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.op.onSeleccion?.(id);
        }
      };
      el.classList.add('tocable');
    } else {
      el.removeAttribute('tabindex');
      el.removeAttribute('role');
      el.setAttribute('aria-label', pais.nombre);
      el.onclick = null;
      el.onkeydown = null;
      el.classList.remove('tocable');
    }
  }

  private aplicarEstado(el: SVGPathElement, id: string): void {
    el.classList.remove('objetivo', 'acierto', 'fallo', 'seleccion');
    const estado = this.estados.get(id);
    if (estado) {
      el.classList.add(estado);
      // Reinicia la animación aunque el estado se repita.
      if (estado === 'acierto' || estado === 'fallo') {
        el.style.animation = 'none';
        void el.getBoundingClientRect();
        el.style.animation = '';
      }
    }
  }

  private dibujarCapital(): void {
    this.capaCapital.replaceChildren();
    const pais = this.capitalVisible ? this.op.region.find((p) => p.id === this.capitalVisible) : null;
    if (!pais || !this.ancho) return;
    const punto = this.proyeccion(pais.capitalCoords);
    if (!punto) return;
    const [x, y] = punto;

    const estrella = document.createElementNS(SVG, 'path');
    estrella.setAttribute('class', 'estrella');
    estrella.setAttribute('d', rutaEstrella(x, y, 9, 4));

    const texto = document.createElementNS(SVG, 'text');
    texto.setAttribute('class', 'etiqueta-capital');
    texto.textContent = pais.capital;
    // Etiqueta a la derecha, salvo que se salga del mapa.
    const aLaIzquierda = x > this.ancho * 0.7;
    texto.setAttribute('x', String(aLaIzquierda ? x - 13 : x + 13));
    texto.setAttribute('y', String(y + 5));
    texto.setAttribute('text-anchor', aLaIzquierda ? 'end' : 'start');

    this.capaCapital.append(estrella, texto);
  }
}

function rutaEstrella(cx: number, cy: number, rExt: number, rInt: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rExt : rInt;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
}

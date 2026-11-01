import { geoAzimuthalEqualArea, geoBounds, geoPath, type GeoProjection } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import type { GeometryCollection, GeometryObject, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
// Mapa de Natural Earth 50m (world-atlas) recortado a Europa, Asia y alrededores: scripts/recortar-mapa.cjs
import mundo from '../data/mapa-50m.json';
import type { Pais } from '../logic/types';
import type { Nivel } from '../logic/progreso';
import { desplazar, esInicial, VISTA_INICIAL, zoomEn, type Vista } from '../logic/vista';
import { formaParaEncuadre } from '../logic/encuadre';

type PropsMundo = { name: string };
type TopoMundo = Topology<{ countries: GeometryCollection<PropsMundo> }>;
type Geom = GeometryObject<PropsMundo>;

export type EstadoPais = 'objetivo' | 'acierto' | 'fallo' | 'seleccion';

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Por debajo de este tamaño en pantalla (px) o de esta superficie (px²), un país se dibuja
 * además con un círculo tocable. La superficie cubre archipiélagos dispersos como Maldivas.
 */
const TAM_MINIMO = 16;
const AREA_MINIMA = 250;
/** Radio del área tocable de los círculos (diámetro >= 44 px, SPEC 10). */
const RADIO_TOQUE = 22;
const RADIO_VISIBLE = 8;

/**
 * Territorios que Natural Earth separa pero que los listados no incluyen como
 * país: se dibujan unidos al país del listado (SPEC 3.2). Kosovo solo si
 * está desactivado.
 */
const UNIONES: { nombre: string; conIso: string; salvoActivo?: string }[] = [
  { nombre: 'Kosovo', conIso: '688', salvoActivo: 'XKX' },
  { nombre: 'N. Cyprus', conIso: '196' },
];

interface FormaPais {
  pais: Pais | null;
  feature: Feature<Geometry>;
}

function prepararFormas(paises: readonly Pais[], activos: ReadonlySet<string>): FormaPais[] {
  const topo = mundo as unknown as TopoMundo;
  const geoms = topo.objects.countries.geometries as Geom[];
  const nombre = (g: Geom) => (g.properties as PropsMundo | undefined)?.name;
  const porIso = new Map(paises.filter((p) => p.isoNumerico).map((p) => [p.isoNumerico!, p]));

  // Grupos de geometrías a unir: iso destino -> geometrías.
  const grupos = new Map<string, Geom[]>();
  const absorbidas = new Set<Geom>();
  for (const u of UNIONES) {
    if (u.salvoActivo && activos.has(u.salvoActivo)) continue;
    const parte = geoms.find((g) => g.id === undefined && nombre(g) === u.nombre);
    const destino = geoms.find((g) => g.id === u.conIso);
    if (!parte || !destino) continue;
    const grupo = grupos.get(u.conIso) ?? [destino];
    grupo.push(parte);
    grupos.set(u.conIso, grupo);
    absorbidas.add(parte).add(destino);
  }

  const formas: FormaPais[] = [];
  const paisDe = (g: Geom): Pais | null => {
    let p: Pais | null = null;
    if (g.id !== undefined) p = porIso.get(String(g.id)) ?? null;
    else if (nombre(g) === 'Kosovo') p = paises.find((x) => x.id === 'XKX') ?? null;
    return p && activos.has(p.id) ? p : null;
  };

  for (const g of geoms) {
    if (absorbidas.has(g)) continue;
    formas.push({ pais: paisDe(g), feature: feature(topo, g) as Feature<Geometry> });
  }
  type Poligono = Extract<Parameters<typeof merge>[1], unknown[]>[number];
  for (const [iso, grupo] of grupos) {
    formas.push({
      pais: paisDe(grupo[0]),
      feature: { type: 'Feature', id: iso, properties: {}, geometry: merge(topo, grupo as Poligono[]) },
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
  /** Países de la región que no cuentan para el encuadre (invitados de otro continente). */
  fueraDeEncuadre?: ReadonlySet<string>;
  /** Otros países con progreso visible (resto del continente), no tocables. */
  contexto?: readonly Pais[];
  /** Color pastel de cada país (el de su región). */
  colorDe?: (paisId: string) => string;
  onSeleccion?: (paisId: string) => void;
}

export class Mapa {
  private readonly svg: SVGSVGElement;
  private readonly capaPaises: SVGGElement;
  private readonly capaCirculos: SVGGElement;
  private readonly capaCapital: SVGGElement;
  private readonly formas: FormaPais[];
  private readonly idsRegion: Set<string>;
  private readonly idsContexto: Set<string>;
  /** Elementos de cada país (su forma y, si es diminuto, su círculo). */
  private readonly elementos = new Map<string, SVGElement[]>();
  /** Elementos extra que reciben toques (círculos de microestados). */
  private readonly tocables = new Map<string, SVGElement[]>();
  private proyeccion: GeoProjection = geoAzimuthalEqualArea();
  private interactivo = true;
  private estados = new Map<string, EstadoPais>();
  private niveles = new Map<string, Nivel>();
  private capitalVisible: string | null = null;
  private ancho = 0;
  private alto = 0;
  private readonly observador: ResizeObserver;
  /** Grupo con todo lo que se acerca y se desplaza. */
  private readonly lienzo: SVGGElement;
  private readonly controles: HTMLDivElement;
  private vista: Vista = VISTA_INICIAL;
  /** Dedos (o ratón) sobre el mapa, para arrastrar y pellizcar. */
  private readonly punteros = new Map<number, { x: number; y: number }>();
  private distanciaPellizco = 0;
  /** Píxeles arrastrados desde que se tocó: si es mucho, no cuenta como toque en un país. */
  private arrastre = 0;

  constructor(private readonly op: OpcionesMapa) {
    this.formas = prepararFormas(op.paises, op.activos);
    this.idsRegion = new Set(op.region.map((p) => p.id));
    this.idsContexto = new Set((op.contexto ?? []).map((p) => p.id).filter((id) => !this.idsRegion.has(id)));

    this.svg = document.createElementNS(SVG, 'svg');
    this.svg.classList.add('mapa-svg');
    this.svg.setAttribute('role', 'group');
    this.svg.setAttribute('aria-label', 'Mapa de la región');
    this.capaPaises = document.createElementNS(SVG, 'g');
    this.capaCirculos = document.createElementNS(SVG, 'g');
    this.capaCapital = document.createElementNS(SVG, 'g');
    this.capaCapital.classList.add('capa-capital');
    this.lienzo = document.createElementNS(SVG, 'g');
    this.lienzo.append(this.capaPaises, this.capaCirculos, this.capaCapital);
    this.svg.append(this.lienzo);
    this.controles = this.crearControles();
    op.contenedor.append(this.svg, this.controles);
    this.prepararGestos();

    this.observador = new ResizeObserver(() => this.dibujar());
    this.observador.observe(op.contenedor);
    this.dibujar();
  }

  /** Quita el mapa (al cambiar de región se crea otro). */
  destruir(): void {
    this.observador.disconnect();
    this.svg.remove();
    this.controles.remove();
    window.removeEventListener('pointermove', this.alMover);
    window.removeEventListener('pointerup', this.alSoltar);
    window.removeEventListener('pointercancel', this.alSoltar);
  }

  /** Activa o desactiva los toques sobre países (en el modo Elegir no se toca el mapa). */
  setInteractivo(valor: boolean): void {
    this.interactivo = valor;
    for (const id of this.idsRegion) this.prepararTocable(id);
  }

  setEstado(paisId: string, estado: EstadoPais | null): void {
    if (estado) this.estados.set(paisId, estado);
    else this.estados.delete(paisId);
    this.aplicarClases(paisId, estado === 'acierto' || estado === 'fallo');
  }

  limpiarEstados(): void {
    const ids = [...this.estados.keys()];
    this.estados.clear();
    for (const id of ids) this.aplicarClases(id, false);
  }

  /** Colorea cada país según su dominio (el mapa es el marcador de progreso, SPEC 10). */
  setNiveles(niveles: ReadonlyMap<string, Nivel>): void {
    this.niveles = new Map(niveles);
    for (const id of this.elementos.keys()) this.aplicarClases(id, false);
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
    this.alto = height;
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.vista = VISTA_INICIAL;

    // Encuadre: las formas de la región sin sus territorios pequeños y lejanos
    // (ultramar). Los países enormes (Rusia) y los invitados de otro continente
    // cuentan solo por su capital.
    const encuadre: Feature[] = [];
    for (const f of this.formas) {
      if (!f.pais || !this.idsRegion.has(f.pais.id)) continue;
      const forma = formaParaEncuadre(f.feature, f.pais.capitalCoords);
      const [[a0], [a1]] = forma ? geoBounds(forma) : [[0], [999]];
      const anchura = a1 >= a0 ? a1 - a0 : a1 + 360 - a0;
      if (!forma || anchura > 60 || this.op.fueraDeEncuadre?.has(f.pais.id)) {
        encuadre.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: f.pais.capitalCoords } });
      } else encuadre.push(forma);
    }
    const region: FeatureCollection = { type: 'FeatureCollection', features: encuadre };
    const [[x0, y0], [x1, y1]] = geoBounds(region);
    const centroLon = x1 >= x0 ? (x0 + x1) / 2 : (x0 + x1 + 360) / 2;
    const margen = Math.max(16, Math.min(width, height) * 0.08);
    // Hueco arriba si algo se superpone al mapa (el selector de región en móvil).
    const reserva = parseFloat(getComputedStyle(this.op.contenedor).getPropertyValue('--reserva-superior')) || 0;
    // Hueco a la derecha para los botones de zoom, que van sobre el mapa.
    const reservaDerecha = 54;
    this.proyeccion = geoAzimuthalEqualArea()
      .rotate([-centroLon, -(y0 + y1) / 2])
      .clipAngle(60)
      .fitExtent([[margen, margen + reserva], [width - margen - reservaDerecha, height - margen]], region);
    const ruta = geoPath(this.proyeccion);

    this.capaPaises.replaceChildren();
    this.capaCirculos.replaceChildren();
    this.elementos.clear();
    this.tocables.clear();

    const mar = document.createElementNS(SVG, 'rect');
    mar.setAttribute('class', 'mar');
    // El mar cubre de sobra lo que se ve al alejar o desplazar el mapa.
    mar.setAttribute('x', String(-2 * width));
    mar.setAttribute('y', String(-2 * height));
    mar.setAttribute('width', String(5 * width));
    mar.setAttribute('height', String(5 * height));
    this.capaPaises.append(mar);

    const encima: SVGElement[] = [];
    for (const forma of this.formas) {
      const d = ruta(forma.feature);
      if (!d) continue;
      const [[bx0, by0], [bx1, by1]] = ruta.bounds(forma.feature);
      // Se dibuja también lo que queda fuera de la vista inicial, para poder alejar y moverse.
      if (bx1 < -1.5 * width || by1 < -1.5 * height || bx0 > 2.5 * width || by0 > 2.5 * height) continue;

      const el = document.createElementNS(SVG, 'path');
      el.setAttribute('d', d);
      const id = forma.pais?.id;
      const enRegion = id !== undefined && this.idsRegion.has(id);
      const enContexto = id !== undefined && this.idsContexto.has(id);
      if (!enRegion && !enContexto) {
        el.setAttribute('class', 'tierra');
        this.capaPaises.append(el);
        continue;
      }
      el.dataset.id = id;
      el.classList.add('pais', enRegion ? 'jugable' : 'contexto');
      this.registrar(id!, el);
      if (enRegion) encima.push(el);
      else this.capaPaises.append(el);

      // Países diminutos (microestados): círculo tocable en su capital.
      if (Math.max(bx1 - bx0, by1 - by0) < TAM_MINIMO || ruta.area(forma.feature) < AREA_MINIMA) {
        const punto = this.proyeccion(forma.pais!.capitalCoords);
        if (punto) this.capaCirculos.append(this.circulo(id!, punto, enRegion));
      }
    }
    // Los países de la región, encima: su borde se ve completo.
    this.capaPaises.append(...encima);
    for (const id of this.elementos.keys()) {
      this.aplicarClases(id, false);
      if (this.idsRegion.has(id)) this.prepararTocable(id);
    }
    this.aplicarVista();
  }

  /* ---------- Zoom y desplazamiento ---------- */

  private crearControles(): HTMLDivElement {
    const caja = document.createElement('div');
    caja.className = 'controles-mapa';
    const crear = (texto: string, etiqueta: string, accion: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'control-mapa';
      b.textContent = texto;
      b.setAttribute('aria-label', etiqueta);
      b.addEventListener('click', accion);
      return b;
    };
    caja.append(
      crear('+', 'Acercar', () => this.zoom(1.6)),
      crear('−', 'Alejar', () => this.zoom(1 / 1.6)),
      crear('⤢', 'Ver toda la región', () => this.cambiarVista(VISTA_INICIAL)),
    );
    return caja;
  }

  private zoom(factor: number, px = this.ancho / 2, py = this.alto / 2): void {
    this.cambiarVista(zoomEn(this.vista, factor, px, py, this.ancho, this.alto));
  }

  private cambiarVista(v: Vista): void {
    this.vista = v;
    this.aplicarVista();
  }

  /** Aplica la vista y compensa el tamaño de círculos, estrella y texto para que no crezcan con el zoom. */
  private aplicarVista(): void {
    const { k, x, y } = this.vista;
    this.lienzo.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
    for (const c of this.capaCirculos.querySelectorAll<SVGCircleElement>('circle')) {
      const base = Number(c.dataset.radio);
      c.setAttribute('r', String(base / k));
    }
    this.dibujarCapital();
    this.controles.classList.toggle('con-zoom', !esInicial(this.vista));
  }

  private puntoLocal(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private prepararGestos(): void {
    this.svg.addEventListener('pointerdown', (e) => {
      this.punteros.set(e.pointerId, this.puntoLocal(e));
      if (this.punteros.size === 1) this.arrastre = 0;
      if (this.punteros.size === 2) this.distanciaPellizco = this.distanciaEntrePunteros();
    });
    window.addEventListener('pointermove', this.alMover);
    window.addEventListener('pointerup', this.alSoltar);
    window.addEventListener('pointercancel', this.alSoltar);
    // Tras arrastrar o pellizcar, el "clic" final no debe elegir un país.
    this.svg.addEventListener(
      'click',
      (e) => {
        if (this.arrastre > 8) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      true,
    );
    this.svg.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const p = this.puntoLocal(e);
        this.zoom(Math.exp(-e.deltaY * 0.0025), p.x, p.y);
      },
      { passive: false },
    );
  }

  private distanciaEntrePunteros(): number {
    const [a, b] = [...this.punteros.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private readonly alMover = (e: PointerEvent): void => {
    const previo = this.punteros.get(e.pointerId);
    if (!previo) return;
    const actual = this.puntoLocal(e);
    if (this.punteros.size === 1) {
      const dx = actual.x - previo.x;
      const dy = actual.y - previo.y;
      this.arrastre += Math.abs(dx) + Math.abs(dy);
      this.punteros.set(e.pointerId, actual);
      if (this.vista.k > 1) this.cambiarVista(desplazar(this.vista, dx, dy, this.ancho, this.alto));
      return;
    }
    if (this.punteros.size === 2) {
      const centroAntes = this.centroPunteros();
      this.punteros.set(e.pointerId, actual);
      const centro = this.centroPunteros();
      const distancia = this.distanciaEntrePunteros();
      this.arrastre += 20; // un pellizco nunca es un toque
      let v = this.vista;
      if (this.distanciaPellizco > 0) v = zoomEn(v, distancia / this.distanciaPellizco, centro.x, centro.y, this.ancho, this.alto);
      v = desplazar(v, centro.x - centroAntes.x, centro.y - centroAntes.y, this.ancho, this.alto);
      this.distanciaPellizco = distancia;
      this.cambiarVista(v);
    }
  };

  private readonly alSoltar = (e: PointerEvent): void => {
    this.punteros.delete(e.pointerId);
    if (this.punteros.size < 2) this.distanciaPellizco = 0;
    // El clic que sigue a soltar llega en esta misma tarea; después, se olvida el arrastre.
    if (this.punteros.size === 0) window.setTimeout(() => (this.arrastre = 0), 0);
  };

  private centroPunteros(): { x: number; y: number } {
    const [a, b] = [...this.punteros.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private circulo(id: string, [x, y]: [number, number], enRegion: boolean): SVGGElement {
    const g = document.createElementNS(SVG, 'g');
    g.dataset.id = id;
    g.classList.add('microestado', enRegion ? 'jugable' : 'contexto');
    const toque = document.createElementNS(SVG, 'circle');
    toque.setAttribute('class', 'toque');
    toque.setAttribute('cx', String(x));
    toque.setAttribute('cy', String(y));
    toque.dataset.radio = String(enRegion ? RADIO_TOQUE : 0);
    toque.setAttribute('r', toque.dataset.radio);
    const visible = document.createElementNS(SVG, 'circle');
    visible.setAttribute('class', 'pais circulo');
    visible.setAttribute('cx', String(x));
    visible.setAttribute('cy', String(y));
    visible.dataset.radio = String(RADIO_VISIBLE);
    visible.setAttribute('r', visible.dataset.radio);
    g.append(toque, visible);
    this.registrar(id, visible);
    if (enRegion) this.registrarTocable(id, g);
    return g;
  }

  private registrar(id: string, el: SVGElement): void {
    const lista = this.elementos.get(id) ?? [];
    lista.push(el);
    this.elementos.set(id, lista);
  }

  private registrarTocable(id: string, el: SVGElement): void {
    const lista = this.tocables.get(id) ?? [];
    lista.push(el);
    this.tocables.set(id, lista);
  }

  private prepararTocable(id: string): void {
    const pais = this.op.region.find((p) => p.id === id);
    if (!pais) return;
    // La forma del país (path) y, si existe, su círculo.
    const formas = (this.elementos.get(id) ?? []).filter((e) => e.tagName === 'path');
    const objetivos = [...formas, ...(this.tocables.get(id) ?? []).filter((e) => e.isConnected)];
    objetivos.forEach((el, i) => {
      el.setAttribute('aria-label', pais.nombre);
      if (this.interactivo) {
        // Solo un elemento por país entra en el orden del tabulador.
        if (i === 0) {
          el.setAttribute('tabindex', '0');
          el.setAttribute('role', 'button');
        }
        (el as SVGElement & { onclick: unknown }).onclick = () => this.op.onSeleccion?.(id);
        el.onkeydown = (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.op.onSeleccion?.(id);
          }
        };
        el.classList.add('tocable');
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        (el as SVGElement & { onclick: unknown }).onclick = null;
        el.onkeydown = null;
        el.classList.remove('tocable');
      }
    });
  }

  private aplicarClases(id: string, reanimar: boolean): void {
    const estado = this.estados.get(id);
    const nivel = this.niveles.get(id) ?? 0;
    const color = this.op.colorDe?.(id);
    for (const el of this.elementos.get(id) ?? []) {
      el.classList.remove('objetivo', 'acierto', 'fallo', 'seleccion', 'nivel-1', 'nivel-2', 'nivel-3');
      if (nivel > 0) el.classList.add(`nivel-${nivel}`);
      if (color) el.style.setProperty('--color-pais', color);
      if (estado) el.classList.add(estado);
      if (reanimar) {
        // Reinicia la animación aunque el estado se repita.
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
    // Estrella y texto a tamaño constante en pantalla, aunque el mapa esté acercado.
    const grupo = document.createElementNS(SVG, 'g');
    grupo.setAttribute('transform', `translate(${x} ${y}) scale(${1 / this.vista.k})`);

    const estrella = document.createElementNS(SVG, 'path');
    estrella.setAttribute('class', 'estrella');
    estrella.setAttribute('d', rutaEstrella(0, 0, 9, 4));

    const texto = document.createElementNS(SVG, 'text');
    texto.setAttribute('class', 'etiqueta-capital');
    texto.textContent = pais.capital;
    // Etiqueta a la derecha, salvo que se salga de la pantalla.
    const enPantalla = this.vista.k * x + this.vista.x;
    const aLaIzquierda = enPantalla > this.ancho * 0.7;
    texto.setAttribute('x', String(aLaIzquierda ? -13 : 13));
    texto.setAttribute('y', '5');
    texto.setAttribute('text-anchor', aLaIzquierda ? 'end' : 'start');

    grupo.append(estrella, texto);
    this.capaCapital.append(grupo);
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

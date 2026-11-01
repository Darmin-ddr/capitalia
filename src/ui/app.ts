import { paises as todos, regiones } from '../data';
import { paisesActivos, paisesDeRegion as filtrarRegion } from '../logic/datos';
import { Almacen, almacenDelNavegador } from '../logic/almacen';
import {
  nivelesDe,
  registrarEscalon,
  registrarRespuesta,
  regionDominada,
  regionesDesbloqueadas,
} from '../logic/progreso';
import { crearSesionHoy, modoHoy, nuevosDeHoy, repasoAdelantado, repasosPendientes } from '../logic/hoy';
import type { Continente, Pais, Region } from '../logic/types';
import { Mapa } from '../map/mapa';
import { lanzarConfeti } from './confeti';
import { el } from './dom';
import type { Motor } from './comun';
import { iniciarExplorar, type Modo, type ServicioTrucos } from './explorar';
import { iniciarAprender } from './aprender';
import { iniciarHoy } from './hoy';
import { prepararSelectorRegiones } from './regiones';
import { prepararMas } from './mas';
import { crearGuia } from './guia';
import { crearAcercaDe } from './acerca';
import { crearBienvenida } from './bienvenida';
import { crearPanelAdultos } from './panel';
import { regionesConExamen } from '../logic/adultos';
import { nivelDominio } from '../logic/progreso';

type Pestana = 'hoy' | 'aprender' | 'explorar';

/** Duración del rótulo con el nombre de la región cuando Hoy cambia el mapa de región. */
const ROTULO_REGION_MS = 1100;

/**
 * Estado y orquestación de la app: progreso guardado, región actual, mapa,
 * pestañas y avisos (región dominada, región desbloqueada).
 */
export function iniciarApp(): void {
  const almacen = new Almacen(almacenDelNavegador());
  let estado = almacen.cargar();
  const panel = document.getElementById('panel')!;
  const contenedorMapa = document.getElementById('mapa')!;
  const avisos = document.getElementById('avisos')!;
  const botonesPestana = document.querySelectorAll<HTMLButtonElement>('.modo');

  let activos: Pais[] = [];
  let region: Region = regiones[0];
  let mapa: Mapa | null = null;
  let modo: Modo | null = null;
  let pestana: Pestana = 'hoy';
  let actualizarSelector: (() => void) | null = null;

  const regionDe = (id: string) => regiones.find((r) => r.id === id);
  const paisesDeRegion = (regionId: string) => filtrarRegion(activos, regionId);
  const regionesDe = (c: Continente) => regiones.filter((r) => r.continente === c).sort((a, b) => a.orden - b.orden);
  /** Desbloqueadas por progreso, más las que tienen países del examen (para poder prepararlo). */
  const desbloqueadas = (c: Continente) => {
    if (estado.ajustes.todasDesbloqueadas) return new Set(regionesDe(c).map((r) => r.id));
    const abiertas = regionesDesbloqueadas(estado, regionesDe(c), paisesDeRegion);
    for (const id of regionesConExamen(estado.ajustes.listaExamen, activos)) if (regionDe(id)?.continente === c) abiertas.add(id);
    return abiertas;
  };
  const enExamen = (p: Pais) => estado.ajustes.listaExamen?.includes(p.id) ?? false;
  /** Países de las regiones abiertas de los dos continentes (de ahí sale Hoy). */
  const disponibles = () => {
    const abiertas = new Set([...desbloqueadas('europa'), ...desbloqueadas('asia')]);
    return activos.filter((p) => abiertas.has(p.region));
  };
  /** Regiones en el orden en que Hoy saca países nuevos: la actual primero, luego las de su continente. */
  const ordenRegiones = () => {
    const otro: Continente = region.continente === 'europa' ? 'asia' : 'europa';
    return [region.id, ...regionesDe(region.continente).map((r) => r.id), ...regionesDe(otro).map((r) => r.id)];
  };
  /** Países del continente de la región actual (el mapa los colorea por dominio). */
  const paisesContinente = () => activos.filter((p) => p.continentes.includes(region.continente));

  function guardar(): void {
    if (!almacen.guardar(estado)) mostrarAvisoAlmacen();
  }

  function mostrarAvisoAlmacen(): void {
    if (document.getElementById('aviso-almacen')) return;
    const aviso = el('p', 'aviso-almacen', 'Este navegador no deja guardar el progreso: lo que hagas se perderá al cerrar.');
    aviso.id = 'aviso-almacen';
    document.querySelector('.app')!.append(aviso);
  }

  function avisar(texto: string): void {
    const t = el('div', 'aviso', texto);
    avisos.append(t);
    window.setTimeout(() => t.classList.add('saliendo'), 3500);
    window.setTimeout(() => t.remove(), 4000);
  }

  function actualizarNiveles(): void {
    mapa?.setNiveles(nivelesDe(estado, paisesContinente()));
  }

  const trucos: ServicioTrucos = {
    predefinido(id) {
      if (estado.ajustes.trucosDesactivados.includes(id)) return null;
      return estado.ajustes.trucosEditados[id] ?? todos.find((p) => p.id === id)?.trucos[0]?.texto ?? null;
    },
    propio: (id) => estado.trucosPropios[id] ?? null,
    guardarPropio(id, texto) {
      if (texto) estado.trucosPropios[id] = texto;
      else delete estado.trucosPropios[id];
      guardar();
    },
  };

  const motor: Motor = {
    registrar(paisId, modoId, resultado, tiempoMs, opciones) {
      const antes = desbloqueadas(region.continente);
      registrarRespuesta(estado, paisId, modoId, resultado, tiempoMs, new Date(), opciones);
      // Un país priorizado (fallado en un examen) deja de serlo al acertarlo fuera del examen.
      if (resultado === 'acierto' && !opciones?.examen) estado.prioridad = estado.prioridad.filter((x) => x !== paisId);
      // El examen mide; no hace subir de escalón (SPEC 4.4).
      const cambio = opciones?.examen
        ? { subio: false, aprendido: false }
        : registrarEscalon(estado, paisId, modoId, opciones?.escalon ?? resultado);
      guardar();
      actualizarNiveles();
      comprobarHitos(antes);
      return cambio;
    },
    truco: (id) => trucos.propio(id) ?? trucos.predefinido(id),
  };

  /** Celebraciones grandes solo al dominar una región (SPEC 5.1) y aviso de región nueva. */
  function comprobarHitos(antes: Set<string>): void {
    for (const r of regionesDe(region.continente)) {
      if (!estado.regionesCelebradas.includes(r.id) && regionDominada(estado, paisesDeRegion(r.id))) {
        estado.regionesCelebradas.push(r.id);
        guardar();
        lanzarConfeti();
        avisar(`¡Has dominado ${r.nombre}!`);
      }
    }
    for (const id of desbloqueadas(region.continente)) {
      if (!antes.has(id)) avisar(`Nueva región disponible: ${regionDe(id)?.nombre ?? id}`);
    }
  }

  /** Color del país en el mapa del continente actual (Rusia y Turquía cambian según el mapa). */
  function colorEnContinente(id: string): string {
    const p = activos.find((x) => x.id === id);
    if (!p) return '#cccccc';
    const ids = [p.region, ...(p.regionesExtra ?? [])];
    const r = ids.map(regionDe).find((x) => x?.continente === region.continente);
    return r?.color ?? '#cccccc';
  }

  function montarMapa(): void {
    mapa?.destruir();
    const paisesRegion = paisesDeRegion(region.id);
    mapa = new Mapa({
      contenedor: contenedorMapa,
      paises: todos,
      activos: new Set(activos.map((p) => p.id)),
      region: paisesRegion,
      contexto: paisesContinente(),
      fueraDeEncuadre: new Set(paisesRegion.filter((p) => p.regionesExtra?.includes(region.id)).map((p) => p.id)),
      colorDe: (id) => colorEnContinente(id),
      onSeleccion: (id) => modo?.alSeleccionarPais(id),
    });
    actualizarNiveles();
    document.documentElement.style.setProperty('--region-base', region.color);
    actualizarSelector?.();
  }

  function cambiarPestana(nueva: Pestana): void {
    modo?.salir();
    pestana = nueva;
    for (const b of botonesPestana) b.setAttribute('aria-pressed', String(b.dataset.modo === nueva));
    if (!mapa) return;
    const paisesRegion = paisesDeRegion(region.id);
    const ctx = {
      mapa,
      region: paisesRegion,
      candidatos: activos,
      rng: Math.random,
      alExplorar: () => cambiarPestana('explorar'),
      motor,
    };
    if (nueva === 'explorar') modo = iniciarExplorar(panel, mapa, paisesRegion, trucos);
    else if (nueva === 'aprender') modo = iniciarAprender(panel, ctx, () => estado);
    else modo = iniciarHoy(panel, serviciosHoy());
  }

  function serviciosHoy() {
    const prioridad = () => new Set([...estado.prioridad, ...(estado.ajustes.listaExamen ?? [])]);
    return {
      motor,
      candidatos: activos,
      rng: Math.random,
      sesion() {
        const ahora = new Date();
        const pendientes = repasosPendientes(estado, disponibles(), ahora).length;
        return crearSesionHoy({
          estado,
          disponibles: disponibles(),
          ordenRegiones: ordenRegiones(),
          prioridad: prioridad(),
          nuevos: nuevosDeHoy(estado, pendientes, ahora),
          ahora,
          rng: Math.random,
        });
      },
      adelantado: () => repasoAdelantado(estado, disponibles()),
      modoPara: (id: string) => modoHoy(estado, id, Math.random),
      mapaPara(pais: Pais) {
        const enEsta = paisesDeRegion(region.id).some((p) => p.id === pais.id);
        let transicionMs = 0;
        if (!enEsta && regionDe(pais.region)) {
          region = regionDe(pais.region)!;
          montarMapa();
          transicionMs = mostrarRotuloRegion(region.nombre);
        }
        return { mapa: mapa!, region: paisesDeRegion(region.id), transicionMs };
      },
      mapaActual: () => mapa,
      irAAprender: () => cambiarPestana('aprender'),
      alExplorar: () => cambiarPestana('explorar'),
    };
  }

  /** Rótulo con el nombre de la región sobre el mapa recién cambiado. Devuelve cuánto dura. */
  function mostrarRotuloRegion(nombre: string): number {
    contenedorMapa.querySelector('.rotulo-region')?.remove();
    const rotulo = el('div', 'rotulo-region', nombre);
    rotulo.setAttribute('aria-hidden', 'true');
    contenedorMapa.append(rotulo);
    window.setTimeout(() => rotulo.classList.add('saliendo'), ROTULO_REGION_MS - 250);
    window.setTimeout(() => rotulo.remove(), ROTULO_REGION_MS);
    return ROTULO_REGION_MS;
  }

  /** Cambia la región en estudio (la recuerda para la próxima vez). */
  function irARegion(id: string): void {
    const r = regionDe(id);
    if (!r) return;
    modo?.salir();
    modo = null;
    region = r;
    estado.ultimaRegion = id;
    guardar();
    montarMapa();
    cambiarPestana(pestana);
  }

  function recalcularActivos(): void {
    activos = paisesActivos(todos, new Set(estado.ajustes.opcionalesActivados));
  }

  // --- Arranque ---
  recalcularActivos();
  const guardada = estado.ultimaRegion ? regionDe(estado.ultimaRegion) : undefined;
  if (guardada && desbloqueadas(guardada.continente).has(guardada.id)) region = guardada;
  if (!almacen.disponible) mostrarAvisoAlmacen();
  // Pedir almacenamiento persistente (Safari puede borrar datos de webs poco visitadas).
  void navigator.storage?.persist?.().catch(() => undefined);

  for (const b of botonesPestana) b.addEventListener('click', () => cambiarPestana(b.dataset.modo as Pestana));
  actualizarSelector = prepararSelectorRegiones(document.getElementById('region-actual') as HTMLButtonElement, {
    regiones,
    paisesDe: paisesDeRegion,
    desbloqueadas,
    nivel: (id) => nivelDominio(estado.tarjetas[id]),
    actual: () => region,
    elegir: irARegion,
    conExamen: (id) => paisesDeRegion(id).filter(enExamen).length,
  });
  const abrirPanel = crearPanelAdultos({
    estado: () => estado,
    guardar,
    regiones,
    paisesDe: paisesDeRegion,
    todos,
    recargar: () => window.location.reload(),
  });
  const abrirGuia = crearGuia({
    paisParaTaller() {
      const sinTruco = paisesDeRegion(region.id).filter((p) => !estado.trucosPropios[p.id]);
      if (!sinTruco.length) return null;
      // Primero, el que más ha fallado: es donde un truco propio sirve de verdad.
      const fallos = new Map<string, number>();
      for (const r of estado.historial) if (r.res === 'fallo') fallos.set(r.pais, (fallos.get(r.pais) ?? 0) + 1);
      const masFallado = [...sinTruco].sort((a, b) => (fallos.get(b.id) ?? 0) - (fallos.get(a.id) ?? 0))[0];
      if ((fallos.get(masFallado.id) ?? 0) > 0) return masFallado;
      // Si aún no ha fallado nada, uno sin truco predefinido, al azar.
      const sinNinguno = sinTruco.filter((p) => !trucos.predefinido(p.id));
      const lista = sinNinguno.length ? sinNinguno : sinTruco;
      return lista[Math.floor(Math.random() * lista.length)];
    },
    guardarTruco: (id, texto) => trucos.guardarPropio(id, texto),
    alCerrar() {
      if (!estado.guiaVista) {
        estado.guiaVista = true;
        guardar();
      }
    },
    alEmpezar: () => cambiarPestana('hoy'),
  });
  const { abrirBienvenida, abrirGuiaAdultos } = crearBienvenida({
    abrirGuiaAlumno: abrirGuia,
    abrirPanel,
    alElegir() {
      if (!estado.bienvenidaVista) {
        estado.bienvenidaVista = true;
        guardar();
      }
    },
  });
  prepararMas(document.getElementById('boton-mas') as HTMLButtonElement, {
    abrirGuia,
    abrirGuiaAdultos,
    abrirAcercaDe: crearAcercaDe(),
    abrirPanelAdultos: abrirPanel,
    estado: () => estado,
    reemplazar(nuevo) {
      estado = nuevo;
      guardar();
      // Lo más sencillo y seguro: volver a arrancar con el progreso importado.
      window.location.reload();
    },
  });
  montarMapa();
  cambiarPestana('hoy');
  // Primer arranque: "¿quién eres?". Después, si el alumno aún no ha visto su guía, se le abre sola.
  if (!estado.bienvenidaVista) abrirBienvenida();
  else if (!estado.guiaVista) abrirGuia();

}

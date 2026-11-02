import { paises as todos, regiones } from '../data';
import { paisesActivos, paisesDeRegion as filtrarRegion } from '../logic/datos';
import { Almacen, CLAVE, almacenDelNavegador, type AlmacenTexto } from '../logic/almacen';
import {
  borrarPerfil, cargarIndice, claveProgreso, crearPerfil, guardarIndice, perfilDe, type IndicePerfiles,
} from '../logic/perfiles';
import { elegirAlumno, nuevoAlumno } from './perfiles';
import { estadoVacio } from '../logic/progreso';
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
import { iniciarExamen } from './examen';
import { alCambiarInstalacion, avisoDescartado, crearInstalar, descartarAviso, formaInstalar } from './instalar';
import { prepararSelectorRegiones } from './regiones';
import { prepararMas } from './mas';
import { crearGuia } from './guia';
import { crearAcercaDe } from './acerca';
import { crearBienvenida } from './bienvenida';
import { crearPanelAdultos } from './panel';
import { diasHastaExamen, regionesConExamen } from '../logic/adultos';
import { nivelMapa } from '../logic/progreso';
import { continenteQueToca, continentesCurso, ordenCurso, paisesDeHoy, resumenPortada } from '../logic/portada';

type Pestana = 'hoy' | 'aprender' | 'examen' | 'explorar';

/** Duración del rótulo con el nombre de la región cuando Hoy cambia el mapa de región. */
const ROTULO_REGION_MS = 1100;

const NOMBRE_CONTINENTE: Record<Continente, string> = { europa: 'Europa', asia: 'Asia' };
/** Prefijo de las "regiones" que son un continente entero (Aprender y Explorar, y la portada de Hoy). */
const PREFIJO_CONTINENTE = 'continente-';
const esContinente = (r: Region) => r.id.startsWith(PREFIJO_CONTINENTE);

/**
 * Estado y orquestación de la app: progreso guardado, región actual, mapa,
 * pestañas y avisos (región dominada, región desbloqueada).
 */
/** Alumno elegido en esta visita (al abrir de nuevo la app, se vuelve a preguntar si hay varios). */
const CLAVE_ELEGIDO = 'capitalia-perfil-elegido';

function leerElegido(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_ELEGIDO);
  } catch {
    return null;
  }
}

function marcarElegido(id: string): void {
  try {
    sessionStorage.setItem(CLAVE_ELEGIDO, id);
  } catch {
    /* sin almacenamiento de sesión: se preguntará al recargar */
  }
}

/** PIN del progreso de antes de los perfiles (para que el índice nuevo lo herede). */
function pinDelPrimero(backend: AlmacenTexto | null): string | null {
  try {
    const d = JSON.parse(backend?.getItem(CLAVE) ?? 'null') as { ajustes?: { pinHash?: unknown } } | null;
    return typeof d?.ajustes?.pinHash === 'string' ? d.ajustes.pinHash : null;
  } catch {
    return null;
  }
}

/**
 * Arranque: con dos o más alumnos en el dispositivo, "¿Quién va a estudiar?"
 * cada vez que se abre la app (para no mezclar progresos); con uno, directo.
 */
export function iniciarApp(): void {
  const backend = almacenDelNavegador();
  const indice = cargarIndice(backend, pinDelPrimero(backend));
  guardarIndice(backend, indice);
  const elegido = leerElegido();
  if (elegido && perfilDe(indice, elegido)) {
    arrancarCon(backend, indice, elegido);
    return;
  }
  if (indice.perfiles.length < 2) {
    arrancarCon(backend, indice, indice.ultimo);
    return;
  }
  const preguntar = () =>
    elegirAlumno(indice, {
      obligatorio: true,
      alElegir(id) {
        indice.ultimo = id;
        guardarIndice(backend, indice);
        marcarElegido(id);
        arrancarCon(backend, indice, id);
      },
      alAnadir: () => anadirAlumno(backend, indice, preguntar),
    });
  preguntar();
}

/** Añade un alumno (con progreso vacío y el PIN común) y entra con él. */
function anadirAlumno(backend: AlmacenTexto | null, indice: IndicePerfiles, alCancelar: () => void): void {
  nuevoAlumno(indice, {
    alCrear(nombre, imagen, nombrePrimero) {
      if (nombrePrimero) indice.perfiles[0].nombre = nombrePrimero;
      const p = crearPerfil(indice, nombre, imagen);
      const nuevo = estadoVacio();
      nuevo.ajustes.pinHash = indice.pinHash;
      // La bienvenida ("¿quién la abre?") ya se vio en este dispositivo; la guía del alumno, no.
      nuevo.bienvenidaVista = true;
      new Almacen(backend, claveProgreso(p.id)).guardar(nuevo);
      entrarComo(backend, indice, p.id);
    },
    alCancelar,
  });
}

/** Cambia de alumno: se recuerda y se vuelve a arrancar la app con su progreso. */
function entrarComo(backend: AlmacenTexto | null, indice: IndicePerfiles, id: string): void {
  indice.ultimo = id;
  guardarIndice(backend, indice);
  marcarElegido(id);
  window.location.reload();
}

/** Tras este tiempo con la app oculta, al volver se pregunta otra vez quién estudia. */
const PAUSA_PREGUNTAR_MS = 10 * 60 * 1000;

/**
 * Con dos o más alumnos, si la app ha estado oculta (en segundo plano, otra
 * pestaña) más de PAUSA_PREGUNTAR_MS, al volver pregunta "¿Quién va a estudiar?".
 * En iPhone y iPad volver a la app solo la reanuda: sin esto, un hermano podría
 * seguir en el perfil del otro. Si es el mismo alumno, sigue donde estaba (sin recargar).
 */
function vigilarVueltas(backend: AlmacenTexto | null, indice: IndicePerfiles, perfilId: string): void {
  let ocultaDesde: number | null = null;
  let preguntando = false;
  const preguntar = () => {
    preguntando = true;
    elegirAlumno(indice, {
      obligatorio: true,
      actual: perfilId,
      alElegir(id) {
        preguntando = false;
        if (id !== perfilId) entrarComo(backend, indice, id);
      },
      alAnadir: () => anadirAlumno(backend, indice, preguntar),
    });
  };
  document.addEventListener('visibilitychange', () => {
    if (indice.perfiles.length < 2) return;
    if (document.visibilityState === 'hidden') {
      ocultaDesde = Date.now();
      return;
    }
    const pausa = ocultaDesde === null ? 0 : Date.now() - ocultaDesde;
    ocultaDesde = null;
    if (pausa >= PAUSA_PREGUNTAR_MS && !preguntando) preguntar();
  });
}

function arrancarCon(backend: AlmacenTexto | null, indice: IndicePerfiles, perfilId: string): void {
  const almacen = new Almacen(backend, claveProgreso(perfilId));
  let estado = almacen.cargar();
  // El PIN del panel es común a todos los alumnos.
  if (indice.pinHash) estado.ajustes.pinHash = indice.pinHash;
  const perfil = perfilDe(indice, perfilId)!;
  const variosAlumnos = () => indice.perfiles.length >= 2;
  const cambiarAlumno = () =>
    elegirAlumno(indice, {
      obligatorio: false,
      actual: perfilId,
      alElegir: (id) => {
        if (id !== perfilId) entrarComo(backend, indice, id);
      },
      alAnadir: () => anadirAlumno(backend, indice, () => undefined),
    });
  vigilarVueltas(backend, indice, perfilId);
  const panel = document.getElementById('panel')!;
  const contenedorMapa = document.getElementById('mapa')!;
  const avisos = document.getElementById('avisos')!;
  const botonesPestana = document.querySelectorAll<HTMLButtonElement>('.modo');

  let activos: Pais[] = [];
  /** Región del mapa en este momento (Hoy la mueve; el examen pone el suyo). */
  let region: Region = regiones[0];
  /** Región que ha elegido el alumno en el selector (Aprender y Explorar vuelven a ella). */
  let regionElegida: Region = regiones[0];
  let mapa: Mapa | null = null;
  let modo: Modo | null = null;
  let pestana: Pestana = 'hoy';
  let actualizarSelector: (() => void) | null = null;
  /** El mapa montado es el mudo del examen (continente entero), no el de la región. */
  let mapaDeExamen = false;
  const botonRegion = document.getElementById('region-actual') as HTMLButtonElement;

  /** "Europa entera" y "Asia entera": se usan como una región más (SPEC 4.1). */
  const regionesContinente: Region[] = continentesCurso(regiones).map((c) => ({
    id: PREFIJO_CONTINENTE + c,
    nombre: `${NOMBRE_CONTINENTE[c]} entera`,
    continente: c,
    orden: 0,
    color: '#cfd8e3',
  }));
  const regionDe = (id: string) => regiones.find((r) => r.id === id) ?? regionesContinente.find((r) => r.id === id);
  const regionContinente = (c: Continente) => regionesContinente.find((r) => r.continente === c)!;
  const paisesDeRegion = (regionId: string) => {
    const r = regionDe(regionId);
    return r && esContinente(r) ? activos.filter((p) => p.continentes.includes(r.continente)) : filtrarRegion(activos, regionId);
  };
  const regionesDe = (c: Continente) => regiones.filter((r) => r.continente === c).sort((a, b) => a.orden - b.orden);
  /** Desbloqueadas por progreso, más las que tienen países del examen (para poder prepararlo). */
  const desbloqueadas = (c: Continente) => {
    if (estado.ajustes.todasDesbloqueadas) return new Set(regionesDe(c).map((r) => r.id));
    const abiertas = regionesDesbloqueadas(estado, regionesDe(c), paisesDeRegion);
    for (const id of regionesConExamen(estado.ajustes.listaExamen, activos)) if (regionDe(id)?.continente === c) abiertas.add(id);
    return abiertas;
  };
  /** El continente entero se abre cuando lo están todas sus regiones. */
  const continenteAbierto = (c: Continente) => {
    const abiertas = desbloqueadas(c);
    return regionesDe(c).every((r) => abiertas.has(r.id));
  };
  const regionAbierta = (r: Region) => (esContinente(r) ? continenteAbierto(r.continente) : desbloqueadas(r.continente).has(r.id));
  const enExamen = (p: Pais) => estado.ajustes.listaExamen?.includes(p.id) ?? false;
  /**
   * Países de Hoy: todos, también los de regiones aún cerradas en el selector y los de
   * continentes que se añadan en el futuro. Los nuevos salen por orden del curso, y
   * empezar un país abre su región (`regionesDesbloqueadas`).
   */
  const disponibles = () => paisesDeHoy(activos, estado.ajustes.focoHoy);
  /** Todas las regiones abiertas, de todos los continentes. */
  const todasAbiertas = () => new Set(continentesCurso(regiones).flatMap((c) => [...desbloqueadas(c)]));
  /** Orden en que Hoy saca países nuevos: el del curso (Europa y luego Asia, cada una por regiones). */
  const ordenRegiones = () => {
    const foco = estado.ajustes.focoHoy;
    // Con un solo continente, solo sus regiones: Rusia y Turquía (de región principal europea) van al final, no primero.
    return ordenCurso(regiones)
      .filter((r) => !foco || r.continente === foco)
      .map((r) => r.id);
  };
  /** Región en cuyo mapa se pregunta un país en Hoy: la principal o, con un solo continente, la suya de ese continente. */
  const regionEnHoy = (pais: Pais) => {
    const foco = estado.ajustes.focoHoy;
    const ids = [pais.region, ...(pais.regionesExtra ?? [])];
    return (foco && ids.map(regionDe).find((r) => r?.continente === foco)) || regionDe(pais.region);
  };
  /** Países del continente de la región actual (el mapa los colorea por dominio). */
  const paisesContinente = () => activos.filter((p) => p.continentes.includes(region.continente));

  function guardar(): void {
    if (!almacen.guardar(estado)) mostrarAvisoAlmacen();
    if (estado.ajustes.pinHash !== indice.pinHash) {
      indice.pinHash = estado.ajustes.pinHash;
      guardarIndice(backend, indice);
    }
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
    // El mapa mudo del examen no lleva colores de progreso (SPEC 4.4): delatarían las respuestas.
    if (mapaDeExamen) return;
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
      const antes = todasAbiertas();
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
    for (const r of regiones) {
      if (!estado.regionesCelebradas.includes(r.id) && regionDominada(estado, paisesDeRegion(r.id))) {
        estado.regionesCelebradas.push(r.id);
        guardar();
        lanzarConfeti();
        avisar(`¡Has dominado ${r.nombre}!`);
      }
    }
    for (const id of todasAbiertas()) {
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
    mapaDeExamen = false;
    const paisesRegion = paisesDeRegion(region.id);
    mapa = new Mapa({
      contenedor: contenedorMapa,
      paises: todos,
      activos: new Set(activos.map((p) => p.id)),
      region: paisesRegion,
      contexto: paisesContinente(),
      fueraDeEncuadre: new Set(paisesRegion.filter((p) => p.regionesExtra?.includes(region.id)).map((p) => p.id)),
      circulosSoloMicroestados: esContinente(region),
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
    // Hoy y el examen no usan el selector: eligen ellos el mapa.
    botonRegion.hidden = nueva === 'hoy' || nueva === 'examen';
    if (nueva === 'hoy') {
      // Portada: el continente que toca, coloreado según lo aprendido.
      region = regionContinente(estado.ajustes.focoHoy ?? continenteQueToca(estado, activos, regiones));
      montarMapa();
    } else if (nueva !== 'examen' && (mapaDeExamen || region.id !== regionElegida.id)) {
      // Aprender y Explorar vuelven a la región elegida, aunque Hoy haya movido el mapa.
      region = regionElegida;
      montarMapa();
    }
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
    else if (nueva === 'examen') modo = iniciarExamen(panel, serviciosExamen());
    else modo = iniciarHoy(panel, serviciosHoy());
  }

  function serviciosExamen() {
    return {
      motor,
      candidatos: activos,
      rng: Math.random,
      listaExamen: () => estado.ajustes.listaExamen,
      ambitoInicial: () => estado.ajustes.focoHoy,
      mapaContinente(continente: Continente, paises: readonly Pais[]) {
        // Mapa mudo del continente: sin colores de región ni de progreso (SPEC 4.4).
        const cambio = mapaDeExamen;
        mapa?.destruir();
        mapa = new Mapa({
          contenedor: contenedorMapa,
          paises: todos,
          activos: new Set(activos.map((p) => p.id)),
          region: paises,
          circulosSoloMicroestados: true,
          onSeleccion: () => undefined,
        });
        mapaDeExamen = true;
        botonRegion.hidden = true;
        return { mapa, transicionMs: cambio ? mostrarRotuloRegion(continente === 'europa' ? 'Europa' : 'Asia') : 0 };
      },
      priorizar(ids: readonly string[]) {
        estado.prioridad = [...new Set([...estado.prioridad, ...ids])];
        guardar();
      },
    };
  }

  const abrirInstalar = crearInstalar();
  /** Aviso de instalar en la portada: desde el segundo día de uso, si no está instalada ni se ha descartado. */
  const tocaAvisoInstalar = () => {
    if (formaInstalar() === 'instalada' || avisoDescartado()) return false;
    const hoy = new Date().toDateString();
    return estado.historial.some((r) => new Date(r.t).toDateString() !== hoy);
  };

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
      resumen: () => resumenPortada(estado, activos, continentesCurso(regiones), new Date()),
      diasExamen: () => (estado.ajustes.listaExamen?.length ? diasHastaExamen(estado.ajustes.fechaExamen, new Date()) : null),
      continentes: continentesCurso(regiones),
      nombreContinente: (c: Continente) => NOMBRE_CONTINENTE[c],
      continenteMapa: () => region.continente,
      verContinente(c: Continente) {
        region = regionContinente(c);
        montarMapa();
      },
      alumno: () => (variosAlumnos() ? perfil : null),
      cambiarAlumno,
      avisoInstalar: tocaAvisoInstalar,
      instalar: abrirInstalar,
      descartarInstalar: descartarAviso,
      instalada: () => formaInstalar() === 'instalada',
      alCambiarInstalacion,
      foco: () => estado.ajustes.focoHoy,
      ponerFoco(c: Continente | null) {
        estado.ajustes.focoHoy = c;
        guardar();
        cambiarPestana('hoy');
        // Que se vea el aviso de arriba (en el móvil, el selector queda abajo del todo).
        panel.scrollTop = 0;
      },
      modoPara: (id: string) => modoHoy(estado, id, Math.random),
      mapaPara(pais: Pais) {
        // En Hoy las preguntas van siempre en el mapa de su región (no en el del continente entero de la portada).
        const enEsta = !esContinente(region) && paisesDeRegion(region.id).some((p) => p.id === pais.id);
        let transicionMs = 0;
        const destino = regionEnHoy(pais);
        if (!enEsta && destino) {
          region = destino;
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
    regionElegida = r;
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
  if (guardada && regionAbierta(guardada)) region = regionElegida = guardada;
  if (!almacen.disponible) mostrarAvisoAlmacen();
  // Pedir almacenamiento persistente (Safari puede borrar datos de webs poco visitadas).
  void navigator.storage?.persist?.().catch(() => undefined);

  for (const b of botonesPestana) b.addEventListener('click', () => cambiarPestana(b.dataset.modo as Pestana));
  actualizarSelector = prepararSelectorRegiones(botonRegion, {
    regiones,
    entero: (c) => ({ region: regionContinente(c), abierto: continenteAbierto(c) }),
    paisesDe: paisesDeRegion,
    desbloqueadas,
    nivel: (id) => nivelMapa(estado, id),
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
    alumnos: () => ({ perfiles: indice.perfiles, actual: perfilId }),
    borrarAlumno(id: string) {
      if (id === perfilId || !borrarPerfil(indice, id)) return false;
      try {
        backend?.removeItem(claveProgreso(id));
      } catch {
        /* sin almacenamiento: no queda nada que borrar */
      }
      guardarIndice(backend, indice);
      return true;
    },
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
    alumno: () => ({ perfil, varios: variosAlumnos() }),
    cambiarAlumno,
    anadirAlumno: () => anadirAlumno(backend, indice, () => undefined),
    abrirGuia,
    abrirInstalar: () => (formaInstalar() === 'instalada' ? null : abrirInstalar),
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

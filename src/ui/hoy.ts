import type { ModoId } from '../logic/config';
import { ColaHoy, type ItemHoy } from '../logic/hoy';
import { mensajeResumen } from '../logic/mensajes';
import type { Rng } from '../logic/rng';
import type { Resultado } from '../logic/sesion';
import type { Pais } from '../logic/types';
import type { Mapa } from '../map/mapa';
import { boton, el, rellenar } from './dom';
import { PAUSA_TRAS_ACIERTO_MS, Teclado, progreso, type Motor } from './comun';
import type { Modo } from './explorar';
import { preguntaAlReves, preguntaElegir, preguntaEscribir, preguntaMapaMudo, type ControlPregunta, type Renderizador } from './preguntas';

const RENDERIZADORES: Partial<Record<ModoId, Renderizador>> = {
  elegir: preguntaElegir,
  escribir: preguntaEscribir,
  alreves: preguntaAlReves,
  mapamudo: preguntaMapaMudo,
};

/** Lo que Hoy necesita de la app. */
export interface ServiciosHoy {
  motor: Motor;
  /** Todos los países activos (distractores y validación). */
  candidatos: readonly Pais[];
  rng: Rng;
  /** Sesión de hoy (vacía si no queda nada) y repaso adelantado. */
  sesion: () => ItemHoy[];
  adelantado: () => ItemHoy[];
  /** Tipo de pregunta de un país en este momento (según su escalón o, si está aprendido, variado). */
  modoPara: (paisId: string) => ModoId;
  /** Mapa con la región del país (lo cambia si hace falta) y cuánto dura el rótulo de la región nueva (0 si no cambia). */
  mapaPara: (pais: Pais) => { mapa: Mapa; region: readonly Pais[]; transicionMs: number };
  /** Mapa actual (para limpiarlo al salir). */
  mapaActual: () => Mapa | null;
  irAAprender: () => void;
  alExplorar: () => void;
}

const TIPOS: Record<ItemHoy['tipo'], string> = { repaso: 'repasos', aprendiendo: 'en aprendizaje', nuevo: 'nuevos' };

/**
 * Pestaña "Hoy" (SPEC 4.1 y 7): la rutina diaria. Repasos de lo aprendido,
 * países en aprendizaje y nuevos intercalados (cada nuevo sale dos veces).
 * Las preguntas pueden ser de cualquier región abierta: el mapa salta a la
 * región del país con un rótulo, y el tiempo cuenta desde que el mapa está quieto.
 */
export function iniciarHoy(panel: HTMLElement, s: ServiciosHoy): Modo {
  const contenedor = el('div', 'contenido-modo');
  panel.replaceChildren(contenedor);
  const teclado = new Teclado();
  let cola: ColaHoy | null = null;
  let control: ControlPregunta = {};
  let temporizador: number | undefined;
  let nuevosVistos = new Set<string>();
  let tiposPorPais = new Map<string, ItemHoy['tipo']>();
  let adelantando = false;

  function limpiarMapa(): void {
    const mapa = s.mapaActual();
    mapa?.limpiarEstados();
    mapa?.mostrarCapital(null);
  }

  function nombre(id: string): string {
    return s.candidatos.find((p) => p.id === id)?.nombre ?? id;
  }

  function pintarInicio(): void {
    const items = s.sesion();
    teclado.usar(null);
    if (!items.length) {
      pintarNadaQueHacer();
      return;
    }
    const cuenta = new Map<ItemHoy['tipo'], Set<string>>();
    for (const i of items) {
      const c = cuenta.get(i.tipo) ?? new Set();
      c.add(i.paisId);
      cuenta.set(i.tipo, c);
    }
    const partes = (['repaso', 'aprendiendo', 'nuevo'] as const)
      .filter((t) => cuenta.get(t)?.size)
      .map((t) => el('li', '', el('strong', '', String(cuenta.get(t)!.size)), ` ${TIPOS[t]}`));
    const empezar = boton('Empezar', 'boton-principal', () => empezarSesion(items, false));
    contenedor.replaceChildren(
      el('h2', 'titulo-panel', 'Hoy'),
      el('p', 'ayuda', `${items.length} preguntas. Los países nuevos salen dos veces, para fijarlos.`),
      el('ul', 'hoy-cuentas', ...partes),
      el('div', 'acciones', empezar),
    );
    empezar.focus({ preventScroll: true });
  }

  function pintarNadaQueHacer(): void {
    const hayAdelantado = s.adelantado().length > 0;
    const principal = hayAdelantado
      ? boton('Repasar un poco más', 'boton-principal', () => empezarSesion(s.adelantado(), true))
      : boton('Ir a Aprender', 'boton-principal', s.irAAprender);
    rellenar(
      contenedor,
      el('h2', 'titulo-panel', 'Hoy'),
      el('p', 'resumen', 'Lo de hoy ya está hecho.'),
      el('p', 'ayuda', 'Mañana habrá más. Si te apetece seguir, puedes adelantar repasos o aprender en la pestaña Aprender.'),
      el('div', 'acciones', principal, hayAdelantado ? boton('Ir a Aprender', 'boton-secundario', s.irAAprender) : null),
    );
    principal.focus({ preventScroll: true });
  }

  function empezarSesion(items: ItemHoy[], adelantado: boolean): void {
    adelantando = adelantado;
    nuevosVistos = new Set(items.filter((i) => i.tipo === 'nuevo').map((i) => i.paisId));
    tiposPorPais = new Map(items.map((i) => [i.paisId, i.tipo]));
    // La sesión ya viene ordenada (por regiones, con los nuevos intercalados): no se baraja.
    cola = new ColaHoy(items.map((i) => ({ id: i.paisId, region: s.candidatos.find((p) => p.id === i.paisId)?.region ?? '' })));
    siguiente();
  }

  function siguiente(): void {
    window.clearTimeout(temporizador);
    limpiarMapa();
    control = {};
    const id = cola?.actual();
    if (!cola || !id) {
      pintarFinal();
      return;
    }
    const pais = s.candidatos.find((p) => p.id === id)!;
    const { mapa, region, transicionMs } = s.mapaPara(pais);
    const modo = s.modoPara(id);
    const renderizar = RENDERIZADORES[modo] ?? preguntaElegir;
    const { total } = cola.resumen();
    const etiqueta = tiposPorPais.get(id) === 'nuevo' ? ' · nuevo' : '';
    contenedor.replaceChildren(progreso(`${total - cola.pendientes() + 1} de ${total}${etiqueta}`));
    // El tiempo cuenta desde que el mapa está quieto (tras el rótulo de la región nueva).
    const inicio = performance.now() + transicionMs;
    let respondida = false;
    const actual = cola;
    control = renderizar({
      zona: contenedor,
      mapa,
      pais,
      region,
      candidatos: s.candidatos,
      rng: s.rng,
      teclado,
      truco: s.motor.truco(id),
      responder(resultado: Resultado, opciones) {
        if (respondida) return { recuperado: false };
        respondida = true;
        const r = actual.responder(opciones?.escalon ?? resultado);
        s.motor.registrar(id, modo, resultado, Math.max(0, performance.now() - inicio), { escalon: opciones?.escalon });
        if (resultado === 'acierto') temporizador = window.setTimeout(siguiente, PAUSA_TRAS_ACIERTO_MS + (r.recuperado ? 500 : 0));
        return { recuperado: r.recuperado };
      },
      siguiente,
    });
  }

  function pintarFinal(): void {
    teclado.usar(null);
    s.mapaActual()?.setInteractivo(false);
    const resumen = cola?.resumen() ?? { total: 0, aLaPrimera: 0, fallos: 0 };
    cola = null;
    const hayAdelantado = s.adelantado().length > 0;
    const seguir = hayAdelantado
      ? boton('Repasar un poco más', 'boton-principal', () => empezarSesion(s.adelantado(), true))
      : boton('Ir a Aprender', 'boton-principal', s.irAAprender);
    rellenar(
      contenedor,
      el('p', 'resumen-titulo', adelantando ? 'Repaso terminado' : 'Hoy, hecho'),
      el('p', 'resumen', mensajeResumen(resumen.aLaPrimera, resumen.total)),
      nuevosVistos.size
        ? el('p', 'resumen-escalones', el('strong', '', 'Nuevos de hoy: '), [...nuevosVistos].map(nombre).join(', '), '.')
        : null,
      el('div', 'acciones', seguir, hayAdelantado ? boton('Ir a Aprender', 'boton-secundario', s.irAAprender) : boton('Explorar el mapa', 'boton-secundario', s.alExplorar)),
    );
    seguir.focus({ preventScroll: true });
  }

  pintarInicio();

  return {
    alSeleccionarPais: (id) => control.alTocarPais?.(id),
    salir() {
      window.clearTimeout(temporizador);
      teclado.quitar();
      limpiarMapa();
    },
  };
}

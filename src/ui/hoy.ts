import type { ModoId } from '../logic/config';
import { ColaHoy, type ItemHoy } from '../logic/hoy';
import { mensajeResumen } from '../logic/mensajes';
import type { Rng } from '../logic/rng';
import type { Resultado } from '../logic/sesion';
import type { Continente, Pais } from '../logic/types';
import type { ResumenPortada } from '../logic/portada';
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
  /** Cifras de la portada. */
  resumen: () => ResumenPortada;
  /** Días hasta el examen del panel (null si no hay lista de examen o fecha). */
  diasExamen: () => number | null;
  /** Continentes del curso, su nombre, cuál muestra el mapa y cómo cambiarlo (portada). */
  continentes: readonly Continente[];
  nombreContinente: (c: Continente) => string;
  continenteMapa: () => Continente;
  verContinente: (c: Continente) => void;
  /** "Qué estudia Hoy": continente al que se limita (el resto, en pausa) o null para todo. */
  foco: () => Continente | null;
  ponerFoco: (c: Continente | null) => void;
  irAAprender: () => void;
  alExplorar: () => void;
}

const TIPOS: Record<ItemHoy['tipo'], string> = { repaso: 'repasos', aprendiendo: 'en aprendizaje', nuevo: 'nuevos' };
/** Segundos por pregunta para estimar la duración de la sesión. */
const SEGUNDOS_PREGUNTA = 25;

function textoDiasExamen(dias: number): string {
  if (dias > 1) return `faltan ${dias} días`;
  if (dias === 1) return 'es mañana';
  if (dias === 0) return 'es hoy';
  return 'ya pasó';
}

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

  /** Los continentes que quedan fuera cuando Hoy se limita a uno ("Asia", "Asia y América"...). */
  function enPausa(foco: Continente): string {
    return s.continentes
      .filter((c) => c !== foco)
      .map(s.nombreContinente)
      .join(' y ');
  }

  /** Aviso fijo mientras hay continentes en pausa: no es una preferencia, es que no salen. */
  function avisoPausa(): HTMLElement | null {
    const foco = s.foco();
    if (!foco) return null;
    const aviso = el(
      'div',
      'aviso-pausa',
      el('p', '', el('strong', '', `Solo ${s.nombreContinente(foco)}.`), ` ${enPausa(foco)}: en pausa. Hoy no te pregunta sus países, ni repasos ni nuevos, hasta que vuelvas a «Todo». No se pierde nada.`),
      boton('Volver a Todo', 'boton-secundario', () => s.ponerFoco(null)),
    );
    aviso.setAttribute('role', 'status');
    return aviso;
  }

  /** "Qué estudia Hoy": Todo o un solo continente. Sin confirmación: el aviso fijo explica el efecto y deshacerlo es un toque. */
  function bloqueFoco(): HTMLElement {
    const foco = s.foco();
    const opciones: { valor: Continente | null; texto: string }[] = [
      { valor: null, texto: 'Todo' },
      ...s.continentes.map((c) => ({ valor: c, texto: `Solo ${s.nombreContinente(c)}` })),
    ];
    const selector = el('div', 'selector-practica selector-foco');
    selector.setAttribute('role', 'group');
    selector.setAttribute('aria-label', 'Qué estudia Hoy');
    for (const o of opciones) {
      const b = boton(o.texto, 'selector-opcion', () => {
        if (o.valor !== foco) s.ponerFoco(o.valor);
      });
      b.setAttribute('aria-pressed', String(o.valor === foco));
      selector.append(b);
    }
    return el('div', 'campo-etiquetado bloque-foco', el('span', 'etiqueta-campo', 'Qué estudia Hoy'), selector);
  }

  /** Portada: cifras de lo aprendido (logros, sin rachas) y el continente que se ve en el mapa. */
  function bloqueProgreso(): HTMLElement {
    const r = s.resumen();
    const foco = s.foco();
    const barras = el('div', 'barras-continente');
    for (const c of r.porContinente) {
      const porcentaje = c.total ? Math.round((c.aprendidos / c.total) * 100) : 0;
      const relleno = el('span', 'barra-relleno');
      relleno.style.width = `${porcentaje}%`;
      const barra = el('span', 'barra-progreso', relleno);
      barra.setAttribute('role', 'img');
      barra.setAttribute('aria-label', `${s.nombreContinente(c.continente)}: ${c.aprendidos} de ${c.total} aprendidos`);
      barras.append(
        el(
          'div',
          `fila-continente${foco && foco !== c.continente ? ' pausada' : ''}`,
          el('span', 'fila-nombre', s.nombreContinente(c.continente), foco && foco !== c.continente ? el('span', 'etiqueta-pausa', 'en pausa') : null),
          barra,
          el('span', 'fila-cifra', `${c.aprendidos}/${c.total}`),
        ),
      );
    }
    const dias = s.diasExamen();
    const selector = el('div', 'selector-practica selector-mapa-portada');
    selector.setAttribute('role', 'group');
    selector.setAttribute('aria-label', 'Continente en el mapa');
    const botones = s.continentes.map((c) => {
      const b = boton(s.nombreContinente(c), 'selector-opcion', () => {
        s.verContinente(c);
        for (const x of botones) x.setAttribute('aria-pressed', String(x === b));
      });
      b.setAttribute('aria-pressed', String(s.continenteMapa() === c));
      return b;
    });
    selector.append(...botones);
    return el(
      'section',
      'portada-progreso',
      el('h3', 'dialogo-subtitulo', 'Tu progreso'),
      el('p', 'cifra-portada', el('strong', '', String(r.aprendidos)), ` de ${r.total} países aprendidos`),
      barras,
      r.aprendidosSemana > 0 ? el('p', 'ayuda', `Esta semana: ${r.aprendidosSemana} ${r.aprendidosSemana === 1 ? 'país aprendido' : 'países aprendidos'}.`) : null,
      r.examen
        ? el('p', 'ayuda', `Examen${dias !== null ? ` (${textoDiasExamen(dias)})` : ''}: ${r.examen.aprendidos} de ${r.examen.total} países aprendidos.`)
        : null,
      el('div', 'campo-etiquetado', el('span', 'etiqueta-campo', 'Ver en el mapa'), selector),
      bloqueFoco(),
    );
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
    const minutos = Math.max(1, Math.round((items.length * SEGUNDOS_PREGUNTA) / 60));
    rellenar(
      contenedor,
      el('h2', 'titulo-panel', 'Hoy'),
      avisoPausa(),
      el('p', 'resumen', `Hoy toca: ${items.length} preguntas, unos ${minutos} minutos.`),
      el('ul', 'hoy-cuentas', ...partes),
      cuenta.get('nuevo')?.size ? el('p', 'ayuda', 'Los países nuevos salen dos veces, para fijarlos.') : null,
      el('div', 'acciones', empezar),
      bloqueProgreso(),
    );
    empezar.focus({ preventScroll: true });
  }

  function pintarNadaQueHacer(): void {
    const hayAdelantado = s.adelantado().length > 0;
    const principal = hayAdelantado
      ? boton('Adelantar repasos', 'boton-principal', () => empezarSesion(s.adelantado(), true))
      : boton('Ir a Aprender', 'boton-principal', s.irAAprender);
    rellenar(
      contenedor,
      el('h2', 'titulo-panel', 'Hoy'),
      avisoPausa(),
      el('p', 'resumen', 'Lo de hoy ya está hecho.'),
      el(
        'p',
        'ayuda',
        hayAdelantado
          ? 'Mañana habrá más. Si te apetece seguir, puedes adelantar los repasos de los próximos días o avanzar en Aprender.'
          : 'Mañana habrá más. Si te apetece seguir, avanza en la pestaña Aprender.',
      ),
      el('div', 'acciones', principal, hayAdelantado ? boton('Ir a Aprender', 'boton-secundario', s.irAAprender) : null),
      bloqueProgreso(),
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
    // Al terminar, vuelta al continente entero: se ve lo que se ha coloreado.
    s.verContinente(s.continenteMapa());
    const hayAdelantado = s.adelantado().length > 0;
    const seguir = hayAdelantado
      ? boton('Adelantar repasos', 'boton-principal', () => empezarSesion(s.adelantado(), true))
      : boton('Ir a Aprender', 'boton-principal', s.irAAprender);
    rellenar(
      contenedor,
      el('p', 'resumen-titulo', adelantando ? 'Repaso terminado' : 'Hoy, hecho'),
      el('p', 'resumen', mensajeResumen(resumen.aLaPrimera, resumen.total)),
      nuevosVistos.size
        ? el('p', 'resumen-escalones', el('strong', '', 'Nuevos de hoy: '), [...nuevosVistos].map(nombre).join(', '), '.')
        : null,
      el('div', 'acciones', seguir, hayAdelantado ? boton('Ir a Aprender', 'boton-secundario', s.irAAprender) : boton('Explorar el mapa', 'boton-secundario', s.alExplorar)),
      bloqueProgreso(),
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

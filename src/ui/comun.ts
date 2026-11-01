import type { Pais } from '../logic/types';
import type { Rng } from '../logic/rng';
import type { Resultado, ResumenRonda } from '../logic/sesion';
import type { ModoId } from '../logic/config';
import type { CambioEscalon } from '../logic/progreso';
import { MENSAJE_RECUPERADO, OTRA_OPORTUNIDAD, mensajeAcierto, mensajeResumen } from '../logic/mensajes';
import type { Mapa } from '../map/mapa';
import { boton, el, rellenar } from './dom';
import { lanzarConfeti } from './confeti';

/** Tras un acierto se pasa sola a la siguiente pregunta (en el fallo, no: hay que leer el truco). */
export const PAUSA_TRAS_ACIERTO_MS = 1300;

/** Lo que necesita cualquier modo de práctica. */
export interface Contexto {
  /** Zona del panel donde dibuja el modo. */
  contenedor: HTMLElement;
  mapa: Mapa;
  /** Países de la región en juego. */
  region: readonly Pais[];
  /** Todos los países activos (para distractores y validación). */
  candidatos: readonly Pais[];
  rng: Rng;
  alExplorar: () => void;
  motor: Motor;
}

/** Servicios de la app que usan los modos: guardar progreso y consultar trucos y dominio. */
export interface Motor {
  /**
   * Registra una respuesta en el progreso (FSRS, historial y escalón de
   * aprendizaje) y lo guarda. Devuelve si el país ha subido de escalón.
   */
  registrar(paisId: string, modo: ModoId, resultado: Resultado, tiempoMs: number, opciones?: { examen?: boolean }): CambioEscalon;
  /** Truco a mostrar (el del alumno si lo inventó; null si no hay). */
  truco(paisId: string): string | null;
}

/** Un modo de práctica en marcha. */
export interface ModoPractica {
  alSeleccionarPais(id: string): void;
  salir(): void;
}

/** Atajos de teclado del modo: se sustituyen en cada paso y se quitan al salir. */
export class Teclado {
  private manejador: ((e: KeyboardEvent) => void) | null = null;
  private readonly oyente = (e: KeyboardEvent) => {
    // Con un diálogo abierto (guías, panel, regiones...), las teclas son suyas:
    // la pregunta de detrás no debe responder ni avanzar.
    if (document.querySelector('dialog[open]')) return;
    this.manejador?.(e);
  };

  constructor() {
    document.addEventListener('keydown', this.oyente);
  }

  usar(manejador: ((e: KeyboardEvent) => void) | null): void {
    this.manejador = manejador;
  }

  /** Enter pasa a lo siguiente (salvo si el foco ya está en un botón, que lo pulsa el navegador). */
  enterPara(accion: () => void): void {
    this.usar((e) => {
      if (e.key !== 'Enter') return;
      if (document.activeElement instanceof HTMLButtonElement) return;
      e.preventDefault();
      accion();
    });
  }

  quitar(): void {
    document.removeEventListener('keydown', this.oyente);
  }
}

export function progreso(texto: string): HTMLElement {
  return el('p', 'progreso', texto);
}

/** Nombre resaltado con el color con el que se marca en el mapa. */
export function nombreResaltado(texto: string, estado: 'objetivo' | 'seleccion'): HTMLElement {
  return el('strong', `nombre-pais ${estado}`, texto);
}

/** Feedback de acierto. Devuelve el botón "Siguiente". */
export function pintarAcierto(
  feedback: HTMLElement,
  recuperado: boolean,
  rng: Rng,
  alSeguir: (() => void) | null,
): HTMLButtonElement | null {
  feedback.className = 'feedback acierto';
  const seguir = alSeguir ? boton('Siguiente', 'boton-principal', alSeguir) : null;
  rellenar(feedback, el('p', 'feedback-titulo', recuperado ? MENSAJE_RECUPERADO : mensajeAcierto(rng)), seguir);
  if (recuperado) lanzarConfeti();
  return seguir;
}

/**
 * Feedback de fallo (SPEC 5.2): claro, sin castigo, con la respuesta
 * correcta, el truco y la promesa de otra oportunidad.
 */
export function pintarFallo(
  feedback: HTMLElement,
  titulo: (Node | string)[],
  truco: string | null,
  alSeguir: (() => void) | null,
): HTMLButtonElement | null {
  feedback.className = 'feedback fallo';
  const seguir = alSeguir ? boton('Siguiente', 'boton-principal', alSeguir) : null;
  rellenar(
    feedback,
    el('p', 'feedback-titulo', ...titulo),
    truco && el('p', 'truco', el('span', 'truco-etiqueta', 'Acuérdate'), truco),
    el('p', 'feedback-texto', OTRA_OPORTUNIDAD),
    seguir,
  );
  verFeedback(feedback);
  return seguir;
}

/** Aviso sin fallo: errata o nombre antiguo (SPEC 3.3). */
export function pintarAviso(feedback: HTMLElement, titulo: (Node | string)[], alSeguir: () => void): HTMLButtonElement {
  feedback.className = 'feedback aviso';
  const seguir = boton('Siguiente', 'boton-principal', alSeguir);
  rellenar(
    feedback,
    el('p', 'feedback-titulo', ...titulo),
    el('p', 'feedback-texto', 'Volverá a salir dentro de un rato, para afianzarla.'),
    seguir,
  );
  verFeedback(feedback);
  return seguir;
}

/** En móvil el panel es bajo: que el feedback quede a la vista. */
export function verFeedback(feedback: HTMLElement): void {
  feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

export function pintarResumen(
  contenedor: HTMLElement,
  resumen: ResumenRonda,
  alOtra: () => void,
  alExplorar: () => void,
  textos = { titulo: 'Ronda completada', otra: 'Otra ronda' },
): void {
  const otra = boton(textos.otra, 'boton-principal', alOtra);
  contenedor.replaceChildren(
    el('p', 'resumen-titulo', textos.titulo),
    el('p', 'resumen', mensajeResumen(resumen.aLaPrimera, resumen.total)),
    el('div', 'acciones', otra, boton('Explorar el mapa', 'boton-secundario', alExplorar)),
  );
  otra.focus({ preventScroll: true });
}

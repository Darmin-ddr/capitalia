import type { Pais } from '../logic/types';
import type { Rng } from '../logic/rng';
import { trucoPrincipal } from '../logic/datos';
import { crearPreguntaOpciones } from '../logic/opciones';
import { ColaRonda } from '../logic/sesion';
import { MENSAJE_RECUPERADO, OTRA_OPORTUNIDAD, mensajeAcierto, mensajeResumen } from '../logic/mensajes';
import type { Mapa } from '../map/mapa';
import { boton, el, rellenar } from './dom';
import { lanzarConfeti } from './confeti';
import type { Modo } from './explorar';

/** Tras un acierto se pasa sola a la siguiente pregunta (en el fallo, no: hay que leer el truco). */
const PAUSA_TRAS_ACIERTO_MS = 1300;

/** Modo 2: país marcado en el mapa y 4 capitales posibles. */
export function iniciarElegir(
  panel: HTMLElement,
  mapa: Mapa,
  region: readonly Pais[],
  candidatos: readonly Pais[],
  rng: Rng,
  alExplorar: () => void,
): Modo {
  mapa.setInteractivo(false);
  let cola = new ColaRonda(region.map((p) => p.id), rng);
  let temporizador: number | undefined;
  let alTeclear: ((e: KeyboardEvent) => void) | null = null;

  const teclado = (e: KeyboardEvent) => alTeclear?.(e);
  document.addEventListener('keydown', teclado);

  function limpiarMapa(): void {
    mapa.limpiarEstados();
    mapa.mostrarCapital(null);
  }

  function siguiente(): void {
    window.clearTimeout(temporizador);
    limpiarMapa();
    const id = cola.actual();
    if (!id) return mostrarResumen();
    const pais = region.find((p) => p.id === id)!;
    const pregunta = crearPreguntaOpciones(pais, candidatos, rng);
    mapa.setEstado(id, 'objetivo');

    const hechos = cola.resumen().total - cola.pendientes();
    const progreso = el('p', 'progreso', `${hechos} de ${cola.resumen().total}`);
    const enunciado = el('p', 'enunciado', '¿Cuál es la capital de ', el('span', 'sin-corte', el('strong', 'nombre-pais objetivo', pais.nombre), '?'));
    const opciones = el('div', 'opciones');
    const feedback = el('div', 'feedback');
    const botones = pregunta.opciones.map((texto, i) => {
      const b = boton('', 'opcion', () => responder(i));
      b.append(el('span', 'opcion-num', String(i + 1)), el('span', 'opcion-texto', texto));
      opciones.append(b);
      return b;
    });
    panel.replaceChildren(el('h2', 'titulo-panel', 'Practicar'), progreso, enunciado, opciones, feedback);
    botones[0].focus({ preventScroll: true });

    alTeclear = (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= botones.length) responder(n - 1);
    };

    function responder(i: number): void {
      alTeclear = null;
      for (const b of botones) b.disabled = true;
      const acierto = i === pregunta.correcta;
      const resultado = cola.responder(acierto);
      mapa.mostrarCapital(id);
      botones[pregunta.correcta].classList.add('correcta');

      if (acierto) {
        mapa.setEstado(id!, 'acierto');
        feedback.className = 'feedback acierto';
        feedback.replaceChildren(
          el('p', 'feedback-titulo', resultado.recuperado ? MENSAJE_RECUPERADO : mensajeAcierto(rng)),
        );
        if (resultado.recuperado) lanzarConfeti();
        const seguir = boton('Siguiente', 'boton-principal', siguiente);
        feedback.append(seguir);
        temporizador = window.setTimeout(siguiente, resultado.recuperado ? PAUSA_TRAS_ACIERTO_MS + 500 : PAUSA_TRAS_ACIERTO_MS);
        alTeclear = (e) => e.key === 'Enter' && (e.preventDefault(), siguiente());
        return;
      }

      botones[i].classList.add('elegida-mal');
      mapa.setEstado(id!, 'fallo');
      const truco = trucoPrincipal(pais);
      feedback.className = 'feedback fallo';
      const seguir = boton('Siguiente', 'boton-principal', siguiente);
      rellenar(
        feedback,
        el('p', 'feedback-titulo', 'No es ', pregunta.opciones[i], '. Es ', el('strong', '', pais.capital), '.'),
        truco && el('p', 'truco', el('span', 'truco-etiqueta', 'Acuérdate'), truco),
        el('p', 'feedback-texto', OTRA_OPORTUNIDAD),
        seguir,
      );
      seguir.focus({ preventScroll: true });
      // En móvil el panel es bajo: que el truco y el botón queden a la vista.
      feedback.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      alTeclear = (e) => {
        // Enter sobre el botón ya lo pulsa el navegador; aquí solo otras teclas.
        if (e.key === 'Enter' && document.activeElement !== seguir) {
          e.preventDefault();
          siguiente();
        }
      };
    }
  }

  function mostrarResumen(): void {
    const { total, aLaPrimera } = cola.resumen();
    const otra = boton('Otra ronda', 'boton-principal', () => {
      cola = new ColaRonda(region.map((p) => p.id), rng);
      siguiente();
    });
    panel.replaceChildren(
      el('h2', 'titulo-panel', 'Ronda completada'),
      el('p', 'resumen', mensajeResumen(aLaPrimera, total)),
      el('div', 'acciones', otra, boton('Explorar el mapa', 'boton-secundario', alExplorar)),
    );
    otra.focus({ preventScroll: true });
  }

  siguiente();

  return {
    alSeleccionarPais() {
      /* En este modo el mapa no es interactivo. */
    },
    salir() {
      window.clearTimeout(temporizador);
      document.removeEventListener('keydown', teclado);
      limpiarMapa();
    },
  };
}

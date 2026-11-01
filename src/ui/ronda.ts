import type { ModoId } from '../logic/config';
import { ColaRonda, type Resultado } from '../logic/sesion';
import { el } from './dom';
import { PAUSA_TRAS_ACIERTO_MS, Teclado, pintarResumen, progreso, type Contexto, type ModoPractica } from './comun';
import { preguntaAlReves, preguntaElegir, preguntaEscribir, type ControlPregunta, type Renderizador } from './preguntas';

const RENDERIZADORES: Partial<Record<ModoId, Renderizador>> = {
  elegir: preguntaElegir,
  escribir: preguntaEscribir,
  alreves: preguntaAlReves,
};

export interface OpcionesRonda {
  /** Países de la ronda (en el orden propuesto; la cola los baraja). */
  ids: () => string[];
  /** Modo de cada pregunta (fijo en práctica libre; según dominio en el repaso). */
  modoPara: (paisId: string) => ModoId;
  textosResumen?: { titulo: string; otra: string };
  /** Si es true, no se baraja el orden inicial (el repaso ya viene ordenado por prioridad). */
  respetarOrden?: boolean;
  /** Ronda de examen: los fallos no alteran la planificación FSRS (SPEC 7). */
  examen?: boolean;
}

/**
 * Controlador de una ronda de preguntas sueltas (modos 2, 4 y 5, o mezcla):
 * cola con repetición de fallos, registro del progreso, avance automático
 * tras acertar y resumen final.
 */
export function iniciarRonda(ctx: Contexto, op: OpcionesRonda): ModoPractica {
  const { contenedor, mapa, region, rng, motor } = ctx;
  const teclado = new Teclado();
  let cola = nuevaCola();
  let temporizador: number | undefined;
  let control: ControlPregunta = {};

  function nuevaCola(): ColaRonda {
    const ids = op.ids();
    // Orden propio: la cola baraja con el rng; con un rng "identidad" mantenemos la prioridad.
    return new ColaRonda(ids, op.respetarOrden ? () => 0.999999 : rng);
  }

  function limpiarMapa(): void {
    mapa.limpiarEstados();
    mapa.mostrarCapital(null);
  }

  function siguiente(): void {
    window.clearTimeout(temporizador);
    limpiarMapa();
    control = {};
    const id = cola.actual();
    if (!id) {
      teclado.usar(null);
      mapa.setInteractivo(false);
      pintarResumen(contenedor, cola.resumen(), otraRonda, ctx.alExplorar, op.textosResumen);
      return;
    }
    const pais = ctx.candidatos.find((p) => p.id === id) ?? region.find((p) => p.id === id)!;
    const modo = op.modoPara(id);
    const renderizar = RENDERIZADORES[modo] ?? preguntaElegir;
    const { total } = cola.resumen();
    contenedor.replaceChildren(progreso(`${total - cola.pendientes()} de ${total}`));
    const inicio = performance.now();
    let respondida = false;

    control = renderizar({
      zona: contenedor,
      mapa,
      pais,
      region,
      candidatos: ctx.candidatos,
      rng,
      teclado,
      truco: motor.truco(id),
      responder(resultado: Resultado) {
        if (respondida) return { recuperado: false };
        respondida = true;
        const r = cola.responder(resultado);
        motor.registrar(id, modo, resultado, performance.now() - inicio, { examen: op.examen });
        if (resultado === 'acierto') {
          temporizador = window.setTimeout(siguiente, PAUSA_TRAS_ACIERTO_MS + (r.recuperado ? 500 : 0));
        }
        return { recuperado: r.recuperado };
      },
      siguiente,
    });
  }

  function otraRonda(): void {
    cola = nuevaCola();
    if (!cola.actual()) {
      contenedor.replaceChildren(el('p', 'ayuda', 'No hay nada que repasar en esta región ahora mismo.'));
      return;
    }
    siguiente();
  }

  otraRonda();

  return {
    alSeleccionarPais: (id) => control.alTocarPais?.(id),
    salir() {
      window.clearTimeout(temporizador);
      teclado.quitar();
      limpiarMapa();
    },
  };
}

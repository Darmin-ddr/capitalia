import { crearPreguntaOpciones } from '../logic/opciones';
import { ColaRonda } from '../logic/sesion';
import { boton, el } from './dom';
import {
  PAUSA_TRAS_ACIERTO_MS,
  Teclado,
  nombreResaltado,
  pintarAcierto,
  pintarFallo,
  pintarResumen,
  progreso,
  type Contexto,
  type ModoPractica,
} from './comun';

/** Modo 2: país marcado en el mapa y 4 capitales posibles. */
export function iniciarElegir(ctx: Contexto): ModoPractica {
  const { contenedor, mapa, region, candidatos, rng } = ctx;
  mapa.setInteractivo(false);
  let cola = new ColaRonda(region.map((p) => p.id), rng);
  let temporizador: number | undefined;
  const teclado = new Teclado();

  function limpiarMapa(): void {
    mapa.limpiarEstados();
    mapa.mostrarCapital(null);
  }

  function siguiente(): void {
    window.clearTimeout(temporizador);
    limpiarMapa();
    const id = cola.actual();
    if (!id) {
      teclado.usar(null);
      return pintarResumen(contenedor, cola.resumen(), otraRonda, ctx.alExplorar);
    }
    const pais = region.find((p) => p.id === id)!;
    const pregunta = crearPreguntaOpciones(pais, candidatos, rng);
    mapa.setEstado(id, 'objetivo');

    const { total } = cola.resumen();
    const enunciado = el(
      'p',
      'enunciado',
      '¿Cuál es la capital de ',
      el('span', 'sin-corte', nombreResaltado(pais.nombre, 'objetivo'), '?'),
    );
    const opciones = el('div', 'opciones');
    const feedback = el('div', 'feedback');
    const botones = pregunta.opciones.map((texto, i) => {
      const b = boton('', 'opcion', () => responder(i));
      b.append(el('span', 'opcion-num', String(i + 1)), el('span', 'opcion-texto', texto));
      opciones.append(b);
      return b;
    });
    contenedor.replaceChildren(progreso(`${total - cola.pendientes()} de ${total}`), enunciado, opciones, feedback);
    botones[0].focus({ preventScroll: true });

    teclado.usar((e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= botones.length) responder(n - 1);
    });

    function responder(i: number): void {
      teclado.usar(null);
      for (const b of botones) b.disabled = true;
      const acierto = i === pregunta.correcta;
      const resultado = cola.responder(acierto ? 'acierto' : 'fallo');
      mapa.mostrarCapital(id);
      botones[pregunta.correcta].classList.add('correcta');

      if (acierto) {
        mapa.setEstado(id!, 'acierto');
        pintarAcierto(feedback, resultado.recuperado, rng, siguiente);
        temporizador = window.setTimeout(siguiente, PAUSA_TRAS_ACIERTO_MS + (resultado.recuperado ? 500 : 0));
        teclado.enterPara(siguiente);
        return;
      }

      botones[i].classList.add('elegida-mal');
      mapa.setEstado(id!, 'fallo');
      const seguir = pintarFallo(
        feedback,
        ['No es ', pregunta.opciones[i], '. Es ', el('strong', '', pais.capital), '.'],
        pais,
        siguiente,
      );
      seguir?.focus({ preventScroll: true });
      teclado.enterPara(siguiente);
    }
  }

  function otraRonda(): void {
    cola = new ColaRonda(region.map((p) => p.id), rng);
    siguiente();
  }

  siguiente();

  return {
    alSeleccionarPais() {
      /* En este modo el mapa no es interactivo. */
    },
    salir() {
      window.clearTimeout(temporizador);
      teclado.quitar();
      limpiarMapa();
    },
  };
}

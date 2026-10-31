import { ColaRonda } from '../logic/sesion';
import { el } from './dom';
import {
  PAUSA_TRAS_ACIERTO_MS,
  Teclado,
  pintarAcierto,
  pintarFallo,
  pintarResumen,
  progreso,
  type Contexto,
  type ModoPractica,
} from './comun';

/** Modo 5: se muestra una capital y hay que tocar su país en el mapa. */
export function iniciarAlReves(ctx: Contexto): ModoPractica {
  const { contenedor, mapa, region, rng } = ctx;
  mapa.setInteractivo(true);
  let cola = new ColaRonda(region.map((p) => p.id), rng);
  let temporizador: number | undefined;
  let esperando = false;
  let feedback = el('div', 'feedback');
  const teclado = new Teclado();

  function limpiarMapa(): void {
    mapa.limpiarEstados();
    mapa.mostrarCapital(null);
  }

  function siguiente(): void {
    window.clearTimeout(temporizador);
    limpiarMapa();
    teclado.usar(null);
    const id = cola.actual();
    if (!id) {
      esperando = false;
      return pintarResumen(contenedor, cola.resumen(), otraRonda, ctx.alExplorar);
    }
    const pais = region.find((p) => p.id === id)!;
    const { total } = cola.resumen();
    feedback = el('div', 'feedback');
    contenedor.replaceChildren(
      progreso(`${total - cola.pendientes()} de ${total}`),
      el(
        'p',
        'enunciado',
        '¿De qué país es capital ',
        el('span', 'sin-corte', el('strong', 'nombre-capital', '★ ', pais.capital), '?'),
      ),
      el('p', 'ayuda', 'Tócalo en el mapa.'),
      feedback,
    );
    esperando = true;
  }

  function alTocarPais(tocado: string): void {
    if (!esperando) return;
    esperando = false;
    const id = cola.actual()!;
    const pais = region.find((p) => p.id === id)!;
    mapa.mostrarCapital(id);

    if (tocado === id) {
      const res = cola.responder('acierto');
      mapa.setEstado(id, 'acierto');
      pintarAcierto(feedback, res.recuperado, rng, siguiente);
      temporizador = window.setTimeout(siguiente, PAUSA_TRAS_ACIERTO_MS + (res.recuperado ? 500 : 0));
      teclado.enterPara(siguiente);
      return;
    }

    cola.responder('fallo');
    const nombreTocado = region.find((p) => p.id === tocado)?.nombre ?? 'otro país';
    mapa.setEstado(tocado, 'fallo');
    mapa.setEstado(id, 'objetivo');
    pintarFallo(
      feedback,
      ['Eso es ', nombreTocado, '. ', pais.capital, ' es la capital de ', el('strong', '', pais.nombre), '.'],
      pais,
      siguiente,
    )?.focus({ preventScroll: true });
    teclado.enterPara(siguiente);
  }

  function otraRonda(): void {
    cola = new ColaRonda(region.map((p) => p.id), rng);
    siguiente();
  }

  siguiente();

  return {
    alSeleccionarPais: alTocarPais,
    salir() {
      window.clearTimeout(temporizador);
      teclado.quitar();
      limpiarMapa();
    },
  };
}

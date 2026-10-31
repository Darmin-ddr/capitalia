import { ColaRonda } from '../logic/sesion';
import { validarTexto } from '../logic/texto';
import { boton, el } from './dom';
import {
  PAUSA_TRAS_ACIERTO_MS,
  Teclado,
  nombreResaltado,
  pintarAcierto,
  pintarAviso,
  pintarFallo,
  pintarResumen,
  progreso,
  type Contexto,
  type ModoPractica,
} from './comun';

/** Modo 4: escribir la capital del país marcado (validación tolerante, SPEC 3.3). */
export function iniciarEscribir(ctx: Contexto): ModoPractica {
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
    mapa.setEstado(id, 'objetivo');

    const { total } = cola.resumen();
    const campo = el('input', 'campo-texto');
    Object.assign(campo, {
      type: 'text',
      autocomplete: 'off',
      spellcheck: false,
      enterKeyHint: 'done',
    });
    campo.setAttribute('autocorrect', 'off');
    campo.setAttribute('autocapitalize', 'off');
    campo.setAttribute('aria-label', `Capital de ${pais.nombre}`);
    campo.placeholder = 'Escribe la capital';

    const comprobar = el('button', 'boton-principal', 'Comprobar');
    comprobar.type = 'submit';
    const noLoSe = boton('No lo sé', 'boton-secundario', () => responder(null));
    const botonesForm = el('div', 'acciones', comprobar, noLoSe);
    const formulario = el('form', 'respuesta-form', campo, botonesForm);
    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
      responder(campo.value);
    });

    const feedback = el('div', 'feedback');
    contenedor.replaceChildren(
      progreso(`${total - cola.pendientes()} de ${total}`),
      el('p', 'enunciado', '¿Cuál es la capital de ', el('span', 'sin-corte', nombreResaltado(pais.nombre, 'objetivo'), '?')),
      formulario,
      feedback,
    );
    campo.focus({ preventScroll: true });
    teclado.usar(null);

    function responder(texto: string | null): void {
      const r = texto === null ? null : validarTexto(texto, pais, candidatos);
      if (r?.tipo === 'vacio') {
        campo.focus();
        return;
      }
      campo.disabled = true;
      comprobar.disabled = true;
      noLoSe.disabled = true;
      // Ya no sirven: fuera, para que el feedback quepa en pantallas pequeñas.
      botonesForm.hidden = true;
      mapa.mostrarCapital(id);

      if (r?.tipo === 'correcto') {
        const res = cola.responder('acierto');
        campo.classList.add('correcta');
        mapa.setEstado(id!, 'acierto');
        pintarAcierto(feedback, res.recuperado, rng, siguiente);
        temporizador = window.setTimeout(siguiente, PAUSA_TRAS_ACIERTO_MS + (res.recuperado ? 500 : 0));
        teclado.enterPara(siguiente);
        return;
      }

      if (r?.tipo === 'errata' || r?.tipo === 'antiguo') {
        cola.responder('repasar');
        campo.classList.add('correcta');
        mapa.setEstado(id!, 'acierto');
        const titulo =
          r.tipo === 'errata'
            ? ['¡Bien! Se escribe ', el('strong', '', r.formaCorrecta), '.']
            : ['¡Casi! Ahora se llama ', el('strong', '', r.formaCorrecta), '.'];
        pintarAviso(feedback, titulo, siguiente).focus({ preventScroll: true });
        teclado.enterPara(siguiente);
        return;
      }

      cola.responder('fallo');
      if (texto !== null) campo.classList.add('elegida-mal');
      mapa.setEstado(id!, 'fallo');
      const titulo: (Node | string)[] =
        texto === null ? ['Es ', el('strong', '', pais.capital), '.'] : ['No es eso. Es ', el('strong', '', pais.capital), '.'];
      if (r?.otroPais) titulo.push(` (${r.otroPais.capital} es la capital de ${r.otroPais.nombre}.)`);
      pintarFallo(feedback, titulo, pais, siguiente)?.focus({ preventScroll: true });
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

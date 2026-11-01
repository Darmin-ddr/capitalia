import type { Pais } from '../logic/types';
import type { Rng } from '../logic/rng';
import type { Resultado } from '../logic/sesion';
import { crearPreguntaOpciones } from '../logic/opciones';
import { validarTexto } from '../logic/texto';
import { conArticulo, preposicionDe } from '../logic/mensajes';
import type { Mapa } from '../map/mapa';
import { boton, el } from './dom';
import { nombreResaltado, pintarAcierto, pintarAviso, pintarFallo, type Teclado } from './comun';

/** Lo que recibe una pregunta suelta (modos 2, 4 y 5). */
export interface ArgsPregunta {
  zona: HTMLElement;
  mapa: Mapa;
  pais: Pais;
  /** Países de la región (para nombrar el país tocado por error). */
  region: readonly Pais[];
  /** Países activos (distractores y validación de texto). */
  candidatos: readonly Pais[];
  rng: Rng;
  teclado: Teclado;
  /** Truco a mostrar en el fallo (el propio del alumno si lo tiene). */
  truco: string | null;
  /** Comunica el resultado; devuelve si es un fallo recuperado (para celebrarlo). */
  responder(resultado: Resultado): { recuperado: boolean };
  siguiente(): void;
}

export interface ControlPregunta {
  alTocarPais?(id: string): void;
}

export type Renderizador = (a: ArgsPregunta) => ControlPregunta;

function enunciadoCapitalDe(pais: Pais): HTMLElement {
  return el('p', 'enunciado', `¿Cuál es la capital ${preposicionDe(pais.nombre)}`, el('span', 'sin-corte', nombreResaltado(pais.nombre, 'objetivo'), '?'));
}

/** Modo 2: 4 capitales posibles. */
export const preguntaElegir: Renderizador = (a) => {
  const { zona, mapa, pais, rng, teclado } = a;
  mapa.setInteractivo(false);
  mapa.setEstado(pais.id, 'objetivo');
  const pregunta = crearPreguntaOpciones(pais, a.candidatos, rng);
  const opciones = el('div', 'opciones');
  const feedback = el('div', 'feedback');
  const botones = pregunta.opciones.map((texto, i) => {
    const b = boton('', 'opcion', () => responder(i));
    b.append(el('span', 'opcion-num', String(i + 1)), el('span', 'opcion-texto', texto));
    opciones.append(b);
    return b;
  });
  zona.append(enunciadoCapitalDe(pais), opciones, feedback);
  botones[0].focus({ preventScroll: true });
  teclado.usar((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= botones.length) responder(n - 1);
  });

  function responder(i: number): void {
    teclado.usar(null);
    for (const b of botones) b.disabled = true;
    const acierto = i === pregunta.correcta;
    const { recuperado } = a.responder(acierto ? 'acierto' : 'fallo');
    mapa.mostrarCapital(pais.id);
    botones[pregunta.correcta].classList.add('correcta');
    if (acierto) {
      mapa.setEstado(pais.id, 'acierto');
      pintarAcierto(feedback, recuperado, rng, a.siguiente);
      teclado.enterPara(a.siguiente);
      return;
    }
    botones[i].classList.add('elegida-mal');
    mapa.setEstado(pais.id, 'fallo');
    pintarFallo(feedback, ['No es ', pregunta.opciones[i], '. Es ', el('strong', '', pais.capital), '.'], a.truco, a.siguiente)?.focus({
      preventScroll: true,
    });
    teclado.enterPara(a.siguiente);
  }
  return {};
};

/** Modo 4: escribir la capital (validación tolerante). */
export const preguntaEscribir: Renderizador = (a) => {
  const { zona, mapa, pais, rng, teclado } = a;
  mapa.setInteractivo(false);
  mapa.setEstado(pais.id, 'objetivo');

  const campo = el('input', 'campo-texto');
  campo.type = 'text';
  campo.autocomplete = 'off';
  campo.spellcheck = false;
  campo.enterKeyHint = 'done';
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
  zona.append(enunciadoCapitalDe(pais), formulario, feedback);
  campo.focus({ preventScroll: true });
  teclado.usar(null);

  function responder(texto: string | null): void {
    const r = texto === null ? null : validarTexto(texto, pais, a.candidatos);
    if (r?.tipo === 'vacio') {
      campo.focus();
      return;
    }
    campo.disabled = true;
    comprobar.disabled = true;
    noLoSe.disabled = true;
    botonesForm.hidden = true;
    mapa.mostrarCapital(pais.id);

    if (r?.tipo === 'correcto') {
      const { recuperado } = a.responder('acierto');
      campo.classList.add('correcta');
      mapa.setEstado(pais.id, 'acierto');
      pintarAcierto(feedback, recuperado, rng, a.siguiente);
      teclado.enterPara(a.siguiente);
      return;
    }
    if (r?.tipo === 'errata' || r?.tipo === 'antiguo') {
      a.responder('repasar');
      campo.classList.add('correcta');
      mapa.setEstado(pais.id, 'acierto');
      const titulo =
        r.tipo === 'errata'
          ? ['¡Bien! Se escribe ', el('strong', '', r.formaCorrecta), '.']
          : ['¡Casi! Ahora se llama ', el('strong', '', r.formaCorrecta), '.'];
      pintarAviso(feedback, titulo, a.siguiente).focus({ preventScroll: true });
      teclado.enterPara(a.siguiente);
      return;
    }
    a.responder('fallo');
    if (texto !== null) campo.classList.add('elegida-mal');
    mapa.setEstado(pais.id, 'fallo');
    const titulo: (Node | string)[] =
      texto === null ? ['Es ', el('strong', '', pais.capital), '.'] : ['No es eso. Es ', el('strong', '', pais.capital), '.'];
    if (r?.otroPais) titulo.push(` (${r.otroPais.capital} es la capital ${preposicionDe(r.otroPais.nombre)}${r.otroPais.nombre}.)`);
    pintarFallo(feedback, titulo, a.truco, a.siguiente)?.focus({ preventScroll: true });
    teclado.enterPara(a.siguiente);
  }
  return {};
};

/** Modo 5: se muestra la capital y hay que tocar el país. */
export const preguntaAlReves: Renderizador = (a) => {
  const { zona, mapa, pais, rng, teclado } = a;
  mapa.setInteractivo(true);
  let esperando = true;
  const feedback = el('div', 'feedback');
  zona.append(
    el('p', 'enunciado', '¿De qué país es capital ', el('span', 'sin-corte', el('strong', 'nombre-capital', '★ ', pais.capital), '?')),
    el('p', 'ayuda', 'Tócalo en el mapa.'),
    feedback,
  );
  teclado.usar(null);

  return {
    alTocarPais(tocado: string) {
      if (!esperando) return;
      esperando = false;
      mapa.mostrarCapital(pais.id);
      if (tocado === pais.id) {
        const { recuperado } = a.responder('acierto');
        mapa.setEstado(pais.id, 'acierto');
        pintarAcierto(feedback, recuperado, rng, a.siguiente);
        teclado.enterPara(a.siguiente);
        return;
      }
      a.responder('fallo');
      const nombreTocado = a.candidatos.find((p) => p.id === tocado)?.nombre ?? 'otro país';
      mapa.setEstado(tocado, 'fallo');
      mapa.setEstado(pais.id, 'objetivo');
      pintarFallo(
        feedback,
        ['Has tocado ', conArticulo(nombreTocado), '. ', pais.capital, ` es la capital ${preposicionDe(pais.nombre)}`, el('strong', '', pais.nombre), '.'],
        a.truco,
        a.siguiente,
      )?.focus({ preventScroll: true });
      teclado.enterPara(a.siguiente);
    },
  };
};

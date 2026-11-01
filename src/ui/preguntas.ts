import type { Pais } from '../logic/types';
import type { Rng } from '../logic/rng';
import type { Resultado } from '../logic/sesion';
import { crearPreguntaOpciones } from '../logic/opciones';
import { validarTexto, type ResultadoTexto } from '../logic/texto';
import { corregirMapaMudo } from '../logic/examen';
import { conArticulo, preposicionDe } from '../logic/mensajes';
import type { Mapa } from '../map/mapa';
import { boton, el } from './dom';
import { nombreResaltado, pintarAcierto, pintarAviso, pintarFallo, type OpcionesRespuesta, type Teclado } from './comun';

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
  responder(resultado: Resultado, opciones?: Pick<OpcionesRespuesta, 'escalon'>): { recuperado: boolean };
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

/** Campo de texto para respuestas escritas (sin autocorrector ni mayúsculas automáticas). */
export function campoRespuesta(etiqueta: string, placeholder: string): HTMLInputElement {
  const campo = el('input', 'campo-texto');
  campo.type = 'text';
  campo.autocomplete = 'off';
  campo.spellcheck = false;
  campo.setAttribute('autocorrect', 'off');
  campo.setAttribute('autocapitalize', 'off');
  campo.setAttribute('aria-label', etiqueta);
  campo.placeholder = placeholder;
  return campo;
}

const vale = (r: ResultadoTexto) => r.tipo === 'correcto' || r.tipo === 'errata' || r.tipo === 'antiguo';

/** Texto del aviso de un campo aceptado con errata o con un nombre que no es el del listado. */
function textoAviso(r: ResultadoTexto, que: 'país' | 'capital'): (Node | string)[] {
  if (r.tipo === 'errata') return [que === 'país' ? 'El país se escribe ' : 'La capital se escribe ', el('strong', '', r.formaCorrecta), '. '];
  if (r.tipo === 'antiguo') return [que === 'país' ? 'El nombre del país es ' : 'Ahora se llama ', el('strong', '', r.formaCorrecta), '. '];
  return [];
}

/**
 * Mapa mudo (SPEC 4.2): se ve la estrella de una capital, sin nombre, y hay
 * que escribir el país y la capital. Solo uno de los dos vale medio punto.
 */
export const preguntaMapaMudo: Renderizador = (a) => {
  const { zona, mapa, pais, rng, teclado } = a;
  // Solo la estrella, sin resaltar el país (SPEC 4.2).
  mapa.setInteractivo(false);
  mapa.mostrarCapital(pais.id, false);

  const campoPais = campoRespuesta('País', 'País');
  const campoCapital = campoRespuesta('Capital', 'Capital');
  campoPais.enterKeyHint = 'next';
  campoCapital.enterKeyHint = 'done';
  const comprobar = el('button', 'boton-principal', 'Comprobar');
  comprobar.type = 'submit';
  const noLoSe = boton('No lo sé', 'boton-secundario', () => responder(true));
  const botonesForm = el('div', 'acciones', comprobar, noLoSe);
  const formulario = el(
    'form',
    'respuesta-form mapa-mudo-form',
    el('label', 'campo-etiquetado', el('span', 'etiqueta-campo', 'País'), campoPais),
    el('label', 'campo-etiquetado', el('span', 'etiqueta-campo', 'Capital'), campoCapital),
    botonesForm,
  );
  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    // Enter en el país con la capital vacía: pasar a la capital.
    if (document.activeElement === campoPais && !campoCapital.value.trim()) {
      campoCapital.focus();
      return;
    }
    responder(false);
  });
  const feedback = el('div', 'feedback');
  zona.append(
    el('p', 'enunciado', '¿Qué país es y cuál es su capital?'),
    el('p', 'ayuda', 'Fíjate en la estrella del mapa.'),
    formulario,
    feedback,
  );
  campoPais.focus({ preventScroll: true });
  teclado.usar(null);

  function responder(noLoSabe: boolean): void {
    if (!noLoSabe && !campoPais.value.trim() && !campoCapital.value.trim()) {
      campoPais.focus();
      return;
    }
    const c = corregirMapaMudo(noLoSabe ? '' : campoPais.value, noLoSabe ? '' : campoCapital.value, pais, a.candidatos);
    for (const x of [campoPais, campoCapital, comprobar, noLoSe]) x.disabled = true;
    botonesForm.hidden = true;
    campoPais.classList.add(vale(c.pais) ? 'correcta' : 'elegida-mal');
    campoCapital.classList.add(vale(c.capital) ? 'correcta' : 'elegida-mal');
    mapa.mostrarCapital(pais.id);
    // Medio punto: "repasar" para la planificación, pero fallo para el escalón y la ronda.
    const { recuperado } = a.responder(c.resultado, c.puntos === 0.5 ? { escalon: 'fallo' } : undefined);
    const nombre = el('strong', '', pais.nombre);
    const capital = el('strong', '', pais.capital);

    if (c.resultado === 'acierto') {
      mapa.setEstado(pais.id, 'acierto');
      pintarAcierto(feedback, recuperado, rng, a.siguiente);
    } else if (c.puntos === 1) {
      // Todo bien, con alguna errata o con un nombre que no es el del listado.
      mapa.setEstado(pais.id, 'acierto');
      pintarAviso(feedback, ['¡Bien! ', ...textoAviso(c.pais, 'país'), ...textoAviso(c.capital, 'capital')], a.siguiente).focus({ preventScroll: true });
    } else if (c.puntos === 0.5) {
      mapa.setEstado(pais.id, 'fallo');
      const titulo = vale(c.pais)
        ? ['Medio punto: el país, bien. La capital ', preposicionDe(pais.nombre), pais.nombre, ' es ', capital, '.']
        : ['Medio punto: la capital, bien. Es la capital ', preposicionDe(pais.nombre), nombre, '.'];
      pintarFallo(feedback, titulo, a.truco, a.siguiente)?.focus({ preventScroll: true });
    } else {
      mapa.setEstado(pais.id, 'fallo');
      pintarFallo(feedback, ['Es ', nombre, ', con capital ', capital, '.'], a.truco, a.siguiente)?.focus({ preventScroll: true });
    }
    teclado.enterPara(a.siguiente);
  }
  return {};
};

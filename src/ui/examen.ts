import { corregirMapaMudo, notaExamen, paisesDeAmbito, prepararExamen, type AmbitoExamen, type CorreccionMapaMudo } from '../logic/examen';
import type { Rng } from '../logic/rng';
import type { Continente, Pais } from '../logic/types';
import type { Mapa } from '../map/mapa';
import { boton, el, rellenar } from './dom';
import { progreso, type Motor } from './comun';
import type { Modo } from './explorar';
import { campoRespuesta } from './preguntas';

/** Lo que el examen necesita de la app. */
export interface ServiciosExamen {
  motor: Motor;
  candidatos: readonly Pais[];
  rng: Rng;
  /** Lista de examen del panel (null si no hay). */
  listaExamen: () => readonly string[] | null;
  /** Monta el mapa mudo de un continente con estos países; devuelve el mapa y cuánto dura el rótulo (0 si no cambia). */
  mapaContinente: (continente: Continente, paises: readonly Pais[]) => { mapa: Mapa; transicionMs: number };
  /** Añade países a los priorizados de Hoy. */
  priorizar: (ids: readonly string[]) => void;
}

type Cantidad = 10 | 20 | null;

interface Respuesta {
  pais: Pais;
  textoPais: string;
  textoCapital: string;
  correccion: CorreccionMapaMudo;
}

const NOMBRE_AMBITO: Record<AmbitoExamen, string> = {
  europa: 'Europa',
  asia: 'Asia',
  todo: 'Europa y Asia',
  lista: 'Lista del examen',
};

/** Continente en cuyo mapa sale un país (Rusia y Turquía, en el del ámbito si es uno solo; si no, en Europa). */
function continenteDe(p: Pais, ambito: AmbitoExamen): Continente {
  if ((ambito === 'europa' || ambito === 'asia') && p.continentes.includes(ambito)) return ambito;
  return p.continentes[0];
}

/** Recuerda la última elección en esta visita (solo en memoria). */
let ultimoAmbito: AmbitoExamen = 'europa';
let ultimaCantidad: Cantidad = 20;

/**
 * Pestaña "Examen" (SPEC 4.4): como el examen de clase. Mapa mudo del
 * continente entero, con las estrellas de las capitales; se resalta una y se
 * escriben país y capital. Sin trucos, sin corregir en el momento ni repetir.
 * Al final, nota sobre 10 y lista de fallos, con opción de priorizarlos en Hoy.
 */
export function iniciarExamen(panel: HTMLElement, s: ServiciosExamen): Modo {
  const contenedor = el('div', 'contenido-modo');
  panel.replaceChildren(contenedor);
  let ambito: AmbitoExamen = ultimoAmbito === 'lista' && !s.listaExamen()?.length ? 'europa' : ultimoAmbito;
  let cantidad: Cantidad = ultimaCantidad;
  let mapa: Mapa | null = null;

  function selector<T>(etiqueta: string, opciones: { valor: T; texto: string; desactivado?: boolean }[], actual: T, elegir: (v: T) => void): HTMLElement {
    const grupo = el('div', 'selector-practica');
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-label', etiqueta);
    for (const o of opciones) {
      const b = boton(o.texto, 'selector-opcion', () => elegir(o.valor));
      b.setAttribute('aria-pressed', String(o.valor === actual));
      b.disabled = Boolean(o.desactivado);
      grupo.append(b);
    }
    return el('div', 'campo-etiquetado', el('span', 'etiqueta-campo', etiqueta), grupo);
  }

  function paisesAmbito(): Pais[] {
    return paisesDeAmbito(ambito, s.candidatos, s.listaExamen());
  }

  function pintarInicio(): void {
    const lista = s.listaExamen();
    const total = paisesAmbito().length;
    const empezar = boton('Empezar examen', 'boton-principal', empezarExamen);
    empezar.disabled = total === 0;
    rellenar(
      contenedor,
      el('h2', 'titulo-panel', 'Examen'),
      el(
        'p',
        'ayuda',
        'Como el de clase: un mapa mudo con las estrellas de las capitales. Escribe el país y la capital de la estrella resaltada. Al final verás tu nota.',
      ),
      selector<AmbitoExamen>(
        'Qué entra',
        [
          { valor: 'europa', texto: 'Europa' },
          { valor: 'asia', texto: 'Asia' },
          { valor: 'todo', texto: 'Las dos' },
          ...(lista?.length ? [{ valor: 'lista' as AmbitoExamen, texto: 'Lista del examen' }] : []),
        ],
        ambito,
        (v) => {
          ambito = ultimoAmbito = v;
          pintarInicio();
        },
      ),
      selector<Cantidad>(
        'Cuántas preguntas',
        [
          { valor: 10, texto: '10', desactivado: total < 10 },
          { valor: 20, texto: '20', desactivado: total < 20 },
          { valor: null, texto: `Todas (${total})` },
        ],
        cantidad,
        (v) => {
          cantidad = ultimaCantidad = v;
          pintarInicio();
        },
      ),
      el('p', 'ayuda', 'Un punto por país y capital; medio punto si aciertas solo uno de los dos. Cuenta para tus repasos.'),
      el('div', 'acciones', empezar),
    );
  }

  function empezarExamen(): void {
    const paises = paisesAmbito();
    const n = cantidad !== null && cantidad < paises.length ? cantidad : null;
    const ids = prepararExamen(paises, n, s.rng);
    // Por continentes: primero Europa y luego Asia, cada uno en su mapa entero.
    const orden: Continente[] = ['europa', 'asia'];
    const preguntas = ids
      .map((id) => paises.find((p) => p.id === id)!)
      .sort((a, b) => orden.indexOf(continenteDe(a, ambito)) - orden.indexOf(continenteDe(b, ambito)));
    const respuestas: Respuesta[] = [];
    let i = 0;
    let continenteActual: Continente | null = null;

    function pregunta(): void {
      if (i >= preguntas.length) {
        pintarResultado(respuestas);
        return;
      }
      const pais = preguntas[i];
      const continente = continenteDe(pais, ambito);
      let transicionMs = 0;
      if (continente !== continenteActual) {
        continenteActual = continente;
        // El continente entero, con todas sus estrellas (como el examen real), aunque solo se pregunte por el ámbito.
        const enMapa = s.candidatos.filter((p) => continenteDe(p, ambito) === continente);
        const montado = s.mapaContinente(continente, enMapa);
        mapa = montado.mapa;
        transicionMs = montado.transicionMs;
        mapa.setInteractivo(false);
        mapa.mostrarEstrellas(enMapa.map((p) => p.id));
      }
      // La estrella resaltada, su país sombreado y, si es pequeño, el mapa acercado
      // (si no, Ciudad del Vaticano se confundiría con Roma).
      mapa!.limpiarEstados();
      mapa!.setEstado(pais.id, 'objetivo');
      mapa!.mostrarCapital(pais.id, false);
      mapa!.enfocar(pais.id);

      const campoPais = campoRespuesta('País', 'País');
      const campoCapital = campoRespuesta('Capital', 'Capital');
      campoPais.enterKeyHint = 'next';
      campoCapital.enterKeyHint = 'done';
      const seguir = el('button', 'boton-principal', i === preguntas.length - 1 ? 'Terminar' : 'Siguiente');
      seguir.type = 'submit';
      const form = el(
        'form',
        'respuesta-form mapa-mudo-form',
        el('label', 'campo-etiquetado', el('span', 'etiqueta-campo', 'País'), campoPais),
        el('label', 'campo-etiquetado', el('span', 'etiqueta-campo', 'Capital'), campoCapital),
        el('div', 'acciones', seguir),
      );
      const inicio = performance.now() + transicionMs;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.activeElement === campoPais && !campoCapital.value.trim()) {
          campoCapital.focus();
          return;
        }
        const correccion = corregirMapaMudo(campoPais.value, campoCapital.value, pais, s.candidatos);
        respuestas.push({ pais, textoPais: campoPais.value.trim(), textoCapital: campoCapital.value.trim(), correccion });
        s.motor.registrar(pais.id, 'mapamudo', correccion.resultado, Math.max(0, performance.now() - inicio), { examen: true });
        i++;
        pregunta();
      });
      rellenar(
        contenedor,
        progreso(`Pregunta ${i + 1} de ${preguntas.length} · ${NOMBRE_AMBITO[ambito]}`),
        el('p', 'enunciado', '¿Qué país es y cuál es su capital?'),
        el('p', 'ayuda', 'La estrella resaltada. Si no lo sabes, déjalo en blanco.'),
        form,
      );
      campoPais.focus({ preventScroll: true });
    }

    pregunta();
  }

  function pintarResultado(respuestas: Respuesta[]): void {
    mapa?.mostrarCapital(null);
    mapa?.limpiarEstados();
    mapa?.enfocar(null);
    const nota = notaExamen(respuestas.map((r) => r.correccion.puntos));
    const completas = respuestas.filter((r) => r.correccion.puntos === 1).length;
    const medias = respuestas.filter((r) => r.correccion.puntos === 0.5).length;
    const nada = respuestas.length - completas - medias;
    const fallos = respuestas.filter((r) => r.correccion.puntos < 1);
    // En el mapa que queda, los fallados del último continente, marcados.
    for (const r of fallos) mapa?.setEstado(r.pais.id, 'fallo');

    const lista = el('ul', 'lista-fallos');
    for (const r of fallos) {
      const paisBien = r.correccion.pais.tipo !== 'fallo' && r.correccion.pais.tipo !== 'vacio';
      const capitalBien = r.correccion.capital.tipo !== 'fallo' && r.correccion.capital.tipo !== 'vacio';
      const escrito = [r.textoPais || '—', r.textoCapital || '—'].join(' / ');
      lista.append(
        el(
          'li',
          '',
          el('strong', '', r.pais.nombre),
          ' · ',
          r.pais.capital,
          el('span', 'fallo-detalle', `Escribiste: ${escrito}`, paisBien ? ' · el país, bien' : capitalBien ? ' · la capital, bien' : ''),
        ),
      );
    }

    const priorizar = fallos.length
      ? boton('Repasarlos antes en Hoy', 'boton-principal', () => {
          s.priorizar(fallos.map((r) => r.pais.id));
          priorizar!.disabled = true;
          priorizar!.textContent = 'Saldrán antes en Hoy';
        })
      : null;
    const otro = boton('Otro examen', priorizar ? 'boton-secundario' : 'boton-principal', pintarInicio);
    rellenar(
      contenedor,
      el('p', 'resumen-titulo', 'Examen terminado'),
      el('p', 'nota-examen', 'Nota: ', el('strong', '', nota.toLocaleString('es-ES'))),
      el('p', 'resumen', `${completas} completas, ${medias} a medias y ${nada} sin acertar, de ${respuestas.length}.`),
      fallos.length ? el('p', 'resumen-escalones', el('strong', '', 'Para repasar:')) : el('p', 'resumen', '¡Todas bien!'),
      fallos.length ? lista : null,
      el('div', 'acciones', priorizar, otro),
    );
    (priorizar ?? otro).focus({ preventScroll: true });
  }

  pintarInicio();

  return {
    alSeleccionarPais: () => undefined,
    salir: () => undefined,
  };
}

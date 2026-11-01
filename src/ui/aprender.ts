import type { ModoId } from '../logic/config';
import { mensajeResumen } from '../logic/mensajes';
import { ESCALONES, escalonDe, type EstadoProgreso, type Escalon } from '../logic/progreso';
import type { ResumenRonda } from '../logic/sesion';
import { boton, el, rellenar } from './dom';
import type { Contexto, ModoPractica, Motor } from './comun';
import type { Modo } from './explorar';
import { iniciarColocar } from './colocar';
import { iniciarRonda } from './ronda';

export const NOMBRE_ESCALON: Record<Escalon, string> = {
  elegir: 'Elegir',
  colocar: 'Colocar',
  escribir: 'Escribir',
  mapamudo: 'Mapa mudo',
};

const QUE_SE_HACE: Record<Escalon, string> = {
  elegir: 'reconocer la capital entre cuatro',
  colocar: 'llevar cada capital a su país',
  escribir: 'escribir la capital de memoria',
  mapamudo: 'decir país y capital con solo la estrella',
};

/** Modo de la pregunta suelta de cada escalón (Colocar, cuando va suelto, es Al revés). */
function modoDeEscalon(e: Escalon): ModoId {
  return e === 'colocar' ? 'alreves' : e;
}

/**
 * Pestaña "Aprender" (SPEC 4.3): los países de la región, cada uno en su
 * escalón (Elegir → Colocar → Escribir → Mapa mudo). Cada tanda pregunta una
 * vez por cada país pendiente, en el modo de su escalón; los de Colocar van
 * juntos en el pool de capitales. Dos aciertos separados suben de escalón.
 */
export function iniciarAprender(panel: HTMLElement, ctx: Omit<Contexto, 'contenedor'>, estado: () => EstadoProgreso): Modo {
  const contenedor = el('div', 'contenido-modo');
  panel.replaceChildren(contenedor);
  let actual: ModoPractica | null = null;
  const subieron = new Map<string, Escalon>();
  const aprendidos = new Set<string>();
  let resumen: ResumenRonda = { total: 0, aLaPrimera: 0, fallos: 0 };

  const nombre = (id: string) => ctx.region.find((p) => p.id === id)?.nombre ?? id;

  /** El motor de la app, apuntando quién sube de escalón en esta tanda. */
  const motor: Motor = {
    ...ctx.motor,
    registrar(paisId, modo, resultado, tiempoMs, opciones) {
      const cambio = ctx.motor.registrar(paisId, modo, resultado, tiempoMs, opciones);
      if (cambio.aprendido) {
        aprendidos.add(paisId);
        subieron.delete(paisId);
      } else if (cambio.subio) {
        const e = escalonDe(estado(), paisId);
        if (e) subieron.set(paisId, e);
      }
      return cambio;
    },
  };
  const contexto = { ...ctx, contenedor, motor };

  /** Los países de la región agrupados por escalón, más los aprendidos. */
  function escalera(): HTMLElement {
    const e = estado();
    const lista = el('ol', 'escalera');
    lista.setAttribute('aria-label', 'Escalones de esta región');
    const filas: { titulo: string; detalle: string; ids: string[]; clase: string }[] = ESCALONES.map((esc, i) => ({
      titulo: `${i + 1}. ${NOMBRE_ESCALON[esc]}`,
      detalle: QUE_SE_HACE[esc],
      ids: ctx.region.filter((p) => escalonDe(e, p.id) === esc).map((p) => p.id),
      clase: `escalon-${esc}`,
    }));
    filas.push({
      titulo: 'Aprendidos',
      detalle: 'se repasan en Hoy',
      ids: ctx.region.filter((p) => escalonDe(e, p.id) === null).map((p) => p.id),
      clase: 'escalon-aprendido',
    });
    for (const f of filas) {
      const li = el(
        'li',
        `escalon ${f.clase}${f.ids.length ? '' : ' vacio'}`,
        el('span', 'escalon-titulo', f.titulo, el('span', 'escalon-cuenta', String(f.ids.length))),
        el('span', 'escalon-detalle', f.detalle),
        f.ids.length ? el('span', 'escalon-paises', f.ids.map(nombre).sort((a, b) => a.localeCompare(b, 'es')).join(', ')) : null,
      );
      lista.append(li);
    }
    return lista;
  }

  function pendientes(): string[] {
    const e = estado();
    return ctx.region.filter((p) => escalonDe(e, p.id) !== null).map((p) => p.id);
  }

  function pintarInicio(): void {
    actual?.salir();
    actual = null;
    const hay = pendientes().length > 0;
    const empezar = hay
      ? boton('Empezar', 'boton-principal', empezarTanda)
      : boton('Repasar con mapa mudo', 'boton-principal', repasoMapaMudo);
    contenedor.replaceChildren(
      el('h2', 'titulo-panel', 'Aprender'),
      el(
        'p',
        'ayuda',
        hay
          ? 'Cada país sube de escalón con dos aciertos en tandas distintas. Al superar el último, queda aprendido y pasa a Hoy.'
          : 'Ya has aprendido todos los países de esta región: los repasarás en Hoy. Si quieres, puedes practicarlos ahora con el mapa mudo.',
      ),
      escalera(),
      el('div', 'acciones', empezar),
    );
    empezar.focus({ preventScroll: true });
  }

  function acumular(r: ResumenRonda): void {
    resumen = { total: resumen.total + r.total, aLaPrimera: resumen.aLaPrimera + r.aLaPrimera, fallos: resumen.fallos + r.fallos };
  }

  function empezarTanda(): void {
    actual?.salir();
    subieron.clear();
    aprendidos.clear();
    resumen = { total: 0, aLaPrimera: 0, fallos: 0 };
    const e = estado();
    const ids = pendientes();
    const modos = new Map(ids.map((id) => [id, escalonDe(e, id)!]));
    const enColocar = ids.filter((id) => modos.get(id) === 'colocar');
    // Colocar necesita al menos dos capitales para tener sentido; con una sola, va suelta (Al revés).
    if (enColocar.length >= 2) {
      actual = iniciarColocar(contexto, {
        ids: enColocar,
        alTerminar(r) {
          acumular(r);
          const resto = ids.filter((id) => modos.get(id) !== 'colocar');
          if (resto.length) rondaSuelta(resto, modos);
          else pintarFinal();
        },
      });
    } else {
      rondaSuelta(ids, modos);
    }
  }

  function rondaSuelta(ids: string[], modos: Map<string, Escalon>): void {
    actual?.salir();
    actual = iniciarRonda(contexto, {
      ids: () => ids,
      modoPara: (id) => modoDeEscalon(modos.get(id) ?? 'elegir'),
      alTerminar(r) {
        acumular(r);
        pintarFinal();
      },
    });
  }

  function repasoMapaMudo(): void {
    actual?.salir();
    subieron.clear();
    aprendidos.clear();
    resumen = { total: 0, aLaPrimera: 0, fallos: 0 };
    actual = iniciarRonda(contexto, {
      ids: () => ctx.region.map((p) => p.id),
      modoPara: () => 'mapamudo',
      alTerminar(r) {
        acumular(r);
        pintarFinal();
      },
    });
  }

  function pintarFinal(): void {
    actual?.salir();
    actual = null;
    ctx.mapa.limpiarEstados();
    ctx.mapa.mostrarCapital(null);
    const listaNombres = (ids: string[]) => ids.map(nombre).join(', ');
    const sube = [...subieron.entries()];
    const seguir = boton(pendientes().length ? 'Seguir aprendiendo' : 'Ver la región', 'boton-principal', () =>
      pendientes().length ? empezarTanda() : pintarInicio(),
    );
    rellenar(
      contenedor,
      el('p', 'resumen-titulo', 'Tanda terminada'),
      el('p', 'resumen', mensajeResumen(resumen.aLaPrimera, resumen.total)),
      aprendidos.size ? el('p', 'resumen-escalones', el('strong', '', 'Aprendidos: '), listaNombres([...aprendidos]), '. Ya pasan a Hoy.') : null,
      sube.length
        ? el(
            'p',
            'resumen-escalones',
            el('strong', '', 'Suben de escalón: '),
            sube.map(([id, esc]) => `${nombre(id)} (a ${NOMBRE_ESCALON[esc]})`).join(', '),
            '.',
          )
        : null,
      escalera(),
      el('div', 'acciones', seguir, boton('Explorar el mapa', 'boton-secundario', ctx.alExplorar)),
    );
    seguir.focus({ preventScroll: true });
  }

  pintarInicio();

  return {
    alSeleccionarPais: (id) => actual?.alSeleccionarPais(id),
    salir: () => actual?.salir(),
  };
}

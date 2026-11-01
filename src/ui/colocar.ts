import { RondaColocar } from '../logic/colocar';
import { conArticulo, preposicionDe } from '../logic/mensajes';
import { boton, el } from './dom';
import { pintarAcierto, pintarFallo, pintarResumen, progreso, type Contexto, type ModoPractica } from './comun';

/**
 * Modo 3: tandas de capitales para colocar. "Toca la capital, luego toca el
 * país." Todos los países de la región se pueden tocar siempre.
 */
export function iniciarColocar(ctx: Contexto): ModoPractica {
  const { contenedor, mapa, region, rng, motor } = ctx;
  /** Momento de la última acción, para medir el tiempo de cada colocación. */
  let desde = performance.now();
  mapa.setInteractivo(true);

  let ronda = new RondaColocar(region.map((p) => p.id), rng);
  let seleccionada: string | null = null;
  /** Países colocados en la tanda actual (en verde). */
  const colocados = new Set<string>();
  /** Marcas temporales del último intento (fallo y país correcto). */
  let marcasTemporales: string[] = [];
  let colocadasEnRonda = 0;

  const cabecera = el('div', 'cabecera-modo');
  const pool = el('div', 'pool');
  pool.setAttribute('aria-label', 'Capitales por colocar');
  const feedback = el('div', 'feedback');

  function nombre(id: string): string {
    return region.find((p) => p.id === id)!.nombre;
  }
  function capital(id: string): string {
    return region.find((p) => p.id === id)!.capital;
  }

  function limpiarMarcas(): void {
    for (const id of marcasTemporales) mapa.setEstado(id, colocados.has(id) ? 'acierto' : null);
    marcasTemporales = [];
    mapa.mostrarCapital(null);
  }

  function pintarTanda(): void {
    const { total } = ronda.resumen();
    cabecera.replaceChildren(
      progreso(`Tanda ${ronda.numeroTanda()} · ${colocadasEnRonda} de ${total} colocadas`),
      el('p', 'enunciado', 'Toca una capital y después su país en el mapa.'),
    );
    pool.replaceChildren(
      ...ronda.tanda().map((id) => {
        const b = boton(capital(id), 'chip chip-capital', () => elegir(id));
        b.dataset.id = id;
        b.setAttribute('aria-pressed', String(id === seleccionada));
        return b;
      }),
    );
  }


  function elegir(id: string): void {
    limpiarMarcas();
    seleccionada = id;
    for (const b of pool.querySelectorAll<HTMLButtonElement>('.chip-capital')) {
      b.setAttribute('aria-pressed', String(b.dataset.id === id));
    }
    feedback.className = 'feedback';
    feedback.replaceChildren(el('p', 'feedback-texto pista', `Ahora toca el país de ${capital(id)}.`));
  }

  function alTocarPais(paisId: string): void {
    if (ronda.terminada()) return;
    if (!seleccionada) {
      limpiarMarcas();
      feedback.className = 'feedback';
      feedback.replaceChildren(el('p', 'feedback-texto pista', 'Primero elige una capital de la lista.'));
      return;
    }
    const capitalDe = seleccionada;
    seleccionada = null;
    const r = ronda.colocar(capitalDe, paisId);
    motor.registrar(capitalDe, 'colocar', r.acierto ? 'acierto' : 'fallo', performance.now() - desde);
    desde = performance.now();

    if (r.acierto) {
      colocadasEnRonda++;
      colocados.add(paisId);
      mapa.setEstado(paisId, 'acierto');
      mapa.mostrarCapital(paisId);
      marcasTemporales = [];
      pintarAcierto(feedback, r.recuperado, rng, null);
    } else {
      mapa.setEstado(paisId, 'fallo');
      mapa.setEstado(capitalDe, 'objetivo');
      mapa.mostrarCapital(capitalDe);
      marcasTemporales = [paisId, capitalDe];
      pintarFallo(
        feedback,
        ['Has tocado ', conArticulo(nombre(paisId)), '. ', capital(capitalDe), ` es la capital ${preposicionDe(nombre(capitalDe))}`, el('strong', '', nombre(capitalDe)), '.'],
        motor.truco(capitalDe),
        null,
      );
    }

    if (r.rondaTerminada) {
      // Un momento para ver el último resultado antes del resumen.
      window.setTimeout(() => {
        if (!contenedor.contains(feedback)) return;
        limpiarTodo();
        pintarResumen(contenedor, ronda.resumen(), otraRonda, ctx.alExplorar);
      }, r.acierto ? 1200 : 2600);
      pool.replaceChildren();
      return;
    }
    if (r.tandaTerminada) {
      // Nueva tanda: se borran los verdes para que el mapa no delate las que quedan.
      // El último colocado sigue en verde hasta la siguiente acción.
      for (const id of colocados) if (!(r.acierto && id === paisId)) mapa.setEstado(id, null);
      colocados.clear();
      if (r.acierto) marcasTemporales = [paisId];
    }
    pintarTanda();
  }

  function limpiarTodo(): void {
    mapa.limpiarEstados();
    mapa.mostrarCapital(null);
    colocados.clear();
    marcasTemporales = [];
  }

  function otraRonda(): void {
    ronda = new RondaColocar(region.map((p) => p.id), rng);
    colocadasEnRonda = 0;
    seleccionada = null;
    limpiarTodo();
    feedback.className = 'feedback';
    feedback.replaceChildren();
    contenedor.replaceChildren(cabecera, pool, feedback);
    pintarTanda();
  }

  otraRonda();

  return {
    alSeleccionarPais: alTocarPais,
    salir() {
      limpiarTodo();
    },
  };
}

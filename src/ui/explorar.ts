import type { Pais } from '../logic/types';
import { trucoPrincipal } from '../logic/datos';
import type { Mapa } from '../map/mapa';
import { boton, el, rellenar } from './dom';

export interface Modo {
  /** Se llama al tocar un país del mapa. */
  alSeleccionarPais(id: string): void;
  /** Se llama al salir del modo. */
  salir(): void;
}

/** Modo 1: tocar un país muestra su capital y su truco. Sin evaluación. */
export function iniciarExplorar(panel: HTMLElement, mapa: Mapa, region: readonly Pais[]): Modo {
  let seleccionado: string | null = null;
  mapa.setInteractivo(true);

  const ficha = el('div', 'ficha');
  const lista = el('div', 'lista-paises');
  lista.setAttribute('aria-label', 'Países de la región');
  const botones = new Map<string, HTMLButtonElement>();
  for (const p of [...region].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
    const b = boton(p.nombre, 'chip', () => seleccionar(p.id));
    botones.set(p.id, b);
    lista.append(b);
  }

  panel.replaceChildren(el('h2', 'titulo-panel', 'Explorar'), ficha, lista);
  pintarFicha();

  function seleccionar(id: string): void {
    if (seleccionado) mapa.setEstado(seleccionado, null);
    seleccionado = id;
    mapa.setEstado(id, 'seleccion');
    mapa.mostrarCapital(id);
    for (const [bid, b] of botones) b.setAttribute('aria-pressed', String(bid === id));
    pintarFicha();
  }

  function pintarFicha(): void {
    const pais = region.find((p) => p.id === seleccionado);
    if (!pais) {
      ficha.replaceChildren(el('p', 'ayuda', 'Toca un país en el mapa (o en la lista) para ver su capital.'));
      return;
    }
    const truco = trucoPrincipal(pais);
    rellenar(
      ficha,
      el('p', 'ficha-pais', el('span', 'nombre-pais seleccion', pais.nombre)),
      el('p', 'ficha-capital', el('span', 'estrella-texto', '★'), ' ', pais.capital),
      truco && el('p', 'truco', el('span', 'truco-etiqueta', 'Truco'), truco),
      pais.nota && el('p', 'nota', pais.nota),
    );
  }

  return {
    alSeleccionarPais: seleccionar,
    salir() {
      if (seleccionado) mapa.setEstado(seleccionado, null);
      mapa.mostrarCapital(null);
    },
  };
}

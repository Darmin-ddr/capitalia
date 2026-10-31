import type { Pais } from '../logic/types';
import type { Mapa } from '../map/mapa';
import { boton, el, rellenar } from './dom';

export interface Modo {
  /** Se llama al tocar un país del mapa. */
  alSeleccionarPais(id: string): void;
  /** Se llama al salir del modo. */
  salir(): void;
}

/** Trucos de un país: el predefinido (si lo hay y está activo) y el propio del alumno. */
export interface ServicioTrucos {
  predefinido(paisId: string): string | null;
  propio(paisId: string): string | null;
  /** Guarda el truco propio (null lo borra y vuelve al predefinido). */
  guardarPropio(paisId: string, texto: string | null): void;
}

const MAX_TRUCO = 160;

/**
 * Modo 1: tocar un país muestra su capital y su truco. Sin evaluación.
 * Permite inventar un truco propio, que sustituye al predefinido (SPEC 5.3).
 */
export function iniciarExplorar(panel: HTMLElement, mapa: Mapa, region: readonly Pais[], trucos: ServicioTrucos): Modo {
  let seleccionado: string | null = null;
  let editando = false;
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
    editando = false;
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
    const propio = trucos.propio(pais.id);
    const predefinido = trucos.predefinido(pais.id);
    const cabecera = [
      el('p', 'ficha-pais', el('span', 'nombre-pais seleccion', pais.nombre)),
      el('p', 'ficha-capital', el('span', 'estrella-texto', '★'), ' ', pais.capital),
    ];

    if (editando) {
      const area = el('textarea', 'campo-truco');
      area.maxLength = MAX_TRUCO;
      area.rows = 3;
      area.value = propio ?? '';
      area.placeholder = 'Una frase corta que te ayude a recordarla';
      area.setAttribute('aria-label', `Tu truco para ${pais.capital}`);
      const guardar = boton('Guardar', 'boton-principal', () => {
        const texto = area.value.trim();
        trucos.guardarPropio(pais.id, texto || null);
        editando = false;
        pintarFicha();
      });
      const cancelar = boton('Cancelar', 'boton-secundario', () => {
        editando = false;
        pintarFicha();
      });
      rellenar(ficha, ...cabecera, area, el('div', 'acciones', guardar, cancelar));
      area.focus();
      return;
    }

    const truco = propio ?? predefinido;
    const inventar = boton(propio ? 'Cambiar mi truco' : 'Inventa tu truco', 'boton-enlace', () => {
      editando = true;
      pintarFicha();
    });
    const volver =
      propio &&
      boton(predefinido ? 'Volver al truco original' : 'Borrar mi truco', 'boton-enlace', () => {
        trucos.guardarPropio(pais.id, null);
        pintarFicha();
      });
    rellenar(
      ficha,
      ...cabecera,
      truco && el('p', 'truco', el('span', 'truco-etiqueta', propio ? 'Tu truco' : 'Truco'), truco),
      pais.nota && el('p', 'nota', pais.nota),
      el('div', 'acciones-truco', inventar, volver),
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

import type { Pais } from '../logic/types';
import type { Rng } from '../logic/rng';
import type { Mapa } from '../map/mapa';
import { boton, el } from './dom';
import type { Contexto, ModoPractica } from './comun';
import type { Modo } from './explorar';
import { iniciarElegir } from './elegir';
import { iniciarColocar } from './colocar';
import { iniciarEscribir } from './escribir';
import { iniciarAlReves } from './alreves';

export type TipoPractica = 'elegir' | 'colocar' | 'escribir' | 'alreves';

/** Último tipo elegido, para volver a él al regresar de Explorar (solo en memoria). */
let ultimo: TipoPractica = 'elegir';

const MODOS: { id: TipoPractica; nombre: string; inicio: (ctx: Contexto) => ModoPractica }[] = [
  { id: 'elegir', nombre: 'Elegir', inicio: iniciarElegir },
  { id: 'colocar', nombre: 'Colocar', inicio: iniciarColocar },
  { id: 'escribir', nombre: 'Escribir', inicio: iniciarEscribir },
  { id: 'alreves', nombre: 'Al revés', inicio: iniciarAlReves },
];

/**
 * Pestaña "Practicar": selector de modo (2 a 5) y el modo elegido.
 * En el hito 2 el alumno elige el modo; el avance automático por modos
 * según el dominio llega con el progreso (hito 3).
 */
export function iniciarPracticar(
  panel: HTMLElement,
  mapa: Mapa,
  region: readonly Pais[],
  candidatos: readonly Pais[],
  rng: Rng,
  alExplorar: () => void,
  inicial: TipoPractica = ultimo,
): Modo {
  const contenedor = el('div', 'contenido-modo');
  const selector = el('div', 'selector-practica');
  selector.setAttribute('role', 'group');
  selector.setAttribute('aria-label', 'Tipo de práctica');
  let actual: ModoPractica | null = null;

  const botones = MODOS.map((m) => {
    const b = boton(m.nombre, 'selector-opcion', () => cambiar(m.id));
    b.dataset.modo = m.id;
    selector.append(b);
    return b;
  });

  panel.replaceChildren(selector, contenedor);

  function cambiar(id: TipoPractica): void {
    actual?.salir();
    ultimo = id;
    for (const b of botones) b.setAttribute('aria-pressed', String(b.dataset.modo === id));
    const modo = MODOS.find((m) => m.id === id)!;
    actual = modo.inicio({ contenedor, mapa, region, candidatos, rng, alExplorar });
  }

  cambiar(inicial);

  return {
    alSeleccionarPais: (id) => actual?.alSeleccionarPais(id),
    salir: () => actual?.salir(),
  };
}

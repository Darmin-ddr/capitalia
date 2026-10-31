import { el } from './dom';
import type { Contexto } from './comun';
import type { Modo } from './explorar';
import { iniciarRonda } from './ronda';

/**
 * Pestaña "Repaso": la sesión normal (SPEC 7). Unos 20 países elegidos por
 * prioridad (vencidos, nuevos, repaso adelantado) y cada uno en el modo que
 * le toca según su dominio. Al terminar, se puede seguir con otra sesión.
 */
export function iniciarRepaso(panel: HTMLElement, ctx: Omit<Contexto, 'contenedor'>, idsSesion: () => string[]): Modo {
  const contenedor = el('div', 'contenido-modo');
  panel.replaceChildren(el('h2', 'titulo-panel', 'Repaso'), contenedor);
  const ronda = iniciarRonda(
    { ...ctx, contenedor },
    {
      ids: idsSesion,
      modoPara: (id) => ctx.motor.modoPara(id),
      respetarOrden: true,
      textosResumen: { titulo: 'Sesión terminada', otra: 'Seguir practicando' },
    },
  );
  return { alSeleccionarPais: ronda.alSeleccionarPais, salir: ronda.salir };
}

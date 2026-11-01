import { boton, el } from './dom';
import type { Contexto, ModoPractica } from './comun';
import type { Modo } from './explorar';
import { iniciarRonda } from './ronda';

export interface InfoExamen {
  /** Texto corto: "faltan 5 días", "es mañana"... (o null si no hay fecha). */
  cuando: string | null;
  /** Países del examen en la región actual, ya ordenados (lo flojo primero). */
  ids: () => string[];
  /** Cuántos países del examen hay en total y en esta región. */
  total: number;
  enRegion: number;
}

/**
 * Pestaña "Repaso": la sesión normal (SPEC 7). Unos 20 países elegidos por
 * prioridad (vencidos, nuevos, repaso adelantado) y cada uno en el modo que
 * le toca según su dominio. Al terminar, se puede seguir con otra sesión.
 * Si hay un examen configurado, se puede cambiar a "Preparar examen".
 */
export function iniciarRepaso(
  panel: HTMLElement,
  ctx: Omit<Contexto, 'contenedor'>,
  idsSesion: () => string[],
  examen: InfoExamen | null,
): Modo {
  const contenedor = el('div', 'contenido-modo');
  let ronda: ModoPractica | null = null;
  let enExamen = false;

  const cabecera = el('div', 'cabecera-repaso');
  panel.replaceChildren(cabecera, contenedor);

  function pintarCabecera(): void {
    if (!examen) {
      cabecera.replaceChildren(el('h2', 'titulo-panel', 'Repaso'));
      return;
    }
    const selector = el('div', 'selector-practica selector-repaso');
    const normal = boton('Repaso', 'selector-opcion', () => cambiar(false));
    const prep = boton('Preparar examen', 'selector-opcion', () => cambiar(true));
    normal.setAttribute('aria-pressed', String(!enExamen));
    prep.setAttribute('aria-pressed', String(enExamen));
    prep.disabled = examen.enRegion === 0;
    selector.append(normal, prep);
    const info =
      examen.enRegion > 0
        ? `Examen${examen.cuando ? ` (${examen.cuando})` : ''}: ${examen.enRegion} de sus ${examen.total} países están en esta región.`
        : `Examen${examen.cuando ? ` (${examen.cuando})` : ''}: ningún país de esta región entra. Cambia de región para prepararlo (las marcadas con 📝).`;
    cabecera.replaceChildren(selector, el('p', 'ayuda info-examen', info));
  }

  function cambiar(examenSi: boolean): void {
    enExamen = examenSi;
    ronda?.salir();
    pintarCabecera();
    ronda = enExamen && examen
      ? iniciarRonda(
          { ...ctx, contenedor },
          {
            ids: examen.ids,
            modoPara: (id) => ctx.motor.modoPara(id),
            respetarOrden: true,
            examen: true,
            textosResumen: { titulo: 'Repaso de examen terminado', otra: 'Otra vuelta' },
          },
        )
      : iniciarRonda(
          { ...ctx, contenedor },
          {
            ids: idsSesion,
            modoPara: (id) => ctx.motor.modoPara(id),
            respetarOrden: true,
            textosResumen: { titulo: 'Sesión terminada', otra: 'Seguir practicando' },
          },
        );
  }

  cambiar(false);
  return {
    alSeleccionarPais: (id) => ronda?.alSeleccionarPais(id),
    salir: () => ronda?.salir(),
  };
}

import { boton, el } from './dom';

/**
 * Versión nueva de la app. El service worker (vite-plugin-pwa, autoUpdate)
 * descarga la versión nueva en segundo plano y toma el control en cuanto
 * está lista, pero la página abierta sigue con el código anterior hasta que
 * se recarga. Aquí se detecta ese momento (evento `controllerchange`) para
 * ofrecer "Actualizar" en la portada de Hoy, y se pide al navegador que busque
 * versión nueva al volver a la app (en iPhone y iPad volver solo la reanuda).
 */

let hayNueva = false;
const oyentes = new Set<() => void>();

export function prepararActualizacion(): void {
  const sw = navigator.serviceWorker;
  if (!sw) return;
  // Sin service worker al cargar = primera visita: su toma de control no es una versión nueva.
  let habiaControl = Boolean(sw.controller);
  sw.addEventListener('controllerchange', () => {
    if (!habiaControl) {
      habiaControl = true;
      return;
    }
    hayNueva = true;
    for (const f of oyentes) f();
  });
  // Al volver a la app, que mire si hay versión nueva (el navegador solo lo hace al navegar).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    void sw
      .getRegistration()
      .then((r) => r?.update())
      .catch(() => undefined);
  });
}

export function hayVersionNueva(): boolean {
  return hayNueva;
}

/** Avisa cuando la versión nueva queda lista. Devuelve cómo dejar de escuchar. */
export function alHaberVersionNueva(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/** Recargar con la versión nueva (el progreso ya está guardado: se guarda en cada respuesta). */
export function actualizarAhora(): void {
  window.location.reload();
}

/**
 * Franja fina al pie, en todas las pestañas (si no se pasa por Hoy en días, que
 * no pase desapercibida). Va en el flujo de la página: no tapa nada. "×" la
 * oculta hasta la próxima vez que se abra la app. En la portada de Hoy no sale,
 * porque allí ya está el aviso.
 */
export function prepararFranjaVersion(app: HTMLElement): void {
  const mostrar = () => {
    if (document.getElementById('franja-version')) return;
    const cerrar = boton('×', 'boton-icono', () => franja.remove());
    cerrar.setAttribute('aria-label', 'Ocultar el aviso hasta la próxima vez');
    const franja = el(
      'div',
      'franja-version',
      el('p', '', el('strong', '', 'Hay una versión nueva'), el('span', 'franja-detalle', ' de Capitalia. Tu progreso no cambia.')),
      boton('Actualizar', 'boton-principal', actualizarAhora),
      cerrar,
    );
    franja.id = 'franja-version';
    franja.setAttribute('role', 'status');
    app.querySelector('main')?.after(franja);
  };
  if (hayNueva) mostrar();
  alHaberVersionNueva(mostrar);
}


import { boton, el } from './dom';

/**
 * Versión nueva de la app.
 * - La página va "primero la red" (vite.config.ts): con conexión, al abrir se ve
 *   siempre la última versión. Este aviso es para quien deja la app abierta (o
 *   la abrió sin conexión) mientras se publica otra.
 * - Para saberlo no se depende de cuándo actualice el navegador su copia: cada
 *   compilación tiene un identificador (`__COMPILACION__`) y el servidor publica
 *   el de la última en `version.json`. Si no coinciden, hay versión nueva. Se
 *   mira al volver a la app (pestaña, ventana o desde segundo plano) y cada 30 minutos.
 */

declare const __COMPILACION__: string;

let hayNueva = false;
const oyentes = new Set<() => void>();
/** Para no preguntar al servidor más de una vez por minuto. */
const ESPERA_MINIMA_MS = 60_000;

async function comprobar(): Promise<void> {
  if (hayNueva) return;
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const d = (await r.json()) as { compilacion?: unknown };
    if (typeof d.compilacion === 'string' && d.compilacion !== __COMPILACION__) {
      hayNueva = true;
      for (const f of oyentes) f();
    }
  } catch {
    // Sin conexión: ya se mirará más tarde.
  }
}

export function prepararActualizacion(): void {
  let ultima = 0;
  const buscar = () => {
    if (document.visibilityState !== 'visible' || Date.now() - ultima < ESPERA_MINIMA_MS) return;
    ultima = Date.now();
    void comprobar();
  };
  document.addEventListener('visibilitychange', buscar);
  window.addEventListener('focus', buscar);
  window.setInterval(buscar, 30 * 60_000);
  // Y una vez al arrancar, por si la página salió de la copia (sin conexión o con mala cobertura).
  window.setTimeout(buscar, 5_000);
}

export function hayVersionNueva(): boolean {
  return hayNueva;
}

/** Avisa cuando hay versión nueva. Devuelve cómo dejar de escuchar. */
export function alHaberVersionNueva(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/** Recargar: con "primero la red", la página que llega es la nueva (el progreso ya está guardado). */
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

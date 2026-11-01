import { boton, el, enterPulsaPrincipal } from './dom';

/**
 * Instalar la app (PWA) en el dispositivo.
 * - Chrome y Edge (Android y escritorio) avisan con el evento `beforeinstallprompt`:
 *   se guarda y un botón de la app abre la instalación del propio navegador.
 * - Safari de iPhone y iPad no deja lanzarla desde la página: solo se pueden
 *   enseñar los pasos (Compartir → Añadir a pantalla de inicio).
 * - Si ya está instalada (se abre como app), no se ofrece.
 * El aviso de la portada se descarta una vez y no vuelve: es una preferencia de
 * este dispositivo, guardada aparte del progreso.
 */

interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type FormaInstalar = 'instalada' | 'nativa' | 'ios' | 'manual';

const CLAVE_AVISO = 'capitalia-aviso-instalar';
let evento: EventoInstalacion | null = null;
let instaladaAhora = false;
const oyentes = new Set<() => void>();

function avisarCambio(): void {
  for (const f of oyentes) f();
}

/** Escuchar al navegador desde el arranque (el evento puede llegar antes de que se pinte nada). */
export function prepararInstalacion(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evento = e as EventoInstalacion;
    avisarCambio();
  });
  window.addEventListener('appinstalled', () => {
    instaladaAhora = true;
    evento = null;
    avisarCambio();
  });
}

/** Para repintar lo que dependa de la instalación (el evento llega cuando quiere). */
export function alCambiarInstalacion(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

function esIOS(): boolean {
  const ua = navigator.userAgent;
  // El iPad con iPadOS se presenta como un Mac con pantalla táctil.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function formaInstalar(): FormaInstalar {
  const comoApp =
    instaladaAhora ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (comoApp) return 'instalada';
  if (evento) return 'nativa';
  return esIOS() ? 'ios' : 'manual';
}

function leerAviso(): string | null {
  try {
    return localStorage.getItem(CLAVE_AVISO);
  } catch {
    return null;
  }
}

export function avisoDescartado(): boolean {
  return leerAviso() === 'descartado';
}

export function descartarAviso(): void {
  try {
    localStorage.setItem(CLAVE_AVISO, 'descartado');
  } catch {
    // Sin almacenamiento: volverá a salir en otra visita. No es grave.
  }
}

/** Abre la instalación: la del navegador si la ofrece; si no, los pasos para este dispositivo. */
export function crearInstalar(): () => void {
  const dialogo = el('dialog', 'dialogo-regiones dialogo-instalar');
  dialogo.setAttribute('aria-label', 'Instalar la app');
  document.body.append(dialogo);
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close();
  });
  enterPulsaPrincipal(dialogo);

  function pasos(...lineas: (Node | string)[][]): HTMLElement {
    return el('ol', 'lista-guia pasos-instalar', ...lineas.map((l) => el('li', '', ...l)));
  }

  function mostrar(...hijos: (Node | string | null)[]): void {
    const cerrar = boton('Cerrar', 'boton-principal', () => dialogo.close());
    dialogo.replaceChildren(
      el('div', 'dialogo-contenido', el('h2', 'dialogo-titulo', 'Instalar la app'), ...hijos.filter((h): h is Node | string => h !== null), el('div', 'acciones acciones-cerrar', cerrar)),
    );
    if (!dialogo.open) dialogo.showModal();
    cerrar.focus({ preventScroll: true });
    // Al abrirse, el navegador baja hasta el botón con el foco: que se lea desde el título.
    dialogo.scrollTop = 0;
  }

  return () => {
    const forma = formaInstalar();
    if (forma === 'nativa' && evento) {
      const e = evento;
      void e.prompt().then(() =>
        e.userChoice.then((r) => {
          if (r.outcome === 'accepted') {
            instaladaAhora = true;
            evento = null;
          }
          avisarCambio();
        }),
      );
      return;
    }
    const ventaja = el('p', 'ayuda', 'Instalada, se abre como una app desde la pantalla de inicio y funciona también sin conexión. El progreso sigue siendo el mismo.');
    if (forma === 'instalada') {
      mostrar(el('p', '', 'Ya la tienes instalada en este dispositivo.'));
      return;
    }
    if (forma === 'ios') {
      mostrar(
        ventaja,
        pasos(
          ['Abre esta página en ', el('strong', '', 'Safari'), ' (en iPhone y iPad, desde ahí es lo más sencillo).'],
          ['Toca el botón ', el('strong', '', 'Compartir'), ': el cuadrado con una flecha hacia arriba (abajo en el iPhone, arriba en el iPad).'],
          ['Elige ', el('strong', '', 'Añadir a pantalla de inicio'), ' (si no lo ves, desliza la lista hacia abajo).'],
          ['Toca ', el('strong', '', 'Añadir'), '. Aparecerá el icono de Capitalia junto a tus otras apps.'],
        ),
      );
      return;
    }
    mostrar(
      ventaja,
      el('p', '', 'Este navegador no deja instalarla con un botón desde la página. Según el dispositivo:'),
      pasos(
        [el('strong', '', 'Android (Chrome):'), ' menú ⋮ (arriba a la derecha) → ', el('strong', '', 'Instalar aplicación'), ' o ', el('strong', '', 'Añadir a pantalla de inicio'), '.'],
        [el('strong', '', 'Ordenador (Chrome o Edge):'), ' el icono de instalar en la barra de direcciones, a la derecha, o menú → ', el('strong', '', 'Instalar Capitalia'), '.'],
        [el('strong', '', 'iPhone o iPad:'), ' en Safari, Compartir → ', el('strong', '', 'Añadir a pantalla de inicio'), '.'],
      ),
    );
  };
}

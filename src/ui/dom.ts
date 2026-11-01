type Hijo = Node | string | null | undefined | false;

/** Crea un elemento con clase y contenido. El texto se inserta siempre como texto, nunca como HTML. */
export function el<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  clase?: string,
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(etiqueta);
  if (clase) e.className = clase;
  for (const h of hijos) if (h) e.append(h);
  return e;
}

export function boton(texto: string, clase: string, alPulsar: () => void): HTMLButtonElement {
  const b = el('button', clase, texto);
  b.type = 'button';
  b.addEventListener('click', alPulsar);
  return b;
}

/** Sustituye el contenido de un elemento, ignorando los hijos vacíos. */
export function rellenar(destino: Element, ...hijos: Hijo[]): void {
  destino.replaceChildren(...hijos.filter((h): h is Node | string => Boolean(h)));
}

/**
 * En las guías, Enter pulsa el botón principal (Siguiente, Empezar...) aunque el
 * foco esté en el texto. Si el foco está en un campo o en otro botón, se respeta.
 */
export function enterPulsaPrincipal(dialogo: HTMLDialogElement): void {
  dialogo.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, button, a, summary')) return;
    const principal = dialogo.querySelector<HTMLButtonElement>('.acciones .boton-principal:not(:disabled), .boton-principal:not(:disabled)');
    if (!principal) return;
    e.preventDefault();
    principal.click();
  });
}

export const reduceMovimiento = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

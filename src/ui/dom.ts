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

export const reduceMovimiento = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

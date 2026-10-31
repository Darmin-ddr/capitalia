import type { Pais } from './types';

/**
 * Validación tolerante de respuestas escritas (modo 4, SPEC 3.3).
 *
 * - Sin tildes, mayúsculas, espacios, guiones ni apóstrofos.
 * - Variantes del país: correctas sin aviso.
 * - Nombres antiguos: aceptados con aviso.
 * - Erratas pequeñas: aceptadas con aviso, con margen según la longitud.
 * - Si lo escrito se parece tanto o más a otra capital, es fallo.
 */

export type TipoRespuesta = 'correcto' | 'antiguo' | 'errata' | 'fallo' | 'vacio';

export interface ResultadoTexto {
  tipo: TipoRespuesta;
  /** Forma del listado que hay que mostrar (la capital "oficial"). */
  formaCorrecta: string;
  /** Si es fallo y coincide o se parece a la capital de otro país, cuál. */
  otroPais?: Pais;
}

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Distancia de edición con intercambio de letras contiguas (Damerau, versión OSA). */
export function distancia(a: string, b: string): number {
  const filas = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: filas }, (_, i) => {
    const fila = new Array<number>(cols).fill(0);
    fila[0] = i;
    return fila;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < cols; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + coste);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Erratas permitidas según la longitud (normalizada) del nombre correcto. */
export function margenErratas(longitud: number): number {
  if (longitud <= 4) return 0;
  if (longitud <= 8) return 1;
  return 2;
}

/**
 * Capitales aceptadas como correctas sin aviso. Si el listado da dos capitales
 * separadas por " / " (Palestina: "Jerusalén Este / Ramala"), vale cualquiera.
 */
export function formasCorrectas(pais: Pais): string[] {
  return [...pais.capital.split(' / '), ...pais.variantes].map((f) => f.trim()).filter(Boolean);
}

function todasLasFormas(pais: Pais): string[] {
  return [...formasCorrectas(pais), ...pais.antiguos];
}

export function validarTexto(entrada: string, objetivo: Pais, todos: readonly Pais[]): ResultadoTexto {
  const formaCorrecta = objetivo.capital;
  const n = normalizar(entrada);
  if (!n) return { tipo: 'vacio', formaCorrecta };

  const correctas = formasCorrectas(objetivo).map(normalizar);
  const antiguas = objetivo.antiguos.map(normalizar);
  if (correctas.includes(n)) return { tipo: 'correcto', formaCorrecta };
  if (antiguas.includes(n)) return { tipo: 'antiguo', formaCorrecta };

  const otros = todos.filter((p) => p.id !== objetivo.id);
  // Coincidencia exacta con otra capital: fallo claro.
  const exactoOtro = otros.find((p) => todasLasFormas(p).some((f) => normalizar(f) === n));
  if (exactoOtro) return { tipo: 'fallo', formaCorrecta, otroPais: exactoOtro };

  // Errata: la forma más cercana del país, si entra en el margen
  // y está estrictamente más cerca que cualquier capital de otro país.
  let mejor: { d: number; antigua: boolean } | null = null;
  for (const [lista, antigua] of [[correctas, false], [antiguas, true]] as const) {
    for (const f of lista) {
      const d = distancia(n, f);
      if (d <= margenErratas(f.length) && (!mejor || d < mejor.d)) mejor = { d, antigua };
    }
  }

  let masCercanoOtro: { d: number; pais: Pais } | null = null;
  for (const p of otros) {
    for (const f of todasLasFormas(p)) {
      const d = distancia(n, normalizar(f));
      if (!masCercanoOtro || d < masCercanoOtro.d) masCercanoOtro = { d, pais: p };
    }
  }

  if (mejor && (!masCercanoOtro || mejor.d < masCercanoOtro.d)) {
    return { tipo: mejor.antigua ? 'antiguo' : 'errata', formaCorrecta };
  }

  const pareceOtro =
    masCercanoOtro && masCercanoOtro.d <= margenErratas(n.length) ? masCercanoOtro.pais : undefined;
  return { tipo: 'fallo', formaCorrecta, otroPais: pareceOtro };
}

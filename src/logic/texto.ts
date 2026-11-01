import type { Pais } from './types';

/**
 * Validación tolerante de respuestas escritas (SPEC 3.3): capitales (modos
 * Escribir y Mapa mudo) y nombres de país (Mapa mudo).
 *
 * - Sin tildes, mayúsculas, espacios, guiones ni apóstrofos.
 * - Variantes: correctas sin aviso.
 * - Nombres antiguos (capital) o avisos (país, p. ej. Holanda): aceptados con aviso.
 * - Erratas pequeñas: aceptadas con aviso, con margen según la longitud.
 * - Si lo escrito se parece tanto o más a otro país o capital, es fallo.
 */

export type TipoRespuesta = 'correcto' | 'antiguo' | 'errata' | 'fallo' | 'vacio';

export interface ResultadoTexto {
  tipo: TipoRespuesta;
  /** Forma del listado que hay que mostrar (la capital o el nombre "oficial"). */
  formaCorrecta: string;
  /** Si es fallo y lo escrito es exactamente lo de otro país, cuál. */
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

/** Nombres de país aceptados sin aviso: el del listado (también sin el paréntesis) y sus variantes. */
export function nombresCorrectos(pais: Pais): string[] {
  const sinParentesis = pais.nombre.replace(/\s*\(.*\)\s*/, '').trim();
  return [...new Set([pais.nombre, sinParentesis, ...(pais.variantesPais ?? [])])].filter(Boolean);
}

interface Formas {
  correctas: (p: Pais) => string[];
  avisos: (p: Pais) => string[];
  principal: (p: Pais) => string;
}

const CAPITAL: Formas = { correctas: formasCorrectas, avisos: (p) => p.antiguos, principal: (p) => p.capital };
const NOMBRE: Formas = { correctas: nombresCorrectos, avisos: (p) => p.avisosPais ?? [], principal: (p) => p.nombre };

function validarFormas(entrada: string, objetivo: Pais, todos: readonly Pais[], formas: Formas): ResultadoTexto {
  const formaCorrecta = formas.principal(objetivo);
  const n = normalizar(entrada);
  if (!n) return { tipo: 'vacio', formaCorrecta };

  const correctas = formas.correctas(objetivo).map(normalizar);
  const avisos = formas.avisos(objetivo).map(normalizar);
  if (correctas.includes(n)) return { tipo: 'correcto', formaCorrecta };
  if (avisos.includes(n)) return { tipo: 'antiguo', formaCorrecta };

  const todasDe = (p: Pais) => [...formas.correctas(p), ...formas.avisos(p)];
  const otros = todos.filter((p) => p.id !== objetivo.id);
  // Coincidencia exacta con otro país: fallo claro.
  const exactoOtro = otros.find((p) => todasDe(p).some((f) => normalizar(f) === n));
  if (exactoOtro) return { tipo: 'fallo', formaCorrecta, otroPais: exactoOtro };

  // Errata: la forma más cercana del país, si entra en el margen
  // y está estrictamente más cerca que cualquier forma de otro país.
  let mejor: { d: number; aviso: boolean } | null = null;
  for (const [lista, aviso] of [[correctas, false], [avisos, true]] as const) {
    for (const f of lista) {
      const d = distancia(n, f);
      if (d <= margenErratas(f.length) && (!mejor || d < mejor.d)) mejor = { d, aviso };
    }
  }

  let masCercanoOtro = Infinity;
  for (const p of otros) for (const f of todasDe(p)) masCercanoOtro = Math.min(masCercanoOtro, distancia(n, normalizar(f)));

  if (mejor && mejor.d < masCercanoOtro) return { tipo: mejor.aviso ? 'antiguo' : 'errata', formaCorrecta };
  return { tipo: 'fallo', formaCorrecta };
}

/** Capital escrita (modos Escribir y Mapa mudo). */
export function validarTexto(entrada: string, objetivo: Pais, todos: readonly Pais[]): ResultadoTexto {
  return validarFormas(entrada, objetivo, todos, CAPITAL);
}

/** Nombre del país escrito (Mapa mudo). "antiguo" significa aceptado con aviso (p. ej. Holanda). */
export function validarPais(entrada: string, objetivo: Pais, todos: readonly Pais[]): ResultadoTexto {
  return validarFormas(entrada, objetivo, todos, NOMBRE);
}

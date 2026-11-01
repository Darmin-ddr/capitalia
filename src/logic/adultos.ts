import { nivelDominio, nivelMapa, type EstadoProgreso } from './progreso';
import type { Pais, Region } from './types';

/* ---------------- PIN ---------------- */

/** El PIN es una cerradura para niños, no seguridad real (SPEC 8): todo es local. */
export function pinValido(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/** Hash del PIN (SHA-256 si el navegador lo permite; si no, un hash sencillo). */
export async function hashPin(pin: string): Promise<string> {
  const texto = `progreso-capitales:${pin}`;
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const datos = await subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return 'sha256:' + [...new Uint8Array(datos)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Sin crypto.subtle (página sin HTTPS): FNV-1a, suficiente para una cerradura de niños.
  let h = 0x811c9dc5;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return 'fnv:' + h.toString(16);
}

export async function comprobarPin(pin: string, hash: string | null): Promise<boolean> {
  return hash !== null && (await hashPin(pin)) === hash;
}

/* ---------------- Estadísticas ---------------- */

export interface DominioRegion {
  region: Region;
  total: number;
  /** Países por nivel: [sin empezar, aprendiendo, en repaso, dominados]. */
  porNivel: [number, number, number, number];
}

export function dominioPorRegion(
  estado: EstadoProgreso,
  regiones: readonly Region[],
  paisesDe: (regionId: string) => readonly Pais[],
): DominioRegion[] {
  return [...regiones]
    .sort((a, b) => (a.continente === b.continente ? a.orden - b.orden : a.continente === 'europa' ? -1 : 1))
    .map((region) => {
      const porNivel: [number, number, number, number] = [0, 0, 0, 0];
      const paises = paisesDe(region.id);
      // Por escalones, como el mapa y la portada de Hoy.
      for (const p of paises) porNivel[nivelMapa(estado, p.id)]++;
      return { region, total: paises.length, porNivel };
    });
}

export interface PaisAtascado {
  pais: Pais;
  fallos: number;
  intentos: number;
}

/** Países que más se atascan: más fallos (en los últimos `dias`), y luego más olvidos FSRS. */
export function paisesAtascados(estado: EstadoProgreso, paises: readonly Pais[], ahora: Date, dias = 30, max = 8): PaisAtascado[] {
  const desde = ahora.getTime() - dias * 86400000;
  const cuenta = new Map<string, { fallos: number; intentos: number }>();
  for (const r of estado.historial) {
    if (new Date(r.t).getTime() < desde) continue;
    const c = cuenta.get(r.pais) ?? { fallos: 0, intentos: 0 };
    c.intentos++;
    if (r.res === 'fallo') c.fallos++;
    cuenta.set(r.pais, c);
  }
  return paises
    .map((pais) => ({ pais, ...(cuenta.get(pais.id) ?? { fallos: 0, intentos: 0 }), olvidos: estado.tarjetas[pais.id]?.lapses ?? 0 }))
    .filter((x) => x.fallos > 0)
    .sort((a, b) => b.fallos - a.fallos || b.olvidos - a.olvidos || a.pais.nombre.localeCompare(b.pais.nombre, 'es'))
    .slice(0, max)
    .map(({ pais, fallos, intentos }) => ({ pais, fallos, intentos }));
}

export interface ActividadDia {
  /** AAAA-MM-DD (hora local) */
  dia: string;
  respuestas: number;
  aciertos: number;
}

function diaLocal(fecha: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${z(fecha.getMonth() + 1)}-${z(fecha.getDate())}`;
}

/** Respuestas por día en los últimos `dias` días (incluido hoy), del más antiguo al más reciente. */
export function actividadReciente(estado: EstadoProgreso, ahora: Date, dias = 14): ActividadDia[] {
  const resultado: ActividadDia[] = [];
  const indice = new Map<string, ActividadDia>();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - i);
    const dia = { dia: diaLocal(d), respuestas: 0, aciertos: 0 };
    resultado.push(dia);
    indice.set(dia.dia, dia);
  }
  for (const r of estado.historial) {
    const d = indice.get(diaLocal(new Date(r.t)));
    if (!d) continue;
    d.respuestas++;
    if (r.res !== 'fallo') d.aciertos++;
  }
  return resultado;
}

/* ---------------- Modo examen ---------------- */

/** Días que faltan para el examen (0 = hoy; negativo = ya pasó). null si no hay fecha. */
export function diasHastaExamen(fechaExamen: string | null, ahora: Date): number | null {
  if (!fechaExamen) return null;
  const [a, m, d] = fechaExamen.split('-').map(Number);
  const examen = new Date(a, m - 1, d).getTime();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  return Math.round((examen - hoy) / 86400000);
}

/**
 * Países de una ronda de examen (SPEC 7): los de la lista de examen,
 * ordenados de más flojo a más sólido (nivel bajo, luego menos estabilidad,
 * luego más olvidos). Repasa sobre todo lo flojo, pero incluye todos.
 */
export function seleccionarExamen(estado: EstadoProgreso, paises: readonly Pais[], tam = 20): string[] {
  const t = estado.tarjetas;
  return [...paises]
    .sort((a, b) => {
      const na = nivelDominio(t[a.id]);
      const nb = nivelDominio(t[b.id]);
      if (na !== nb) return na - nb;
      const sa = t[a.id]?.stability ?? 0;
      const sb = t[b.id]?.stability ?? 0;
      if (sa !== sb) return sa - sb;
      return (t[b.id]?.lapses ?? 0) - (t[a.id]?.lapses ?? 0);
    })
    .slice(0, tam)
    .map((p) => p.id);
}

/** Regiones que contienen algún país de la lista de examen (se desbloquean para poder prepararlo). */
export function regionesConExamen(lista: readonly string[] | null, paises: readonly Pais[]): Set<string> {
  const ids = new Set(lista ?? []);
  const regiones = new Set<string>();
  for (const p of paises) if (ids.has(p.id)) [p.region, ...(p.regionesExtra ?? [])].forEach((r) => regiones.add(r));
  return regiones;
}

/** Estado de una casilla de grupo (región o continente) según los países marcados. */
export type EstadoGrupo = 'todos' | 'ninguno' | 'parcial';

export function estadoGrupo(ids: readonly string[], seleccion: ReadonlySet<string>): EstadoGrupo {
  const marcados = ids.filter((id) => seleccion.has(id)).length;
  if (ids.length > 0 && marcados === ids.length) return 'todos';
  return marcados === 0 ? 'ninguno' : 'parcial';
}

/** Marca o desmarca de golpe todos los países de un grupo. Devuelve la selección nueva. */
export function marcarGrupo(ids: readonly string[], seleccion: ReadonlySet<string>, marcar: boolean): Set<string> {
  const nueva = new Set(seleccion);
  for (const id of ids) {
    if (marcar) nueva.add(id);
    else nueva.delete(id);
  }
  return nueva;
}

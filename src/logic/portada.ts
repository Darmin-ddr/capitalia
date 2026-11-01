import type { EstadoProgreso } from './progreso';
import type { Continente, Pais, Region } from './types';

/**
 * Cifras de la portada de Hoy: lo aprendido en total y por continente, lo
 * aprendido en los últimos 7 días y cómo va la lista de examen. Sin rachas:
 * se cuentan logros, no días seguidos (CLAUDE.md). Lógica pura.
 */
export interface ResumenPortada {
  aprendidos: number;
  total: number;
  porContinente: { continente: Continente; aprendidos: number; total: number }[];
  /** Países que han quedado aprendidos en los últimos 7 días. */
  aprendidosSemana: number;
  /** Lista de examen del panel: cuántos de sus países están aprendidos (null si no hay lista). */
  examen: { aprendidos: number; total: number } | null;
}

const SEMANA_MS = 7 * 864e5;

export function resumenPortada(estado: EstadoProgreso, activos: readonly Pais[], continentes: readonly Continente[], ahora: Date): ResumenPortada {
  const aprendido = (p: Pais) => estado.aprendizaje[p.id]?.aprendido ?? false;
  const porContinente = continentes.map((c) => {
    const ps = activos.filter((p) => p.continentes.includes(c));
    return { continente: c, aprendidos: ps.filter(aprendido).length, total: ps.length };
  });
  const aprendidosSemana = activos.filter((p) => {
    const f = estado.aprendizaje[p.id]?.aprendidoEl;
    return f !== undefined && ahora.getTime() - new Date(f).getTime() <= SEMANA_MS;
  }).length;
  const lista = estado.ajustes.listaExamen;
  const enLista = lista?.length ? activos.filter((p) => lista.includes(p.id)) : null;
  return {
    aprendidos: activos.filter(aprendido).length,
    total: activos.length,
    porContinente,
    aprendidosSemana,
    examen: enLista ? { aprendidos: enLista.filter(aprendido).length, total: enLista.length } : null,
  };
}

/**
 * Orden del curso (SPEC 7): los continentes en el orden en que aparecen en los
 * datos (Europa y luego Asia) y, dentro de cada uno, sus regiones en orden.
 * Los continentes que se añadan después entran solos, al final.
 */
export function ordenCurso(regiones: readonly Region[]): Region[] {
  const continentes = [...new Set(regiones.map((r) => r.continente))];
  return [...regiones].sort((a, b) => continentes.indexOf(a.continente) - continentes.indexOf(b.continente) || a.orden - b.orden);
}

/** Continentes en el orden del curso. */
export function continentesCurso(regiones: readonly Region[]): Continente[] {
  return [...new Set(ordenCurso(regiones).map((r) => r.continente))];
}

/** Primer continente del curso con países sin aprender (el que toca); si todo está aprendido, el primero. */
export function continenteQueToca(estado: EstadoProgreso, activos: readonly Pais[], regiones: readonly Region[]): Continente {
  const orden = continentesCurso(regiones);
  return orden.find((c) => activos.some((p) => p.continentes.includes(c) && !estado.aprendizaje[p.id]?.aprendido)) ?? orden[0];
}

/**
 * Países con los que trabaja Hoy: todos, o solo los del continente elegido
 * ("Qué estudia Hoy"). El resto queda en pausa: ni repasos ni nuevos.
 * Rusia y Turquía, que son de los dos continentes, entran en ambos casos.
 */
export function paisesDeHoy(activos: readonly Pais[], foco: Continente | null): Pais[] {
  return foco ? activos.filter((p) => p.continentes.includes(foco)) : [...activos];
}

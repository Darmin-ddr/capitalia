import { CONFIG, type ModoId } from './config';
import { barajar, type Rng } from './rng';
import { aprendido, empezado, escalonDe, type EstadoProgreso } from './progreso';
import type { Pais } from './types';

/**
 * Sesión de Hoy (SPEC 4.1 y 7): repasos de lo aprendido, países en
 * aprendizaje y países nuevos intercalados, como Anki. Lógica pura.
 */

export type TipoItem = 'repaso' | 'aprendiendo' | 'nuevo';

export interface ItemHoy {
  paisId: string;
  tipo: TipoItem;
}

function diaLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
}

/** Repasos pendientes: países aprendidos cuya tarjeta FSRS ya ha vencido. */
export function repasosPendientes(estado: EstadoProgreso, paises: readonly Pais[], ahora: Date): Pais[] {
  return paises.filter((p) => aprendido(estado, p.id) && estado.tarjetas[p.id] && new Date(estado.tarjetas[p.id].due) <= ahora);
}

/**
 * Nuevos que tocan hoy (SPEC 7): entre el mínimo y el máximo según el
 * porcentaje de aciertos de las últimas respuestas; el mínimo si hay muchos
 * repasos pendientes. Se descuentan los países ya empezados hoy.
 */
export function nuevosDeHoy(estado: EstadoProgreso, pendientes: number, ahora: Date, config = CONFIG): number {
  const maximo = Math.max(config.nuevosMinimo, Math.min(estado.ajustes.maxNuevos ?? config.nuevosMaximo, 20));
  let objetivo: number;
  if (pendientes > config.pendientesMuchos) objetivo = config.nuevosMinimo;
  else {
    const recientes = estado.historial.filter((r) => !r.examen).slice(-40);
    if (recientes.length < 10) objetivo = Math.round((config.nuevosMinimo + maximo) / 2);
    else {
      const tasa = recientes.filter((r) => r.res !== 'fallo').length / recientes.length;
      objetivo = tasa >= 0.9 ? maximo : tasa >= 0.8 ? Math.round(config.nuevosMinimo + (maximo - config.nuevosMinimo) * 0.6) : tasa >= 0.7 ? config.nuevosMinimo + 1 : config.nuevosMinimo;
    }
  }
  objetivo = Math.min(maximo, Math.max(config.nuevosMinimo, objetivo));
  // Países cuya primera respuesta fue hoy: ya cuentan como nuevos del día.
  const hoy = diaLocal(ahora);
  const primera = new Map<string, string>();
  for (const r of estado.historial) if (!primera.has(r.pais)) primera.set(r.pais, diaLocal(new Date(r.t)));
  const yaHoy = [...primera.values()].filter((d) => d === hoy).length;
  return Math.max(0, objetivo - yaHoy);
}

export interface ParametrosHoy {
  estado: EstadoProgreso;
  /** Países disponibles: activos de las regiones abiertas (de los dos continentes). */
  disponibles: readonly Pais[];
  /** Orden preferido de regiones para sacar nuevos (la actual primero). */
  ordenRegiones: readonly string[];
  /** Países a priorizar (examen configurado, fallados en un examen). */
  prioridad: ReadonlySet<string>;
  nuevos: number;
  ahora: Date;
  rng: Rng;
  tam?: number;
}

/**
 * Compone la sesión: unos repasos para entrar en calor y, después, los
 * nuevos repartidos entre el resto; cada nuevo sale dos veces, separado.
 * Devuelve [] si hoy no queda nada que hacer.
 */
export function crearSesionHoy(p: ParametrosHoy): ItemHoy[] {
  const tam = p.tam ?? CONFIG.preguntasSesion;
  const t = p.estado.tarjetas;
  const prio = (x: Pais) => (p.prioridad.has(x.id) ? 0 : 1);

  const repasos = repasosPendientes(p.estado, p.disponibles, p.ahora)
    .sort((a, b) => prio(a) - prio(b) || new Date(t[a.id].due).getTime() - new Date(t[b.id].due).getTime())
    .map((x): ItemHoy => ({ paisId: x.id, tipo: 'repaso' }));
  const aprendiendo = barajar(
    p.disponibles.filter((x) => empezado(p.estado, x.id) && !aprendido(p.estado, x.id)),
    p.rng,
  )
    .sort((a, b) => prio(a) - prio(b))
    .map((x): ItemHoy => ({ paisId: x.id, tipo: 'aprendiendo' }));

  const ordenRegion = (x: Pais) => {
    const i = p.ordenRegiones.indexOf(x.region);
    return i === -1 ? p.ordenRegiones.length : i;
  };
  const nuevos = barajar(
    p.disponibles.filter((x) => !empezado(p.estado, x.id)),
    p.rng,
  )
    .sort((a, b) => prio(a) - prio(b) || ordenRegion(a) - ordenRegion(b))
    .slice(0, Math.max(0, Math.min(p.nuevos, Math.floor(tam / 2))))
    .map((x): ItemHoy => ({ paisId: x.id, tipo: 'nuevo' }));

  const base = [...repasos, ...aprendiendo].slice(0, Math.max(0, tam - nuevos.length * 2));
  if (!base.length && !nuevos.length) return [];

  // Intercalar: 3 de calentamiento, luego un nuevo cada `cada` elementos;
  // la segunda aparición de cada nuevo, 3 elementos después.
  const salida: ItemHoy[] = base.slice(0, 3);
  const resto = base.slice(3);
  const cada = nuevos.length ? Math.max(1, Math.floor(resto.length / nuevos.length)) : 0;
  const segundas: { item: ItemHoy; faltan: number }[] = [];
  const meter = (item: ItemHoy) => {
    salida.push(item);
    for (const s of segundas) s.faltan--;
    while (segundas.length && segundas[0].faltan <= 0) salida.push(segundas.shift()!.item);
  };
  for (const n of nuevos) {
    for (let i = 0; i < cada && resto.length; i++) meter(resto.shift()!);
    meter(n);
    segundas.push({ item: { ...n }, faltan: 3 });
  }
  while (resto.length) meter(resto.shift()!);
  for (const s of segundas) salida.push(s.item);
  return salida;
}

/** Repaso adelantado (cuando Hoy ya está hecho): aprendidos que vencen antes. */
export function repasoAdelantado(estado: EstadoProgreso, disponibles: readonly Pais[], n = 10): ItemHoy[] {
  return disponibles
    .filter((x) => aprendido(estado, x.id) && estado.tarjetas[x.id])
    .sort((a, b) => new Date(estado.tarjetas[a.id].due).getTime() - new Date(estado.tarjetas[b.id].due).getTime())
    .slice(0, n)
    .map((x) => ({ paisId: x.id, tipo: 'repaso' }));
}

/**
 * Tipo de pregunta en Hoy: los países en aprendizaje, el de su escalón
 * (Colocar se pregunta como Al revés, que es su versión suelta); los
 * aprendidos, variado: Mapa mudo, Escribir o Al revés (más Mapa mudo
 * cuanto más estable).
 */
export function modoHoy(estado: EstadoProgreso, paisId: string, rng: Rng): ModoId {
  const escalon = escalonDe(estado, paisId);
  if (escalon) return escalon === 'colocar' ? 'alreves' : escalon;
  const estable = (estado.tarjetas[paisId]?.stability ?? 0) >= CONFIG.estabilidadDominado;
  const r = rng();
  if (estable) return r < 0.5 ? 'mapamudo' : r < 0.75 ? 'escribir' : 'alreves';
  return r < 0.3 ? 'mapamudo' : r < 0.7 ? 'escribir' : 'alreves';
}

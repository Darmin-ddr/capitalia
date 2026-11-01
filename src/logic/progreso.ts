import { createEmptyCard, fsrs, generatorParameters, State, type Card } from 'ts-fsrs';
import { CONFIG, type ModoId } from './config';
import { deducirNota } from './nota';
import type { Resultado } from './sesion';
import type { Continente, Pais, Region } from './types';

/** Tarjeta FSRS en formato guardable (fechas como texto ISO). */
export interface TarjetaGuardada {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: number;
  last_review?: string;
}

export interface RespuestaGuardada {
  /** Fecha ISO */
  t: string;
  pais: string;
  modo: ModoId;
  res: Resultado;
  ms: number;
  nota: number;
  examen?: boolean;
}

export interface Ajustes {
  /** Países opcionales activados (Kosovo). */
  opcionalesActivados: string[];
  /** Filtro "solo examen": null = todos. */
  listaExamen: string[] | null;
  /** Fecha del examen (ISO, solo día) si hay uno configurado. */
  fechaExamen: string | null;
  trucosDesactivados: string[];
  /** Trucos predefinidos editados por el adulto (por país). */
  trucosEditados: Record<string, string>;
  /** Hash del PIN del panel de adultos. */
  pinHash: string | null;
  /** El adulto ha abierto todas las regiones (sin esperar al desbloqueo progresivo). */
  todasDesbloqueadas: boolean;
  /** Máximo de países nuevos por día en Hoy (se autorregula hasta este valor). */
  maxNuevos: number;
  /** Continente al que se limita Hoy (el resto queda en pausa); null = todo. */
  focoHoy: Continente | null;
}

/**
 * Escalones de aprendizaje (SPEC 4.3): Elegir → Colocar → Escribir → Mapa mudo.
 * Superado el último, el país queda "aprendido" y pasa al repaso de Hoy.
 */
export const ESCALONES = ['elegir', 'colocar', 'escribir', 'mapamudo'] as const;
export type Escalon = (typeof ESCALONES)[number];

export interface EstadoAprendizaje {
  /** Índice del escalón actual en ESCALONES. */
  escalon: number;
  /** Aciertos en el escalón actual (se reinicia con un fallo). */
  aciertos: number;
  aprendido: boolean;
  /** Cuándo quedó aprendido (ISO). Los convertidos desde la v1 no la tienen. */
  aprendidoEl?: string;
}

export interface EstadoProgreso {
  version: 1;
  tarjetas: Record<string, TarjetaGuardada>;
  historial: RespuestaGuardada[];
  /** Trucos inventados por el alumno (sustituyen al predefinido). */
  trucosPropios: Record<string, string>;
  /** Regiones cuyo dominio ya se ha celebrado (para no repetir el confeti). */
  regionesCelebradas: string[];
  /** Última región estudiada (para volver a ella al abrir la app). */
  ultimaRegion: string | null;
  /** La guía se ha visto (para no abrirla sola cada vez). */
  guiaVista: boolean;
  /** Se ha pasado la bienvenida del primer arranque ("¿quién eres?"). */
  bienvenidaVista: boolean;
  /** Escalón de aprendizaje de cada país empezado (los que no aparecen, sin empezar). */
  aprendizaje: Record<string, EstadoAprendizaje>;
  /** Países a priorizar en Hoy (p. ej. los fallados en un examen). */
  prioridad: string[];
  ajustes: Ajustes;
}

export function estadoVacio(): EstadoProgreso {
  return {
    version: 1,
    tarjetas: {},
    historial: [],
    trucosPropios: {},
    regionesCelebradas: [],
    ultimaRegion: null,
    guiaVista: false,
    bienvenidaVista: false,
    aprendizaje: {},
    prioridad: [],
    ajustes: {
      opcionalesActivados: [],
      listaExamen: null,
      fechaExamen: null,
      trucosDesactivados: [],
      trucosEditados: {},
      pinHash: null,
      todasDesbloqueadas: false,
      maxNuevos: CONFIG.nuevosMaximo,
      focoHoy: null,
    },
  };
}

const planificador = fsrs(generatorParameters());

export function aTarjeta(t: TarjetaGuardada): Card {
  return {
    ...t,
    due: new Date(t.due),
    last_review: t.last_review ? new Date(t.last_review) : undefined,
    state: t.state as State,
  };
}

export function aGuardada(c: Card): TarjetaGuardada {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    learning_steps: c.learning_steps,
    state: c.state,
    last_review: c.last_review?.toISOString(),
  };
}

export interface OpcionesRegistro {
  /** Respuesta del examen: cuenta para FSRS como cualquier otra (SPEC 4.4), pero se marca en el historial. */
  examen?: boolean;
}

/**
 * Registra una respuesta: actualiza la tarjeta FSRS del país (una por país,
 * compartida por todos los modos) y el historial. Modifica `estado`.
 */
export function registrarRespuesta(
  estado: EstadoProgreso,
  paisId: string,
  modo: ModoId,
  resultado: Resultado,
  tiempoMs: number,
  ahora: Date,
  opciones: OpcionesRegistro = {},
): void {
  const nota = deducirNota({ modo, resultado, tiempoMs });
  const previa = estado.tarjetas[paisId];
  const tarjeta = previa ? aTarjeta(previa) : createEmptyCard(ahora);
  estado.tarjetas[paisId] = aGuardada(planificador.next(tarjeta, ahora, nota).card);
  estado.historial.push({
    t: ahora.toISOString(),
    pais: paisId,
    modo,
    res: resultado,
    ms: Math.round(tiempoMs),
    nota,
    ...(opciones.examen ? { examen: true } : {}),
  });
  if (estado.historial.length > CONFIG.maxHistorial) {
    estado.historial.splice(0, estado.historial.length - CONFIG.maxHistorial);
  }
}

/**
 * Nivel de dominio de un país:
 * 0 sin empezar · 1 aprendiendo (o reaprendiendo tras un fallo) ·
 * 2 en repaso · 3 dominado (estabilidad de varios días).
 */
export type Nivel = 0 | 1 | 2 | 3;

export function nivelDominio(t: TarjetaGuardada | undefined, config = CONFIG): Nivel {
  if (!t || t.state === State.New || t.reps === 0) return 0;
  if (t.state === State.Learning || t.state === State.Relearning) return 1;
  return t.stability >= config.estabilidadDominado ? 3 : 2;
}

/**
 * Modo que le toca a un país según su dominio (SPEC 4): primero reconocer
 * (elegir entre opciones), luego situar (al revés) y por último recordar
 * sin ayuda (escribir). El modo 3 (colocar) va por tandas y se elige a mano.
 */
export function modoSegunDominio(t: TarjetaGuardada | undefined): ModoId {
  const nivel = nivelDominio(t);
  if (nivel <= 1) return 'elegir';
  if (nivel === 2) return 'alreves';
  return 'escribir';
}

/**
 * Nivel con el que se colorea un país en el mapa (el mapa es el marcador, SPEC 10),
 * según los escalones: 0 sin empezar, 1 en Elegir o Colocar, 2 en Escribir o
 * Mapa mudo, 3 aprendido.
 */
export function nivelMapa(estado: EstadoProgreso, paisId: string): Nivel {
  const a = estado.aprendizaje[paisId];
  if (!a) return 0;
  if (a.aprendido) return 3;
  return a.escalon >= 2 ? 2 : 1;
}

export function nivelesDe(estado: EstadoProgreso, paises: readonly Pais[]): Map<string, Nivel> {
  return new Map(paises.map((p) => [p.id, nivelMapa(estado, p.id)]));
}

/* ---------------- Escalones de aprendizaje (SPEC 4.3) ---------------- */

/** Escalón actual de un país, o null si está aprendido. Sin empezar = Elegir. */
export function escalonDe(estado: EstadoProgreso, paisId: string): Escalon | null {
  const a = estado.aprendizaje[paisId];
  if (!a) return 'elegir';
  return a.aprendido ? null : ESCALONES[a.escalon];
}

export function aprendido(estado: EstadoProgreso, paisId: string): boolean {
  return estado.aprendizaje[paisId]?.aprendido ?? false;
}

export function empezado(estado: EstadoProgreso, paisId: string): boolean {
  return paisId in estado.aprendizaje;
}

/** ¿Esta respuesta, en este modo, cuenta para el escalón actual? (Colocar admite también Al revés.) */
export function cuentaParaEscalon(escalon: Escalon, modo: ModoId): boolean {
  return modo === escalon || (escalon === 'colocar' && modo === 'alreves');
}

export interface CambioEscalon {
  subio: boolean;
  aprendido: boolean;
}

/**
 * Registra una respuesta en el escalón del país: un acierto suma (con los
 * aciertos necesarios, sube de escalón o queda aprendido); un fallo reinicia
 * el contador sin bajar de escalón; un acierto con aviso (errata) no cuenta.
 * Solo cuentan las respuestas en el modo del escalón. Modifica `estado`.
 */
export function registrarEscalon(
  estado: EstadoProgreso,
  paisId: string,
  modo: ModoId,
  resultado: Resultado,
  config = CONFIG,
  ahora = new Date(),
): CambioEscalon {
  const sin = { subio: false, aprendido: false };
  const a = estado.aprendizaje[paisId] ?? { escalon: 0, aciertos: 0, aprendido: false };
  if (a.aprendido || !cuentaParaEscalon(ESCALONES[a.escalon], modo)) return sin;
  estado.aprendizaje[paisId] = a;
  if (resultado === 'fallo') {
    a.aciertos = 0;
    return sin;
  }
  if (resultado !== 'acierto') return sin;
  a.aciertos++;
  if (a.aciertos < config.aciertosPorEscalon) return sin;
  a.aciertos = 0;
  if (a.escalon >= ESCALONES.length - 1) {
    a.aprendido = true;
    a.aprendidoEl = ahora.toISOString();
    return { subio: true, aprendido: true };
  }
  a.escalon++;
  return { subio: true, aprendido: false };
}

/**
 * Convierte el progreso de la v1 (solo FSRS) a escalones: dominado → aprendido;
 * en repaso → Escribir; aprendiendo → Colocar; sin empezar → nada.
 */
export function migrarAprendizaje(tarjetas: Record<string, TarjetaGuardada>): Record<string, EstadoAprendizaje> {
  const resultado: Record<string, EstadoAprendizaje> = {};
  for (const [id, t] of Object.entries(tarjetas)) {
    const nivel = nivelDominio(t);
    if (nivel === 3) resultado[id] = { escalon: ESCALONES.length - 1, aciertos: 0, aprendido: true };
    else if (nivel === 2) resultado[id] = { escalon: 2, aciertos: 0, aprendido: false };
    else if (nivel === 1) resultado[id] = { escalon: 1, aciertos: 0, aprendido: false };
  }
  return resultado;
}

/**
 * Una región está superada (abre la siguiente) cuando todos sus países han
 * llegado al escalón Escribir (o están aprendidos), o están en repaso según FSRS.
 */
export function regionSuperada(estado: EstadoProgreso, paises: readonly Pais[]): boolean {
  return (
    paises.length > 0 &&
    paises.every((p) => {
      const a = estado.aprendizaje[p.id];
      return (a && (a.aprendido || a.escalon >= 2)) || nivelDominio(estado.tarjetas[p.id]) >= 2;
    })
  );
}

/** Una región está dominada cuando todos sus países lo están. */
export function regionDominada(estado: EstadoProgreso, paises: readonly Pais[]): boolean {
  return paises.length > 0 && paises.every((p) => nivelDominio(estado.tarjetas[p.id]) === 3);
}

/**
 * Regiones desbloqueadas de un continente: la primera siempre; cada una de
 * las siguientes, cuando la anterior está superada o cuando ya tiene algún
 * país empezado (Hoy saca los nuevos por orden del curso sin mirar si la
 * región está abierta, y eso también la abre). Siempre se puede volver a las anteriores.
 */
export function regionesDesbloqueadas(
  estado: EstadoProgreso,
  regiones: readonly Region[],
  paisesDe: (regionId: string) => readonly Pais[],
): Set<string> {
  const ordenadas = [...regiones].sort((a, b) => a.orden - b.orden);
  const abiertas = new Set<string>();
  for (let i = 0; i < ordenadas.length; i++) {
    const empezada = paisesDe(ordenadas[i].id).some((p) => empezado(estado, p.id));
    if (i === 0 || empezada || regionSuperada(estado, paisesDe(ordenadas[i - 1].id))) abiertas.add(ordenadas[i].id);
  }
  return abiertas;
}

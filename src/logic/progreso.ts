import { createEmptyCard, fsrs, generatorParameters, State, type Card } from 'ts-fsrs';
import { CONFIG, type ModoId } from './config';
import { deducirNota } from './nota';
import type { Resultado } from './sesion';
import type { Pais, Region } from './types';

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
    ajustes: {
      opcionalesActivados: [],
      listaExamen: null,
      fechaExamen: null,
      trucosDesactivados: [],
      trucosEditados: {},
      pinHash: null,
      todasDesbloqueadas: false,
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
  /** Modo examen: los fallos no tocan la planificación FSRS (SPEC 7). */
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
  const tocarFsrs = !(opciones.examen && resultado === 'fallo');
  if (tocarFsrs) {
    const previa = estado.tarjetas[paisId];
    const tarjeta = previa ? aTarjeta(previa) : createEmptyCard(ahora);
    estado.tarjetas[paisId] = aGuardada(planificador.next(tarjeta, ahora, nota).card);
  }
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

export function nivelesDe(estado: EstadoProgreso, paises: readonly Pais[]): Map<string, Nivel> {
  return new Map(paises.map((p) => [p.id, nivelDominio(estado.tarjetas[p.id])]));
}

/** Una región está superada (abre la siguiente) cuando todos sus países están al menos en repaso. */
export function regionSuperada(estado: EstadoProgreso, paises: readonly Pais[]): boolean {
  return paises.length > 0 && paises.every((p) => nivelDominio(estado.tarjetas[p.id]) >= 2);
}

/** Una región está dominada cuando todos sus países lo están. */
export function regionDominada(estado: EstadoProgreso, paises: readonly Pais[]): boolean {
  return paises.length > 0 && paises.every((p) => nivelDominio(estado.tarjetas[p.id]) === 3);
}

/**
 * Regiones desbloqueadas de un continente: la primera siempre; cada una de
 * las siguientes, cuando la anterior está superada. Siempre se puede volver
 * a las anteriores.
 */
export function regionesDesbloqueadas(
  estado: EstadoProgreso,
  regiones: readonly Region[],
  paisesDe: (regionId: string) => readonly Pais[],
): Set<string> {
  const ordenadas = [...regiones].sort((a, b) => a.orden - b.orden);
  const abiertas = new Set<string>();
  for (let i = 0; i < ordenadas.length; i++) {
    if (i === 0 || regionSuperada(estado, paisesDe(ordenadas[i - 1].id))) abiertas.add(ordenadas[i].id);
    else break;
  }
  return abiertas;
}

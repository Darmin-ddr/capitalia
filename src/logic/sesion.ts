import { barajar, type Rng } from './rng';

export interface ResultadoRespuesta {
  /** Acierto en un país que se había fallado antes en esta ronda (momento de celebrar). */
  recuperado: boolean;
  /** La ronda ha terminado: todos los países se han acertado una vez. */
  terminada: boolean;
}

export interface ResumenRonda {
  total: number;
  aLaPrimera: number;
  fallos: number;
}

/**
 * Cola de una ronda. Cada país sale hasta que se acierta una vez.
 * Lo fallado vuelve a salir unas preguntas después (no inmediatamente, si
 * quedan otros países), para que el alumno tenga otra oportunidad pronto.
 *
 * Versión mínima del hito 1: solo en memoria y contando preguntas, no minutos.
 * La cola completa con FSRS llega en el hito 3.
 */
export class ColaRonda {
  private cola: string[];
  private fallados = new Set<string>();
  private readonly total: number;
  private fallos = 0;

  constructor(
    ids: readonly string[],
    rng: Rng,
    /** Cuántas preguntas después vuelve a salir un fallo. */
    private readonly huecoTrasFallo = 3,
  ) {
    this.cola = barajar(ids, rng);
    this.total = this.cola.length;
  }

  /** País de la pregunta actual, o null si la ronda ha terminado. */
  actual(): string | null {
    return this.cola[0] ?? null;
  }

  /** Países que faltan por acertar (incluido el actual). */
  pendientes(): number {
    return this.cola.length;
  }

  responder(acierto: boolean): ResultadoRespuesta {
    const id = this.cola.shift();
    if (id === undefined) throw new Error('La ronda ya ha terminado');

    if (acierto) {
      return { recuperado: this.fallados.has(id), terminada: this.cola.length === 0 };
    }

    this.fallos++;
    this.fallados.add(id);
    const posicion = Math.min(this.huecoTrasFallo, this.cola.length);
    this.cola.splice(posicion, 0, id);
    return { recuperado: false, terminada: false };
  }

  resumen(): ResumenRonda {
    return { total: this.total, aLaPrimera: this.total - this.fallados.size, fallos: this.fallos };
  }
}

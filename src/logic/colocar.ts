import { barajar, type Rng } from './rng';
import type { ResumenRonda } from './sesion';

export interface ResultadoColocar {
  acierto: boolean;
  /** Acierto de una capital que se había colocado mal antes en esta ronda. */
  recuperado: boolean;
  /** Se ha vaciado la tanda (y, si quedan, ya hay otra preparada). */
  tandaTerminada: boolean;
  rondaTerminada: boolean;
}

/**
 * Ronda del modo 3 ("pool de capitales"): tandas de capitales que hay que
 * colocar en su país. Una capital mal colocada sale de la tanda y vuelve en
 * una tanda posterior (SPEC 4). Los ids son los de los países: la capital
 * del país X se coloca bien si se toca el país X.
 */
export class RondaColocar {
  private pendientes: string[];
  private tandaActual: string[] = [];
  private fallados = new Set<string>();
  private readonly total: number;
  private fallos = 0;
  private numTanda = 0;

  constructor(
    ids: readonly string[],
    rng: Rng,
    private readonly tamTanda = 5,
  ) {
    this.pendientes = barajar(ids, rng);
    this.total = ids.length;
    this.nuevaTanda();
  }

  /** Capitales (ids de país) de la tanda en curso, en orden de presentación. */
  tanda(): readonly string[] {
    return this.tandaActual;
  }

  /** Número de la tanda en curso (empieza en 1). */
  numeroTanda(): number {
    return this.numTanda;
  }

  terminada(): boolean {
    return this.tandaActual.length === 0 && this.pendientes.length === 0;
  }

  /** Colocar la capital del país `capitalDe` sobre el país `paisTocado`. */
  colocar(capitalDe: string, paisTocado: string): ResultadoColocar {
    const i = this.tandaActual.indexOf(capitalDe);
    if (i === -1) throw new Error(`La capital de ${capitalDe} no está en la tanda`);
    this.tandaActual.splice(i, 1);

    const acierto = capitalDe === paisTocado;
    const recuperado = acierto && this.fallados.has(capitalDe);
    if (!acierto) {
      this.fallos++;
      this.fallados.add(capitalDe);
      this.pendientes.push(capitalDe);
    }

    const tandaTerminada = this.tandaActual.length === 0;
    if (tandaTerminada) this.nuevaTanda();
    return { acierto, recuperado, tandaTerminada, rondaTerminada: this.terminada() };
  }

  resumen(): ResumenRonda {
    return { total: this.total, aLaPrimera: this.total - this.fallados.size, fallos: this.fallos };
  }

  private nuevaTanda(): void {
    if (this.pendientes.length === 0) return;
    this.tandaActual = this.pendientes.splice(0, this.tamTanda);
    this.numTanda++;
  }
}

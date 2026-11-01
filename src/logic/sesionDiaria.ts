import { CONFIG } from './config';
import { barajar, type Rng } from './rng';
import type { EstadoProgreso } from './progreso';
import type { Pais } from './types';

export interface ParametrosSesion {
  estado: EstadoProgreso;
  /** Región que se está estudiando: de aquí salen las nuevas y el relleno. */
  region: readonly Pais[];
  /** Países de todas las regiones desbloqueadas (sus vencidas también entran). */
  desbloqueados: readonly Pais[];
  ahora: Date;
  rng: Rng;
  tam?: number;
  maxNuevas?: number;
}

/**
 * Países de una sesión normal (SPEC 7), en este orden:
 * 1. Vencidos (de cualquier región desbloqueada), los más atrasados primero.
 * 2. Unos pocos nuevos de la región actual.
 * 3. Si aún hay sitio, repaso adelantado de la región actual (los que vencen
 *    antes primero), para que siempre haya algo que practicar.
 */
export function crearSesion(p: ParametrosSesion): string[] {
  const tam = p.tam ?? CONFIG.preguntasSesion;
  const maxNuevas = p.maxNuevas ?? CONFIG.nuevosMinimo;
  const t = p.estado.tarjetas;
  const ahora = p.ahora.getTime();
  const elegidos: string[] = [];
  const meter = (id: string) => {
    if (elegidos.length < tam && !elegidos.includes(id)) elegidos.push(id);
  };

  const vencidos = p.desbloqueados
    .filter((x) => t[x.id] && t[x.id].reps > 0 && new Date(t[x.id].due).getTime() <= ahora)
    .sort((a, b) => new Date(t[a.id].due).getTime() - new Date(t[b.id].due).getTime());
  vencidos.forEach((x) => meter(x.id));

  const nuevos = barajar(
    p.region.filter((x) => !t[x.id] || t[x.id].reps === 0),
    p.rng,
  ).slice(0, maxNuevas);
  nuevos.forEach((x) => meter(x.id));

  const adelantados = p.region
    .filter((x) => t[x.id] && t[x.id].reps > 0)
    .sort((a, b) => new Date(t[a.id].due).getTime() - new Date(t[b.id].due).getTime());
  adelantados.forEach((x) => meter(x.id));

  return elegidos;
}

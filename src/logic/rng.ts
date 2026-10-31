/** Generador de números aleatorios en [0, 1). Se inyecta para poder testear. */
export type Rng = () => number;

/** Generador determinista (mulberry32) para tests. */
export function rngConSemilla(semilla: number): Rng {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Devuelve una copia barajada (Fisher-Yates). */
export function barajar<T>(lista: readonly T[], rng: Rng): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

import { estadoVacio, type EstadoProgreso } from './progreso';

/** Lo mínimo que necesitamos de localStorage (inyectable para tests). */
export interface AlmacenTexto {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

/** Clave genérica, sin el nombre de la app (SPEC: el nombre puede cambiar). */
export const CLAVE = 'progreso-capitales';

/**
 * Comprueba que un objeto tiene la forma de un estado guardado y rellena lo
 * que falte con valores por defecto. Devuelve null si no es aprovechable.
 */
export function validarEstado(datos: unknown): EstadoProgreso | null {
  if (!datos || typeof datos !== 'object') return null;
  const d = datos as Partial<EstadoProgreso>;
  if (d.version !== 1) return null;
  if (!d.tarjetas || typeof d.tarjetas !== 'object') return null;
  const base = estadoVacio();
  return {
    version: 1,
    tarjetas: d.tarjetas,
    historial: Array.isArray(d.historial) ? d.historial : [],
    trucosPropios: d.trucosPropios && typeof d.trucosPropios === 'object' ? d.trucosPropios : {},
    regionesCelebradas: Array.isArray(d.regionesCelebradas) ? d.regionesCelebradas : [],
    ultimaRegion: typeof d.ultimaRegion === 'string' ? d.ultimaRegion : null,
    guiaVista: d.guiaVista === true,
    ajustes: { ...base.ajustes, ...(d.ajustes ?? {}) },
  };
}

/**
 * Guarda el progreso en el navegador. Si el almacenamiento no está
 * disponible o falla, la app sigue funcionando en memoria (`disponible`
 * pasa a false para poder avisar).
 */
export class Almacen {
  disponible: boolean;

  constructor(
    private readonly backend: AlmacenTexto | null,
    private readonly clave = CLAVE,
  ) {
    this.disponible = backend !== null;
  }

  cargar(): EstadoProgreso {
    if (!this.backend) return estadoVacio();
    let texto: string | null;
    try {
      texto = this.backend.getItem(this.clave);
    } catch {
      this.disponible = false;
      return estadoVacio();
    }
    if (!texto) return estadoVacio();
    try {
      const estado = validarEstado(JSON.parse(texto));
      if (estado) return estado;
    } catch {
      /* JSON roto: se trata como no válido */
    }
    // No se entiende lo guardado: se aparta una copia en vez de perderla.
    try {
      this.backend.setItem(`${this.clave}-ilegible`, texto);
    } catch {
      /* sin sitio: no se puede hacer más */
    }
    return estadoVacio();
  }

  guardar(estado: EstadoProgreso): boolean {
    if (!this.backend) return false;
    try {
      this.backend.setItem(this.clave, JSON.stringify(estado));
      this.disponible = true;
      return true;
    } catch {
      this.disponible = false;
      return false;
    }
  }

  borrar(): void {
    try {
      this.backend?.removeItem(this.clave);
    } catch {
      /* nada */
    }
  }
}

/** localStorage si existe y responde; null si el navegador lo bloquea. */
export function almacenDelNavegador(): AlmacenTexto | null {
  try {
    const ls = window.localStorage;
    const prueba = '__prueba__';
    ls.setItem(prueba, '1');
    ls.removeItem(prueba);
    return ls;
  } catch {
    return null;
  }
}

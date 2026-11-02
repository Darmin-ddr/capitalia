import { CLAVE, type AlmacenTexto } from './almacen';

/**
 * Perfiles de alumno (varios alumnos en el mismo dispositivo). Todo local: un
 * nombre y una imagen (inicial o icono, sin fotos). Cada alumno tiene su
 * progreso guardado aparte; el PIN del panel de adultos es común a la casa.
 * Lógica pura (el almacenamiento se inyecta).
 */

export interface ImagenPerfil {
  /** Inicial del nombre o uno de los iconos de ICONOS_PERFIL. */
  tipo: 'inicial' | 'icono';
  icono?: string;
  /** Uno de COLORES_PERFIL. */
  color: string;
}

export interface Perfil {
  id: string;
  nombre: string;
  imagen: ImagenPerfil;
}

export interface IndicePerfiles {
  version: 1;
  perfiles: Perfil[];
  /** Último alumno que estudió (el que se carga si solo hay uno o al recargar). */
  ultimo: string;
  /** PIN del panel de adultos, común a todos los alumnos. */
  pinHash: string | null;
}

export const CLAVE_PERFILES = 'capitalia-perfiles';
/** El primer alumno usa la clave de siempre: el progreso de antes de los perfiles es suyo sin moverlo. */
export const ID_PRIMERO = 'p1';

/** Iconos sobrios (nada de mascotas, CLAUDE.md): viajes y geografía. */
export const ICONOS_PERFIL = ['🧭', '🗺️', '🌍', '🏛️', '🗼', '🏔️', '🌋', '🏝️', '⚓', '✈️', '🛰️', '🔭'];
/** Colores de fondo claros: el texto (inicial) va siempre oscuro. */
export const COLORES_PERFIL = ['#c9daf8', '#d9ead3', '#fce5cd', '#f4cccc', '#d9d2e9', '#fff2cc', '#d0e0e3', '#ead1dc'];

export const NOMBRE_MAX = 20;

/** Dónde se guarda el progreso de cada alumno. */
export function claveProgreso(id: string): string {
  return id === ID_PRIMERO ? CLAVE : `${CLAVE}-${id}`;
}

export function indiceVacio(pinHash: string | null = null): IndicePerfiles {
  return {
    version: 1,
    perfiles: [{ id: ID_PRIMERO, nombre: '', imagen: { tipo: 'inicial', color: COLORES_PERFIL[0] } }],
    ultimo: ID_PRIMERO,
    pinHash,
  };
}

function esPerfil(x: unknown): x is Perfil {
  const p = x as Perfil;
  return Boolean(p) && typeof p.id === 'string' && typeof p.nombre === 'string' && Boolean(p.imagen) && typeof p.imagen.color === 'string';
}

/**
 * Lee el índice de perfiles. Si no existe (o no se entiende), crea uno con un
 * solo alumno, dueño del progreso que ya hubiera, y con su PIN.
 */
export function cargarIndice(backend: AlmacenTexto | null, pinActual: string | null = null): IndicePerfiles {
  let texto: string | null = null;
  try {
    texto = backend?.getItem(CLAVE_PERFILES) ?? null;
  } catch {
    texto = null;
  }
  if (texto) {
    try {
      const d = JSON.parse(texto) as Partial<IndicePerfiles>;
      const perfiles = Array.isArray(d.perfiles) ? d.perfiles.filter(esPerfil) : [];
      if (d.version === 1 && perfiles.length) {
        const ultimo = perfiles.some((p) => p.id === d.ultimo) ? d.ultimo! : perfiles[0].id;
        return { version: 1, perfiles, ultimo, pinHash: typeof d.pinHash === 'string' ? d.pinHash : pinActual };
      }
    } catch {
      /* roto: se rehace con un solo alumno */
    }
  }
  return indiceVacio(pinActual);
}

export function guardarIndice(backend: AlmacenTexto | null, indice: IndicePerfiles): boolean {
  try {
    backend?.setItem(CLAVE_PERFILES, JSON.stringify(indice));
    return Boolean(backend);
  } catch {
    return false;
  }
}

/** Nombre válido: sin espacios sobrantes, de 1 a NOMBRE_MAX caracteres; null si no vale. */
export function limpiarNombre(nombre: string): string | null {
  const n = nombre.trim().replace(/\s+/g, ' ');
  return n.length >= 1 && n.length <= NOMBRE_MAX ? n : null;
}

/** Inicial que se muestra (la primera letra del nombre, en mayúscula; "?" si no hay nombre). */
export function inicial(nombre: string): string {
  const letra = [...nombre.trim()][0];
  return letra ? letra.toLocaleUpperCase('es') : '?';
}

/** Añade un alumno y lo devuelve. Modifica `indice`. */
export function crearPerfil(indice: IndicePerfiles, nombre: string, imagen: ImagenPerfil): Perfil {
  const usados = new Set(indice.perfiles.map((p) => p.id));
  let n = indice.perfiles.length + 1;
  while (usados.has(`p${n}`)) n++;
  const perfil: Perfil = { id: `p${n}`, nombre, imagen };
  indice.perfiles.push(perfil);
  return perfil;
}

/**
 * Quita un alumno del índice (su progreso lo borra quien llama, con claveProgreso).
 * No se puede borrar al último que queda. Modifica `indice`.
 */
export function borrarPerfil(indice: IndicePerfiles, id: string): boolean {
  if (indice.perfiles.length <= 1 || !indice.perfiles.some((p) => p.id === id)) return false;
  indice.perfiles = indice.perfiles.filter((p) => p.id !== id);
  if (indice.ultimo === id) indice.ultimo = indice.perfiles[0].id;
  return true;
}

export function perfilDe(indice: IndicePerfiles, id: string): Perfil | undefined {
  return indice.perfiles.find((p) => p.id === id);
}

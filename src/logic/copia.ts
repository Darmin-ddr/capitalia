import { validarEstado } from './almacen';
import type { Perfil } from './perfiles';
import type { EstadoProgreso } from './progreso';

/**
 * Copia de seguridad del progreso (SPEC 9): como fichero (completo) o como
 * código de texto para copiar y pegar (sin el historial, para que sea corto).
 * Sirve también para pasar el progreso de un dispositivo a otro.
 */

/** Prefijo del código; el número permite cambiar el formato en el futuro. */
export const PREFIJO_CODIGO = 'CAPITALES1:';
/** Código que además dice de quién es la copia (nombre, dispositivo y fecha). */
export const PREFIJO_CODIGO_2 = 'CAPITALES2:';

/** De quién es una copia: sirve para avisar al importarla (no para bloquear: restaurar en otro dispositivo es su uso normal). */
export interface OrigenCopia {
  alumno?: string;
  /** Tipo de dispositivo ("un iPad"...): el navegador no da el nombre real del aparato. */
  dispositivo?: string;
  /** Fecha ISO en que se hizo. */
  fecha?: string;
}

interface Envoltorio {
  formato: 'progreso-capitales';
  version: 1;
  fecha: string;
  alumno?: string;
  dispositivo?: string;
  estado: EstadoProgreso;
}

export function exportarFichero(estado: EstadoProgreso, ahora = new Date(), origen: Omit<OrigenCopia, 'fecha'> = {}): string {
  const datos: Envoltorio = {
    formato: 'progreso-capitales',
    version: 1,
    fecha: ahora.toISOString(),
    ...(origen.alumno ? { alumno: origen.alumno } : {}),
    ...(origen.dispositivo ? { dispositivo: origen.dispositivo } : {}),
    estado,
  };
  return JSON.stringify(datos);
}

/** Nombre del fichero, con la fecha y, si se sabe, el nombre del alumno (sin tildes ni espacios). */
export function nombreFichero(ahora = new Date(), alumno?: string): string {
  const quien = alumno
    ? `-${alumno
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`
    : '';
  return `progreso-capitales${quien}-${ahora.toISOString().slice(0, 10)}.json`;
}

/** Tipo de dispositivo para la copia, a partir del navegador. */
export function tipoDispositivo(userAgent: string, puntosTactiles = 0): string {
  if (/iPhone|iPod/.test(userAgent)) return 'un iPhone';
  if (/iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && puntosTactiles > 1)) return 'un iPad';
  if (/Android/.test(userAgent)) return 'un móvil o tableta Android';
  return 'un ordenador';
}

/**
 * Texto de la confirmación al importar: dice de quién es la copia (y cuándo y
 * dónde se hizo) y en qué perfil se va a poner. No bloquea nada.
 */
export function mensajeImportar(origen: OrigenCopia, alumnoActual: string | null): string {
  const detalles = [
    origen.fecha ? `hecha el ${new Date(origen.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}` : '',
    origen.dispositivo ? `en ${origen.dispositivo}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  // Copia antigua (sin datos de origen): no hay nada que contar de ella.
  const de =
    origen.alumno || detalles ? `${origen.alumno ? `Esta copia es de ${origen.alumno}` : 'Esta copia'}${detalles ? ` (${detalles})` : ''}. ` : '';
  if (!alumnoActual) return `${de}Se sustituirá el progreso de este dispositivo por el de la copia. ¿Seguir?`;
  if (origen.alumno && origen.alumno.toLocaleLowerCase('es') !== alumnoActual.toLocaleLowerCase('es')) {
    return `${de}Vas a ponerla en el perfil de ${alumnoActual}: su progreso se sustituirá por el de la copia. ¿Seguir?`;
  }
  return `${de}Se sustituirá el progreso de ${alumnoActual} por el de la copia. ¿Seguir?`;
}

function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(codigo: string): string {
  const b64 = codigo.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}

export function exportarCodigo(estado: EstadoProgreso, origen: Omit<OrigenCopia, 'fecha'> = {}, ahora = new Date()): string {
  const sinHistorial: EstadoProgreso = { ...estado, historial: [] };
  if (!origen.alumno && !origen.dispositivo) return PREFIJO_CODIGO + aBase64Url(JSON.stringify(sinHistorial));
  return PREFIJO_CODIGO_2 + aBase64Url(JSON.stringify({ ...origen, fecha: ahora.toISOString(), estado: sinHistorial }));
}

export type ResultadoImportacion =
  | { ok: true; estado: EstadoProgreso; incluyeHistorial: boolean; origen: OrigenCopia }
  | { ok: false; error: string };

function leerOrigen(d: { alumno?: unknown; dispositivo?: unknown; fecha?: unknown }): OrigenCopia {
  return {
    ...(typeof d.alumno === 'string' && d.alumno ? { alumno: d.alumno } : {}),
    ...(typeof d.dispositivo === 'string' && d.dispositivo ? { dispositivo: d.dispositivo } : {}),
    ...(typeof d.fecha === 'string' && d.fecha ? { fecha: d.fecha } : {}),
  };
}

/** Lee un fichero exportado o un código. No modifica nada: solo valida. */
export function importar(texto: string): ResultadoImportacion {
  const limpio = texto.trim().replace(/\s+/g, '');
  if (!limpio) return { ok: false, error: 'No hay nada que importar.' };
  try {
    if (limpio.startsWith(PREFIJO_CODIGO)) {
      const estado = validarEstado(JSON.parse(deBase64Url(limpio.slice(PREFIJO_CODIGO.length))));
      return estado ? { ok: true, estado, incluyeHistorial: false, origen: {} } : { ok: false, error: 'El código no es válido.' };
    }
    if (limpio.startsWith(PREFIJO_CODIGO_2)) {
      const d = JSON.parse(deBase64Url(limpio.slice(PREFIJO_CODIGO_2.length))) as { estado?: unknown; alumno?: unknown; dispositivo?: unknown; fecha?: unknown };
      const estado = validarEstado(d.estado);
      return estado ? { ok: true, estado, incluyeHistorial: false, origen: leerOrigen(d) } : { ok: false, error: 'El código no es válido.' };
    }
    const datos = JSON.parse(texto) as Partial<Envoltorio> | Partial<CopiaCasa>;
    if (datos.formato === 'capitalia-casa') {
      return { ok: false, error: 'Esta es una copia de todos los alumnos: se restaura desde el panel de adultos (Ajustes → Alumnos).' };
    }
    if (datos.formato !== 'progreso-capitales') return { ok: false, error: 'Este fichero no es una copia de Capitalia.' };
    const estado = validarEstado(datos.estado);
    return estado
      ? { ok: true, estado, incluyeHistorial: true, origen: leerOrigen(datos) }
      : { ok: false, error: 'La copia está dañada o es de otra versión.' };
  } catch {
    return { ok: false, error: 'No se ha podido leer. ¿Está completo el código o el fichero?' };
  }
}

/**
 * Estado resultante de importar: sustituye el progreso por el importado.
 * Si la copia no trae historial (código), se conserva el historial local.
 */
export function aplicarImportacion(actual: EstadoProgreso, importado: EstadoProgreso, incluyeHistorial: boolean): EstadoProgreso {
  return { ...importado, historial: incluyeHistorial ? importado.historial : actual.historial };
}

/* ---------- Copia de toda la casa (todos los alumnos, desde el panel de adultos) ---------- */

interface CopiaCasa {
  formato: 'capitalia-casa';
  version: 1;
  fecha: string;
  perfiles: Perfil[];
  /** Progreso de cada alumno, por id de perfil. */
  progresos: Record<string, EstadoProgreso>;
}

export function exportarCasa(perfiles: readonly Perfil[], progresos: Record<string, EstadoProgreso>, ahora = new Date()): string {
  const datos: CopiaCasa = { formato: 'capitalia-casa', version: 1, fecha: ahora.toISOString(), perfiles: [...perfiles], progresos };
  return JSON.stringify(datos);
}

export function nombreFicheroCasa(ahora = new Date()): string {
  return `capitalia-todos-los-alumnos-${ahora.toISOString().slice(0, 10)}.json`;
}

export type ResultadoCasa =
  | { ok: true; perfiles: Perfil[]; progresos: Record<string, EstadoProgreso> }
  | { ok: false; error: string };

/** Lee una copia de toda la casa. Solo valida: cada alumno debe traer su progreso. */
export function importarCasa(texto: string): ResultadoCasa {
  try {
    const datos = JSON.parse(texto) as Omit<Partial<CopiaCasa>, 'formato'> & { formato?: string };
    if (datos.formato === 'progreso-capitales') {
      return { ok: false, error: 'Esta copia es de un solo alumno: se importa en ⋯ → Importar fichero, con ese alumno activo.' };
    }
    if (datos.formato !== 'capitalia-casa' || !Array.isArray(datos.perfiles) || !datos.perfiles.length || !datos.progresos) {
      return { ok: false, error: 'Este fichero no es una copia de todos los alumnos de Capitalia.' };
    }
    const progresos: Record<string, EstadoProgreso> = {};
    for (const p of datos.perfiles) {
      const estado = p && typeof p.id === 'string' ? validarEstado(datos.progresos[p.id]) : null;
      if (!estado || typeof p.nombre !== 'string' || !p.imagen) return { ok: false, error: 'La copia está dañada o es de otra versión.' };
      progresos[p.id] = estado;
    }
    return { ok: true, perfiles: datos.perfiles, progresos };
  } catch {
    return { ok: false, error: 'No se ha podido leer. ¿Está completo el fichero?' };
  }
}


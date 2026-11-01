import { validarEstado } from './almacen';
import type { EstadoProgreso } from './progreso';

/**
 * Copia de seguridad del progreso (SPEC 9): como fichero (completo) o como
 * código de texto para copiar y pegar (sin el historial, para que sea corto).
 * Sirve también para pasar el progreso de un dispositivo a otro.
 */

/** Prefijo del código; el número permite cambiar el formato en el futuro. */
export const PREFIJO_CODIGO = 'CAPITALES1:';

interface Envoltorio {
  formato: 'progreso-capitales';
  version: 1;
  fecha: string;
  estado: EstadoProgreso;
}

export function exportarFichero(estado: EstadoProgreso, ahora = new Date()): string {
  const datos: Envoltorio = { formato: 'progreso-capitales', version: 1, fecha: ahora.toISOString(), estado };
  return JSON.stringify(datos);
}

export function nombreFichero(ahora = new Date()): string {
  return `progreso-capitales-${ahora.toISOString().slice(0, 10)}.json`;
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

export function exportarCodigo(estado: EstadoProgreso): string {
  const sinHistorial: EstadoProgreso = { ...estado, historial: [] };
  return PREFIJO_CODIGO + aBase64Url(JSON.stringify(sinHistorial));
}

export type ResultadoImportacion =
  | { ok: true; estado: EstadoProgreso; incluyeHistorial: boolean }
  | { ok: false; error: string };

/** Lee un fichero exportado o un código. No modifica nada: solo valida. */
export function importar(texto: string): ResultadoImportacion {
  const limpio = texto.trim().replace(/\s+/g, '');
  if (!limpio) return { ok: false, error: 'No hay nada que importar.' };
  try {
    if (limpio.startsWith(PREFIJO_CODIGO)) {
      const estado = validarEstado(JSON.parse(deBase64Url(limpio.slice(PREFIJO_CODIGO.length))));
      return estado ? { ok: true, estado, incluyeHistorial: false } : { ok: false, error: 'El código no es válido.' };
    }
    const datos = JSON.parse(texto) as Partial<Envoltorio>;
    if (datos.formato !== 'progreso-capitales') return { ok: false, error: 'Este fichero no es una copia de Capitalia.' };
    const estado = validarEstado(datos.estado);
    return estado ? { ok: true, estado, incluyeHistorial: true } : { ok: false, error: 'La copia está dañada o es de otra versión.' };
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

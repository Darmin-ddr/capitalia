import { describe, expect, it } from 'vitest';
import { aplicarImportacion, exportarCodigo, exportarFichero, importar, nombreFichero, PREFIJO_CODIGO } from '../src/logic/copia';
import { estadoVacio, registrarRespuesta } from '../src/logic/progreso';

function estadoConDatos() {
  const e = estadoVacio();
  registrarRespuesta(e, 'ESP', 'elegir', 'acierto', 3000, new Date('2026-11-01T10:00:00Z'));
  registrarRespuesta(e, 'FRA', 'escribir', 'fallo', 9000, new Date('2026-11-01T10:01:00Z'));
  e.trucosPropios.ESP = 'Madrid, en el centro: como el ombligo de España ñ á';
  e.ajustes.listaExamen = ['ESP', 'FRA'];
  return e;
}

describe('copia de seguridad', () => {
  it('fichero: ida y vuelta con historial', () => {
    const e = estadoConDatos();
    const r = importar(exportarFichero(e));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.estado).toEqual(e);
      expect(r.incluyeHistorial).toBe(true);
    }
  });

  it('código: ida y vuelta sin historial, con tildes y eñes', () => {
    const e = estadoConDatos();
    const codigo = exportarCodigo(e);
    expect(codigo.startsWith(PREFIJO_CODIGO)).toBe(true);
    expect(codigo).toMatch(/^[A-Za-z0-9:_-]+$/);
    const r = importar(`  ${codigo.slice(0, 40)}\n${codigo.slice(40)}  `); // con saltos de línea al pegar
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.incluyeHistorial).toBe(false);
      expect(r.estado.tarjetas).toEqual(e.tarjetas);
      expect(r.estado.trucosPropios.ESP).toBe(e.trucosPropios.ESP);
      expect(r.estado.historial).toEqual([]);
    }
  });

  it('aplicar: el código conserva el historial local; el fichero lo sustituye', () => {
    const local = estadoConDatos();
    const otro = estadoVacio();
    otro.tarjetas.ITA = local.tarjetas.ESP;
    expect(aplicarImportacion(local, otro, false).historial).toEqual(local.historial);
    expect(aplicarImportacion(local, otro, true).historial).toEqual([]);
    expect(aplicarImportacion(local, otro, false).tarjetas).toEqual(otro.tarjetas);
  });

  it('errores claros', () => {
    expect(importar('')).toMatchObject({ ok: false });
    expect(importar('hola')).toMatchObject({ ok: false });
    expect(importar('{"formato":"otra-cosa"}')).toMatchObject({ ok: false, error: expect.stringContaining('no es una copia') });
    expect(importar(PREFIJO_CODIGO + 'xxxx')).toMatchObject({ ok: false });
    const codigo = exportarCodigo(estadoConDatos());
    expect(importar(codigo.slice(0, codigo.length - 20))).toMatchObject({ ok: false }); // código cortado
  });

  it('nombre del fichero con la fecha', () => {
    expect(nombreFichero(new Date('2026-11-01T10:00:00Z'))).toBe('progreso-capitales-2026-11-01.json');
  });
});

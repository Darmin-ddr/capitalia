import { describe, expect, it } from 'vitest';
import {
  aplicarImportacion, exportarCasa, exportarCodigo, exportarFichero, importar, importarCasa, mensajeImportar, nombreFichero, nombreFicheroCasa,
  PREFIJO_CODIGO, PREFIJO_CODIGO_2, tipoDispositivo,
} from '../src/logic/copia';
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

describe('copia de todos los alumnos', () => {
  const perfiles = [
    { id: 'p1', nombre: 'Lucía', imagen: { tipo: 'inicial' as const, color: '#fff' } },
    { id: 'p2', nombre: 'Pablo', imagen: { tipo: 'icono' as const, icono: '🧭', color: '#eee' } },
  ];

  it('ida y vuelta con el progreso de cada uno', () => {
    const e1 = estadoConDatos();
    const e2 = estadoVacio();
    e2.trucosPropios.FRA = 'de Pablo';
    const r = importarCasa(exportarCasa(perfiles, { p1: e1, p2: e2 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.perfiles.map((p) => p.nombre)).toEqual(['Lucía', 'Pablo']);
    expect(r.progresos.p1.historial).toHaveLength(2);
    expect(r.progresos.p2.trucosPropios.FRA).toBe('de Pablo');
    expect(nombreFicheroCasa(new Date('2026-11-02T10:00:00Z'))).toBe('capitalia-todos-los-alumnos-2026-11-02.json');
  });

  it('cada copia en su sitio, con un mensaje claro', () => {
    const casa = exportarCasa(perfiles, { p1: estadoVacio(), p2: estadoVacio() });
    const uno = exportarFichero(estadoVacio());
    expect(importar(casa)).toMatchObject({ ok: false, error: expect.stringContaining('panel de adultos') });
    expect(importarCasa(uno)).toMatchObject({ ok: false, error: expect.stringContaining('un solo alumno') });
  });

  it('dañada: falta el progreso de un alumno', () => {
    const casa = JSON.parse(exportarCasa(perfiles, { p1: estadoVacio(), p2: estadoVacio() }));
    delete casa.progresos.p2;
    expect(importarCasa(JSON.stringify(casa)).ok).toBe(false);
    expect(importarCasa('{roto').ok).toBe(false);
  });
});

describe('de quién es la copia (aviso al importar, sin bloquear)', () => {
  const ahora = new Date('2026-11-02T12:00:00Z');

  it('el fichero y el código dicen de quién son, dónde y cuándo se hicieron', () => {
    const f = importar(exportarFichero(estadoVacio(), ahora, { alumno: 'Pablo', dispositivo: 'un iPad' }));
    expect(f).toMatchObject({ ok: true, origen: { alumno: 'Pablo', dispositivo: 'un iPad', fecha: ahora.toISOString() } });
    const codigo = exportarCodigo(estadoVacio(), { alumno: 'Pablo', dispositivo: 'un iPad' }, ahora);
    expect(codigo.startsWith(PREFIJO_CODIGO_2)).toBe(true);
    expect(importar(codigo)).toMatchObject({ ok: true, origen: { alumno: 'Pablo' } });
    // Los códigos antiguos se siguen leyendo, sin origen.
    expect(importar(exportarCodigo(estadoVacio()))).toMatchObject({ ok: true, origen: {} });
  });

  it('mensaje: otro perfil, el mismo, o copia antigua', () => {
    const origen = { alumno: 'Pablo', dispositivo: 'un iPad', fecha: ahora.toISOString() };
    expect(mensajeImportar(origen, 'Lucía')).toBe(
      'Esta copia es de Pablo (hecha el 2 de noviembre en un iPad). Vas a ponerla en el perfil de Lucía: su progreso se sustituirá por el de la copia. ¿Seguir?',
    );
    expect(mensajeImportar(origen, 'pablo')).toContain('Se sustituirá el progreso de pablo');
    expect(mensajeImportar({}, 'Lucía')).toBe('Se sustituirá el progreso de Lucía por el de la copia. ¿Seguir?');
    expect(mensajeImportar({}, null)).toContain('progreso de este dispositivo');
  });

  it('tipo de dispositivo y nombre del fichero', () => {
    expect(tipoDispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('un iPhone');
    expect(tipoDispositivo('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('un iPad');
    expect(tipoDispositivo('Mozilla/5.0 (Linux; Android 14)')).toBe('un móvil o tableta Android');
    expect(tipoDispositivo('Mozilla/5.0 (Windows NT 10.0)')).toBe('un ordenador');
    expect(nombreFichero(ahora, 'Lucía María')).toBe('progreso-capitales-lucia-maria-2026-11-02.json');
  });
});


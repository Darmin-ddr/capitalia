import { describe, expect, it } from 'vitest';
import { desplazar, esInicial, HOLGURA, limitar, VISTA_INICIAL, zoomEn, ZOOM_MAXIMO, ZOOM_MINIMO } from '../src/logic/vista';

describe('zoom y desplazamiento del mapa', () => {
  const W = 400;
  const H = 300;

  it('el punto bajo el dedo se queda quieto al hacer zoom', () => {
    const v = zoomEn(VISTA_INICIAL, 2, 100, 50, W, H);
    expect(v.k).toBe(2);
    expect(v.k * 100 + v.x).toBeCloseTo(100);
    expect(v.k * 50 + v.y).toBeCloseTo(50);
  });

  it('se puede alejar un poco más que la vista de la región, hasta un mínimo', () => {
    expect(zoomEn(VISTA_INICIAL, 0.8, 200, 150, W, H).k).toBeCloseTo(0.8);
    expect(zoomEn(VISTA_INICIAL, 0.1, 200, 150, W, H).k).toBe(ZOOM_MINIMO);
    expect(zoomEn(VISTA_INICIAL, 100, 10, 10, W, H).k).toBe(ZOOM_MAXIMO);
  });

  it('sin zoom se puede mover con holgura, pero no sin límite', () => {
    const v = desplazar(VISTA_INICIAL, 1000, -1000, W, H);
    expect(v.x).toBeCloseTo(W * HOLGURA);
    expect(v.y).toBeCloseTo(-H * HOLGURA);
  });

  it('con zoom, el límite es el borde del mapa más la holgura', () => {
    const v = zoomEn(VISTA_INICIAL, 2, 200, 150, W, H);
    expect(desplazar(v, 5000, 5000, W, H)).toMatchObject({ x: W * HOLGURA, y: H * HOLGURA });
    const lejos = desplazar(v, -5000, -5000, W, H);
    expect(lejos.x).toBeCloseTo(W * (1 - 2) - W * HOLGURA);
    expect(lejos.y).toBeCloseTo(H * (1 - 2) - H * HOLGURA);
  });

  it('vista inicial', () => {
    expect(esInicial(VISTA_INICIAL)).toBe(true);
    expect(esInicial(limitar({ k: 1, x: 10, y: 0 }, W, H))).toBe(false);
  });
});

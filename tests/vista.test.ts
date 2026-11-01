import { describe, expect, it } from 'vitest';
import { desplazar, limitar, VISTA_INICIAL, zoomEn, ZOOM_MAXIMO } from '../src/logic/vista';

describe('zoom y desplazamiento del mapa', () => {
  const W = 400;
  const H = 300;

  it('el punto bajo el dedo se queda quieto al hacer zoom', () => {
    const v = zoomEn(VISTA_INICIAL, 2, 100, 50, W, H);
    expect(v.k).toBe(2);
    // El punto del mapa que estaba en (100, 50) sigue en (100, 50).
    const px = (100 - VISTA_INICIAL.x) / VISTA_INICIAL.k;
    expect(v.k * px + v.x).toBeCloseTo(100);
    expect(v.k * ((50 - VISTA_INICIAL.y) / VISTA_INICIAL.k) + v.y).toBeCloseTo(50);
  });

  it('no se aleja más que la vista completa ni acerca más del máximo', () => {
    expect(zoomEn(VISTA_INICIAL, 0.5, 10, 10, W, H)).toEqual(VISTA_INICIAL);
    expect(zoomEn(VISTA_INICIAL, 100, 10, 10, W, H).k).toBe(ZOOM_MAXIMO);
  });

  it('no deja ver huecos fuera del mapa', () => {
    const v = zoomEn(VISTA_INICIAL, 2, 200, 150, W, H);
    expect(desplazar(v, 1000, 1000, W, H)).toMatchObject({ x: 0, y: 0 });
    expect(desplazar(v, -1000, -1000, W, H)).toMatchObject({ x: W * (1 - 2), y: H * (1 - 2) });
  });

  it('sin zoom no hay desplazamiento posible', () => {
    expect(desplazar(VISTA_INICIAL, 50, -30, W, H)).toEqual(VISTA_INICIAL);
    expect(limitar({ k: 0.5, x: 10, y: 10 }, W, H)).toEqual(VISTA_INICIAL);
  });
});

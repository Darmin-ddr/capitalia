import { reduceMovimiento } from './dom';

const COLORES = ['#9ad9c0', '#f6c58f', '#c8b6e2', '#a9c9ef', '#f3a99a'];

/**
 * Confeti corto (algo más de un segundo). Solo para los momentos que marca el
 * SPEC: recuperar un fallo o dominar una región. Con "reducir movimiento"
 * activado en el sistema no se muestra.
 */
export function lanzarConfeti(): void {
  if (reduceMovimiento()) return;
  const lienzo = document.createElement('canvas');
  lienzo.className = 'confeti';
  lienzo.setAttribute('aria-hidden', 'true');
  document.body.append(lienzo);
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  lienzo.width = w * dpr;
  lienzo.height = h * dpr;
  const ctx = lienzo.getContext('2d');
  if (!ctx) {
    lienzo.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const piezas = Array.from({ length: 70 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.3,
    y: h * 0.55,
    vx: (Math.random() - 0.5) * 9,
    vy: -6 - Math.random() * 8,
    giro: Math.random() * Math.PI,
    vgiro: (Math.random() - 0.5) * 0.3,
    color: COLORES[Math.floor(Math.random() * COLORES.length)],
    tam: 5 + Math.random() * 5,
  }));

  const duracion = 1300;
  const inicio = performance.now();
  const paso = (t: number) => {
    const p = (t - inicio) / duracion;
    ctx.clearRect(0, 0, w, h);
    if (p >= 1) {
      lienzo.remove();
      return;
    }
    ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    for (const c of piezas) {
      c.vy += 0.35;
      c.x += c.vx;
      c.y += c.vy;
      c.giro += c.vgiro;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.giro);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.tam / 2, -c.tam / 4, c.tam, c.tam / 2);
      ctx.restore();
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

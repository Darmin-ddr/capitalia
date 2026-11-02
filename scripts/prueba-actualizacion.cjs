// Prueba real de actualización (sin simular nada): compila la app, la abre, vuelve a compilar
// y comprueba que (1) al abrirla con conexión sale ya la versión nueva ("primero la red"),
// (2) una pestaña que se quedó abierta con la anterior avisa al volver a ella y (3) sin conexión
// sigue funcionando, recién actualizada y recién estrenada.
// Uso: node scripts/prueba-actualizacion.cjs   (con `npx vite preview --port 4173` en marcha;
// el preview sirve lo que haya en dist/, y este script vuelve a compilar)
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');

const raiz = path.join(__dirname, '..');
const compilar = () => execSync('npm run build', { cwd: raiz, stdio: 'ignore' });
const P = '{"version":1,"perfiles":[{"id":"p1","nombre":"","imagen":{"tipo":"inicial","color":"#c9daf8"}}],"ultimo":"p1","pinHash":null,"nombrePedido":true}';
const ESTADO = JSON.stringify({ version: 1, tarjetas: {}, historial: [], guiaVista: true, bienvenidaVista: true, ajustes: {} });
let fallosPrueba = 0;
const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };
/** Qué compilación ejecuta la página: el nombre (con huella) de su script principal. */
const compilacionDe = (p) => p.evaluate(() => document.querySelector('script[type="module"]')?.getAttribute('src'));

(async () => {
  const b = await chromium.launch();
  const errores = [];
  compilar();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
  await ctx.addInitScript(([perf, est]) => {
    if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('capitalia-perfiles', perf), localStorage.setItem('progreso-capitales', est);
  }, [P, ESTADO]);
  const abrir = async () => {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.portada-progreso');
    return p;
  };

  // Versión A instalada (service worker activo y controlando).
  const vieja = await abrir();
  await vieja.evaluate(() => navigator.serviceWorker.ready);
  await vieja.reload(); await vieja.waitForSelector('.portada-progreso');
  const a = await compilacionDe(vieja);

  // Se publica la versión B.
  compilar();

  // 1. Abrir otra vez con conexión: sale ya la B, sin esperar a otra apertura.
  const nueva = await abrir();
  const b2 = await compilacionDe(nueva);
  comprobar(b2 && b2 !== a, `al abrir con conexión, sale ya la versión nueva (${a} → ${b2})`);
  comprobar(await nueva.locator('.aviso-version').count() === 0, 'y no avisa de nada (ya es la nueva)');

  // 2. La pestaña que seguía abierta con la A: al volver a ella, avisa.
  await vieja.bringToFront();
  await vieja.evaluate(() => window.dispatchEvent(new Event('focus')));
  await vieja.waitForSelector('.aviso-version', { timeout: 8000 }).catch(() => null);
  comprobar(await vieja.locator('.aviso-version').count() === 1, 'la pestaña con la versión anterior avisa al volver a ella');
  await Promise.all([vieja.waitForEvent('load'), vieja.locator('.aviso-version').getByRole('button', { name: 'Actualizar' }).click()]);
  await vieja.waitForSelector('.portada-progreso');
  comprobar((await compilacionDe(vieja)) === b2, '"Actualizar" carga la versión nueva');

  // 3. Sin conexión, recién actualizada: funciona entera (página y código de la B).
  await nueva.waitForTimeout(1500);
  await ctx.setOffline(true);
  await nueva.reload();
  await nueva.waitForSelector('.pais', { timeout: 10000 }).catch(() => null);
  comprobar((await nueva.locator('path.pais.jugable').count()) > 0, 'sin conexión, la versión nueva abre con su mapa');
  comprobar((await compilacionDe(nueva)) === b2, 'y es la nueva, no una mezcla');
  await nueva.locator('.modo[data-modo="aprender"]').click();
  comprobar(await nueva.locator('.escalera').count() === 1, 'y funciona (Aprender) sin conexión');
  await ctx.setOffline(false);
  await ctx.close();

  // 4. Recién estrenada: se abre una vez con conexión y luego sin conexión.
  const ctx2 = await b.newContext({ viewport: { width: 1366, height: 800 } });
  await ctx2.addInitScript(([perf, est]) => {
    if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('capitalia-perfiles', perf), localStorage.setItem('progreso-capitales', est);
  }, [P, ESTADO]);
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errores.push('estreno: ' + e.message));
  await p2.goto('http://localhost:4173/');
  await p2.waitForSelector('.portada-progreso');
  await p2.evaluate(() => navigator.serviceWorker.ready);
  await p2.waitForTimeout(1500);
  await ctx2.setOffline(true);
  const p3 = await ctx2.newPage();
  p3.on('pageerror', (e) => errores.push('estreno sin conexión: ' + e.message));
  await p3.goto('http://localhost:4173/').catch(() => null);
  await p3.waitForSelector('.pais', { timeout: 10000 }).catch(() => null);
  comprobar((await p3.locator('path.pais.jugable').count()) > 0, 'recién estrenada, sin conexión abre igual');
  await ctx2.close();

  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log(fallosPrueba ? `${fallosPrueba} comprobaciones fallidas` : 'todas las comprobaciones bien');
  await b.close();
  process.exit(fallosPrueba || errores.length ? 1 : 0);
})();

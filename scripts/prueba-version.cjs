// Prueba del aviso de versión nueva: en la portada de Hoy y franja al pie en las demás pestañas.
// El cambio de versión real no se puede provocar aquí: se simula el evento `controllerchange`
// (el que da el navegador cuando la versión nueva toma el control).
// Uso: node scripts/prueba-version.cjs <carpeta-capturas>   (con `npx vite preview --port 4173` en marcha)
const { chromium, devices } = require('playwright');

const P = '{"version":1,"perfiles":[{"id":"p1","nombre":"","imagen":{"tipo":"inicial","color":"#c9daf8"}}],"ultimo":"p1","pinHash":null,"nombrePedido":true}';
const ESTADO = JSON.stringify({ version: 1, tarjetas: {}, historial: [], guiaVista: true, bienvenidaVista: true, ajustes: {} });
const out = process.argv[2] || '.';
let fallosPrueba = 0;
const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };
const versionNueva = (p) => p.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
const visible = (p, sel) => p.locator(sel).first().isVisible().catch(() => false);

(async () => {
  const b = await chromium.launch();
  const errores = [];
  for (const [nombre, o] of [['pc', { viewport: { width: 1366, height: 800 } }], ['movil', devices['iPhone 13']]]) {
    const ctx = await b.newContext(o);
    await ctx.addInitScript(([perf, est]) => {
      if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('capitalia-perfiles', perf), localStorage.setItem('progreso-capitales', est);
    }, [P, ESTADO]);
    const p = await ctx.newPage();
    const tap = o.hasTouch ? 'tap' : 'click';
    p.on('pageerror', (e) => errores.push(nombre + ': ' + e.message));
    // Primera visita: el service worker se instala y toma el control; eso no es una versión nueva.
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.portada-progreso');
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.waitForTimeout(500);
    comprobar(!(await visible(p, '.aviso-version')) && !(await visible(p, '#franja-version')), `${nombre}: primera visita, sin aviso`);
    // Con la app ya controlada por el service worker, llega una versión nueva.
    await p.reload(); await p.waitForSelector('.portada-progreso');
    await versionNueva(p);
    await p.waitForTimeout(200);
    comprobar(await visible(p, '.aviso-version'), `${nombre}: aviso en la portada de Hoy`);
    comprobar(!(await visible(p, '#franja-version')), `${nombre}: en la portada no sale también la franja`);
    await p.screenshot({ path: `${out}/${nombre}-version-hoy.png` });
    // En las demás pestañas, la franja al pie.
    await p.locator('.modo[data-modo="explorar"]')[tap]();
    await p.waitForTimeout(200);
    comprobar(await visible(p, '#franja-version'), `${nombre}: franja al pie en Explorar`);
    const tapa = await p.evaluate(() => {
      const f = document.getElementById('franja-version').getBoundingClientRect();
      const panel = document.getElementById('panel').getBoundingClientRect();
      return f.top < panel.bottom - 1;
    });
    comprobar(!tapa, `${nombre}: la franja no tapa el panel (va debajo, en el flujo)`);
    await p.screenshot({ path: `${out}/${nombre}-version-franja.png` });
    // "×" la oculta; "Actualizar" recarga.
    await p.locator('#franja-version').getByRole('button', { name: 'Ocultar el aviso hasta la próxima vez' })[tap]();
    comprobar(!(await visible(p, '#franja-version')), `${nombre}: "×" oculta la franja`);
    await p.locator('.modo[data-modo="hoy"]')[tap]();
    await Promise.all([p.waitForEvent('load'), p.locator('.aviso-version').getByRole('button', { name: 'Actualizar' })[tap]()]);
    await p.waitForSelector('.portada-progreso');
    comprobar(!(await visible(p, '.aviso-version')), `${nombre}: "Actualizar" recarga la app`);
    await ctx.close();
  }
  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log(fallosPrueba ? `${fallosPrueba} comprobaciones fallidas` : 'todas las comprobaciones bien');
  await b.close();
  process.exit(fallosPrueba || errores.length ? 1 : 0);
})();

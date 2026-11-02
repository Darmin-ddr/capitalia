// Prueba del aviso de versión nueva: en la portada de Hoy y franja al pie en las demás pestañas.
// Se simula que el servidor tiene otra compilación (version.json distinto). La prueba con
// compilaciones reales es scripts/prueba-actualizacion.cjs.
// Uso: node scripts/prueba-version.cjs <carpeta-capturas>   (con `npx vite preview --port 4173` en marcha)
const { chromium, devices } = require('playwright');

const P = '{"version":1,"perfiles":[{"id":"p1","nombre":"","imagen":{"tipo":"inicial","color":"#c9daf8"}}],"ultimo":"p1","pinHash":null,"nombrePedido":true}';
const ESTADO = JSON.stringify({ version: 1, tarjetas: {}, historial: [], guiaVista: true, bienvenidaVista: true, ajustes: {} });
const out = process.argv[2] || '.';
let fallosPrueba = 0;
const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };
// El servidor pasa a tener otra compilación y se "vuelve" a la app (pasado el minuto de espera entre consultas).
const versionNueva = async (p) => {
  await p.route('**/version.json*', (r) => r.fulfill({ contentType: 'application/json', body: '{"version":"9.9.9","compilacion":"otra"}' }));
  await p.evaluate(() => {
    const ahora = Date.now;
    Date.now = () => ahora() + 120000;
    window.dispatchEvent(new Event('focus'));
  });
  await p.waitForSelector('.aviso-version, #franja-version', { timeout: 5000 }).catch(() => null);
};
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
    // Misma compilación que el servidor: sin aviso (ni al arrancar ni al volver).
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.portada-progreso');
    await p.waitForTimeout(6000);
    await p.evaluate(() => window.dispatchEvent(new Event('focus')));
    await p.waitForTimeout(500);
    comprobar(!(await visible(p, '.aviso-version')) && !(await visible(p, '#franja-version')), `${nombre}: misma versión que el servidor, sin aviso`);
    // El servidor publica otra: al volver a la app, avisa.
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
    await p.unroute('**/version.json*');
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

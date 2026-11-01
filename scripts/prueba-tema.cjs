// Prueba del tema Automático/Claro/Oscuro (plan v2, F5) y capturas de las pestañas nuevas en oscuro.
// Uso: node scripts/prueba-tema.cjs <carpeta-capturas>   (con `npx vite preview --port 4173` en marcha)
const { chromium, devices } = require('playwright');

const ESTADO = JSON.stringify({
  version: 1, tarjetas: {}, historial: [], trucosPropios: {}, regionesCelebradas: [], ultimaRegion: 'balcanes',
  guiaVista: true, bienvenidaVista: true, prioridad: [],
  aprendizaje: { SVN: { escalon: 3, aciertos: 0, aprendido: false }, HRV: { escalon: 1, aciertos: 0, aprendido: false } },
  ajustes: { opcionalesActivados: [], listaExamen: null, fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null, todasDesbloqueadas: true, maxNuevos: 10 },
});
const OSCURO = 'rgb(22, 27, 34)';
const CLARO = 'rgb(246, 244, 239)';

const out = process.argv[2] || '.';
let fallosPrueba = 0;
const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };
const fondo = (p) => p.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function elegirTema(p, texto) {
  await p.locator('#boton-mas').click();
  await p.locator('.selector-tema .selector-opcion', { hasText: texto }).click();
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
}

(async () => {
  const b = await chromium.launch();
  const errores = [];
  // Sistema claro: Oscuro a mano, se recuerda al recargar; Automático vuelve a claro.
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 }, colorScheme: 'light' });
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    comprobar((await fondo(p)) === CLARO, 'sistema claro → claro');
    await elegirTema(p, 'Oscuro');
    comprobar((await fondo(p)) === OSCURO, 'Oscuro elegido → oscuro');
    await p.reload();
    await p.waitForSelector('.pais');
    comprobar((await fondo(p)) === OSCURO, 'se recuerda al recargar');
    const meta = await p.evaluate(() => [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.content).join(','));
    comprobar(meta === '#161b22,#161b22', `barra del navegador en oscuro (${meta})`);
    await elegirTema(p, 'Automático');
    comprobar((await fondo(p)) === CLARO, 'Automático → el del sistema (claro)');
    await ctx.close();
  }
  // Sistema oscuro: Claro a mano gana.
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 }, colorScheme: 'dark' });
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO);
    const p = await ctx.newPage();
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    comprobar((await fondo(p)) === OSCURO, 'sistema oscuro → oscuro');
    await elegirTema(p, 'Claro');
    comprobar((await fondo(p)) === CLARO, 'Claro elegido con sistema oscuro → claro');
    await ctx.close();
  }
  // Capturas en oscuro: Hoy, Aprender (escalera y mapa mudo), Examen y el diálogo ⋯.
  for (const [nombre, o] of [['pc', { viewport: { width: 1366, height: 800 } }], ['movil', devices['iPhone 13']]]) {
    const ctx = await b.newContext({ ...o, colorScheme: 'dark' });
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push(nombre + ': ' + e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    await p.screenshot({ path: `${out}/oscuro-${nombre}-hoy.png` });
    await p.locator('.modo[data-modo="aprender"]').click();
    await p.screenshot({ path: `${out}/oscuro-${nombre}-aprender.png` });
    await p.locator('.modo[data-modo="examen"]').click();
    await p.locator('text=Empezar examen').click();
    await p.waitForSelector('.mapa-mudo-form');
    await p.screenshot({ path: `${out}/oscuro-${nombre}-examen.png` });
    await p.locator('#boton-mas').click();
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${out}/oscuro-${nombre}-mas.png` });
    await ctx.close();
  }
  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log(fallosPrueba ? `${fallosPrueba} comprobaciones fallidas` : 'todas las comprobaciones bien');
  await b.close();
  process.exit(fallosPrueba || errores.length ? 1 : 0);
})();

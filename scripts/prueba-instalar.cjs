// Prueba de "Instalar la app" (versión 1.2.0): entrada en ⋯ y aviso de una vez en la portada de Hoy.
// El evento de instalación de Chrome no salta en el navegador de pruebas: se simula uno.
// Uso: node scripts/prueba-instalar.cjs <carpeta-capturas>   (con `npx vite preview --port 4173` en marcha)
const { chromium, devices } = require('playwright');

const ayer = new Date(Date.now() - 864e5).toISOString();
const estado = (conUso) => JSON.stringify({
  version: 1, tarjetas: {}, guiaVista: true, bienvenidaVista: true, aprendizaje: {}, ajustes: {},
  historial: conUso ? [{ t: ayer, pais: 'ESP', modo: 'elegir', res: 'acierto', ms: 3000, nota: 3 }] : [],
});
const out = process.argv[2] || '.';
let fallosPrueba = 0;
const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };

async function abrir(b, perfil, e) {
  const ctx = await b.newContext(perfil);
  await ctx.addInitScript((x) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', x); }, e);
  const p = await ctx.newPage();
  await p.goto('http://localhost:4173/');
  await p.waitForSelector('.portada-progreso');
  return { ctx, p };
}

(async () => {
  const b = await chromium.launch();
  const errores = [];

  // 1. Primer día: sin aviso. Desde el segundo día: aviso; "Instalar" sin evento del navegador → pasos.
  {
    const { ctx, p } = await abrir(b, { viewport: { width: 1366, height: 800 } }, estado(false));
    comprobar(await p.locator('.aviso-instalar').count() === 0, 'primer día: sin aviso de instalar');
    await ctx.close();
  }
  {
    const { ctx, p } = await abrir(b, { viewport: { width: 1366, height: 800 } }, estado(true));
    p.on('pageerror', (e) => errores.push('pc: ' + e.message));
    comprobar(await p.locator('.aviso-instalar').count() === 1, 'segundo día: aviso de instalar en la portada');
    const tam = await p.locator('.aviso-instalar button').evaluateAll((bs) => bs.map((x) => Math.round(Math.min(x.getBoundingClientRect().width, x.getBoundingClientRect().height))));
    comprobar(tam.every((t) => t >= 44), `botones del aviso de 44 px o más (${tam})`);
    await p.screenshot({ path: `${out}/pc-aviso-instalar.png` });
    await p.locator('.aviso-instalar').getByRole('button', { name: 'Instalar' }).click();
    const texto = await p.locator('dialog[open]').innerText();
    comprobar(texto.includes('Android (Chrome)') && texto.includes('Ordenador'), 'sin instalación del navegador: pasos para cada dispositivo');
    await p.screenshot({ path: `${out}/pc-instalar-pasos.png` });
    await p.keyboard.press('Escape');
    // "Ahora no": no vuelve, ni al recargar; la entrada de ⋯ sigue.
    await p.locator('.aviso-instalar').getByRole('button', { name: 'Ahora no' }).click();
    comprobar(await p.locator('.aviso-instalar').count() === 0, '"Ahora no" quita el aviso');
    await p.reload(); await p.waitForSelector('.portada-progreso');
    comprobar(await p.locator('.aviso-instalar').count() === 0, 'descartado: no vuelve al recargar');
    await p.locator('#boton-mas').click();
    comprobar(await p.getByRole('button', { name: 'Instalar la app' }).count() === 1, 'la entrada de ⋯ sigue');
    await ctx.close();
  }

  // 2. Con el evento del navegador (simulado): el botón abre su instalación y, aceptada, todo desaparece.
  {
    const { ctx, p } = await abrir(b, { viewport: { width: 1366, height: 800 } }, estado(true));
    p.on('pageerror', (e) => errores.push('nativa: ' + e.message));
    await p.evaluate(() => {
      const e = new Event('beforeinstallprompt');
      window.__llamadas = 0;
      e.prompt = () => { window.__llamadas++; return Promise.resolve(); };
      e.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });
    await p.locator('#boton-mas').click();
    await p.getByRole('button', { name: 'Instalar la app' }).click();
    await p.waitForTimeout(300);
    comprobar(await p.evaluate(() => window.__llamadas) === 1, 'Chrome/Edge: el botón abre la instalación del navegador');
    comprobar(await p.locator('dialog[open]').count() === 0, 'sin diálogo de pasos');
    comprobar(await p.locator('.aviso-instalar').count() === 0, 'instalada: el aviso de la portada desaparece');
    await p.locator('#boton-mas').click();
    comprobar(await p.getByRole('button', { name: 'Instalar la app' }).count() === 0, 'instalada: ⋯ ya no la ofrece');
    await ctx.close();
  }

  // 3. iPhone: pasos de Safari.
  {
    const { ctx, p } = await abrir(b, devices['iPhone 13'], estado(true));
    p.on('pageerror', (e) => errores.push('iphone: ' + e.message));
    await p.screenshot({ path: `${out}/movil-aviso-instalar.png`, fullPage: true });
    await p.locator('.aviso-instalar').getByRole('button', { name: 'Instalar' }).tap();
    const texto = await p.locator('dialog[open]').innerText();
    comprobar(texto.includes('Compartir') && texto.includes('Añadir a pantalla de inicio') && !texto.includes('Android'), 'iPhone: los pasos de Safari');
    await p.screenshot({ path: `${out}/movil-instalar-ios.png` });
    await ctx.close();
  }

  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log(fallosPrueba ? `${fallosPrueba} comprobaciones fallidas` : 'todas las comprobaciones bien');
  await b.close();
  process.exit(fallosPrueba || errores.length ? 1 : 0);
})();

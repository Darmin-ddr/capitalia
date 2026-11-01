// Prueba de O3: funciona sin conexión (service worker) y la copia de seguridad por código.
// Uso: node scripts/prueba-pwa.cjs <carpeta-capturas>   (con el preview en el puerto 4173)
const { chromium, devices } = require('playwright');
const empezarHoy = async (p) => { const e = p.locator('.contenido-modo .acciones .boton-principal', { hasText: 'Empezar' }); if (await e.count()) { await e.click(); await p.waitForTimeout(200); } };
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  await p.addInitScript(() => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', JSON.stringify({ version: 1, tarjetas: {}, guiaVista: true })); }); await p.goto('http://localhost:4173/');
  await p.waitForSelector('.pais');
  // Esperar a que el service worker controle la página.
  await p.evaluate(async () => { await navigator.serviceWorker.ready; });
  await p.reload(); await p.waitForSelector('.pais');
  console.log('controlada por SW:', await p.evaluate(() => !!navigator.serviceWorker.controller));
  await empezarHoy(p);
  // Responder 3 preguntas para tener progreso.
  for (let i = 0; i < 3; i++) {
    await p.locator('.opcion').first().tap();
    await p.waitForTimeout(200);
    const sig = p.locator('.feedback .boton-principal');
    if (await sig.count()) await sig.tap();
    await p.waitForTimeout(1500);
  }
  const antes = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('progreso-capitales')).tarjetas).length);
  console.log('tarjetas antes:', antes);
  // Sin conexión: recargar debe funcionar.
  await ctx.setOffline(true);
  await p.reload(); await p.waitForSelector('.pais', { timeout: 10000 });
  console.log('sin conexión: mapa con', await p.locator('path.pais.jugable').count(), 'países jugables');
  await p.screenshot({ path: `${out}/o3-sin-conexion.png` });
  await ctx.setOffline(false);
  // Exportar código, borrar progreso, importar.
  await p.locator('#boton-mas').tap();
  await p.getByRole('button', { name: 'Copiar código' }).tap();
  await p.waitForTimeout(300);
  const codigo = await p.locator('.campo-codigo').inputValue();
  console.log('código:', codigo.slice(0, 24) + '…', codigo.length, 'caracteres |', await p.locator('.mensaje-copia').innerText());
  await p.screenshot({ path: `${out}/o3-mas.png` });
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForSelector('.pais');
  console.log('tarjetas tras borrar:', await p.evaluate(() => localStorage.getItem('progreso-capitales')) ? 'hay' : 0);
  await p.locator('#boton-mas').tap();
  await p.locator('.campo-codigo').fill(codigo);
  p.once('dialog', (d) => d.accept());
  await Promise.all([p.waitForEvent('load'), p.getByRole('button', { name: 'Importar código' }).tap()]);
  await p.waitForSelector('.pais');
  const despues = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('progreso-capitales')).tarjetas).length);
  console.log('tarjetas tras importar:', despues);
  console.log('errores:', errores);
  await b.close();
})();

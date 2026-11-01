// Prueba de O1: repaso, guardado del progreso y colores del mapa.
// Uso: node scripts/prueba-progreso.cjs <carpeta-capturas>  (con el preview en el puerto 4173)
const { chromium, devices } = require('playwright');
// Empezar en los Balcanes: una lista de examen con sus países desbloquea la región.
const ESTADO_BALCANES = JSON.stringify({ version: 1, tarjetas: {}, historial: [], trucosPropios: {}, regionesCelebradas: [],
  ultimaRegion: 'balcanes', ajustes: { opcionalesActivados: [], listaExamen: ['ALB','BIH','BGR','HRV','SVN','GRC','MKD','MNE','SRB'],
  fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null } });
const empezarEnBalcanes = (ctx) => ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO_BALCANES);

const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(devices['iPad (gen 7) landscape']);
  await empezarEnBalcanes(ctx);
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  await p.goto('http://localhost:4173/');
  await p.waitForSelector('.pais');
  // Responder siempre la primera opción: unas veces acierta y otras falla, y así se ve la cola en acción.
  let pasos = 0;
  while (!(await p.locator('.resumen').count()) && pasos++ < 60) {
    const sig = p.locator('.feedback .boton-principal');
    if (await sig.count()) { await sig.tap(); await p.waitForTimeout(60); continue; }
    const opciones = p.locator('.opcion-texto');
    if (await opciones.count()) { await opciones.first().tap(); await p.waitForTimeout(80); continue; }
    await p.waitForTimeout(100);
  }
  const guardado = await p.evaluate(() => JSON.parse(localStorage.getItem('progreso-capitales') || 'null'));
  console.log('tarjetas guardadas:', Object.keys(guardado?.tarjetas ?? {}).length, '| respuestas:', guardado?.historial?.length);
  console.log('resumen:', await p.locator('.resumen').innerText().catch(() => 'NO'));
  await p.screenshot({ path: `${out}/o1-resumen.png` });
  await p.reload();
  await p.waitForSelector('.pais');
  const niveles = await p.locator('.pais[class*="nivel-"]').count();
  console.log('países coloreados tras recargar:', niveles);
  await p.screenshot({ path: `${out}/o1-recarga.png` });
  // Explorar + truco propio
  await p.locator('.modo[data-modo="explorar"]').tap();
  await p.locator('.pais[data-id="HRV"]').dispatchEvent('click');
  await p.getByRole('button', { name: 'Inventa tu truco' }).tap();
  await p.locator('.campo-truco').fill('Zagreb: la Z de zigzag por la costa croata');
  await p.getByRole('button', { name: 'Guardar' }).tap();
  console.log('truco propio:', (await p.locator('.truco').innerText()).replace(/\n/g, ' | '));
  await p.reload(); await p.waitForSelector('.pais');
  const propio = await p.evaluate(() => JSON.parse(localStorage.getItem('progreso-capitales')).trucosPropios);
  console.log('truco propio guardado:', JSON.stringify(propio));
  console.log('errores:', errores);
  await b.close();
})();

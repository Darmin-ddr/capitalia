// Prueba de O2: todas las regiones (con progreso simulado para desbloquearlas),
// encuadre del mapa, microestados y una ronda de "Al revés" por región.
// Uso: node scripts/prueba-regiones.cjs <carpeta-capturas> [movil]
const { chromium, devices } = require('playwright');
const path = require('path');
const datos = require(path.join(__dirname, '../src/data/countries.json'));
const regiones = require(path.join(__dirname, '../src/data/regions.json'));
const out = process.argv[2];
const perfil = process.argv[3] === 'movil' ? devices['iPhone 13'] : devices['iPad (gen 7) landscape'];
const ahora = new Date();
const tarjetas = {};
for (const p of datos.paises) {
  tarjetas[p.id] = { due: new Date(ahora.getTime() + 3 * 864e5).toISOString(), stability: 3, difficulty: 5, elapsed_days: 1,
    scheduled_days: 3, reps: 3, lapses: 0, learning_steps: 0, state: 2, last_review: ahora.toISOString() };
}
const estado = { version: 1, tarjetas, historial: [], trucosPropios: {}, regionesCelebradas: [], ultimaRegion: null,
  ajustes: { opcionalesActivados: [], listaExamen: null, fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null } };
const enRegion = (p, r) => !p.opcional && (p.region === r || (p.regionesExtra || []).includes(r));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(perfil);
  await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, JSON.stringify(estado));
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  await p.goto('http://localhost:4173/');
  await p.waitForSelector('.pais');
  const sufijo = process.argv[3] === 'movil' ? '-movil' : '';
  for (const r of regiones) {
    await p.locator('#region-actual').click();
    await p.locator('.region-item', { hasText: r.nombre }).click();
    await p.waitForTimeout(300);
    const esperados = datos.paises.filter((x) => enRegion(x, r.id)).map((x) => x.id);
    const jugables = await p.locator('path.pais.jugable').evaluateAll((els) => [...new Set(els.map((e) => e.dataset.id))]);
    const faltan = esperados.filter((id) => !jugables.includes(id));
    const circulos = await p.locator('.microestado.jugable').evaluateAll((els) => els.map((e) => e.dataset.id));
    // Al revés: responder bien 3 preguntas tocando el país correcto.
    await p.locator('.modo[data-modo="practicar"]').click();
    await p.locator('.selector-opcion[data-modo="alreves"]').click();
    let bien = 0;
    for (let i = 0; i < 3; i++) {
      const cap = (await p.locator('.nombre-capital').innerText()).replace('★', '').trim();
      const id = datos.paises.find((x) => x.capital === cap && enRegion(x, r.id)).id;
      const objetivo = (await p.locator(`.microestado.jugable[data-id="${id}"]`).count())
        ? p.locator(`.microestado.jugable[data-id="${id}"]`) : p.locator(`path.pais.jugable[data-id="${id}"]`);
      await objetivo.first().dispatchEvent('click');
      await p.waitForTimeout(150);
      if ((await p.locator('.feedback.acierto').count())) bien++;
      await p.waitForTimeout(1400);
    }
    await p.locator('.modo[data-modo="explorar"]').click();
    await p.screenshot({ path: `${out}/region-${r.id}${sufijo}.png` });
    console.log(r.id.padEnd(20), `jugables ${jugables.length}/${esperados.length}`, faltan.length ? `FALTAN ${faltan}` : '',
      circulos.length ? `círculos: ${circulos}` : '', `| al revés bien ${bien}/3`);
  }
  console.log('errores:', errores);
  await b.close();
})();

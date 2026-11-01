const { chromium, devices } = require('playwright');
// Empezar en los Balcanes: una lista de examen con sus países desbloquea la región.
const ESTADO_BALCANES = JSON.stringify({ version: 1, tarjetas: {}, historial: [], trucosPropios: {}, regionesCelebradas: [],
  ultimaRegion: 'balcanes', guiaVista: true, ajustes: { opcionalesActivados: [], listaExamen: ['ALB','BIH','BGR','HRV','SVN','GRC','MKD','MNE','SRB'],
  fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null } });
const empezarEnBalcanes = (ctx) => ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO_BALCANES);

const out = process.argv[2];
const CAP = { ALB:'Tirana',BIH:'Sarajevo',BGR:'Sofía',HRV:'Zagreb',SVN:'Liubliana',GRC:'Atenas',MKD:'Skopie',MNE:'Podgorica',SRB:'Belgrado' };
const ID_DE = Object.fromEntries(Object.entries(CAP).map(([k, v]) => [v, k]));
const ERRATA = { ALB:'Tirnaa',BIH:'Sarajebo',BGR:'Sofai',HRV:'Zagerb',SVN:'Liubiana',GRC:'Atensa',MKD:'Skopje',MNE:'Titogrado',SRB:'Belgardo' };
(async () => {
  const b = await chromium.launch();
  const errores = [];
  for (const [nombre, o] of [['movil', devices['iPhone 13']], ['ipad-h', devices['iPad (gen 7) landscape']], ['pc', { viewport: { width: 1366, height: 800 } }]]) {
    const ctx = await b.newContext(o); await empezarEnBalcanes(ctx); const p = await ctx.newPage();
    const tap = o.hasTouch ? 'tap' : 'click';
    p.on('pageerror', (e) => errores.push(nombre + ': ' + e.message));
    await p.addInitScript(() => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', JSON.stringify({ version: 1, tarjetas: {}, guiaVista: true })); }); await p.goto('http://localhost:4173/'); await p.waitForSelector('.pais');
    await p.locator('.modo[data-modo="practicar"]')[tap]();

    // ---- Colocar ----
    await p.locator('.selector-opcion[data-modo="colocar"]')[tap]();
    let fallado = false, recuperado = false, pasos = 0;
    while (!(await p.locator('.resumen').count()) && pasos++ < 40) {
      const chips = p.locator('.chip-capital');
      if (!(await chips.count())) { await p.waitForTimeout(300); continue; }
      const cap = await chips.first().innerText();
      const id = ID_DE[cap];
      await chips.first()[tap]();
      if (!fallado) {
        const otro = Object.keys(CAP).find((k) => k !== id);
        await p.locator(`.pais[data-id="${otro}"]`).dispatchEvent('click');
        fallado = true; await p.waitForTimeout(400);
        await p.screenshot({ path: `${out}/${nombre}-colocar-fallo.png` });
        console.log(nombre, 'colocar fallo:', (await p.locator('.feedback').innerText()).replace(/\n+/g, ' | '));
        continue;
      }
      await p.locator(`.pais[data-id="${id}"]`).dispatchEvent('click');
      await p.waitForTimeout(120);
      if ((await p.locator('.feedback-titulo').innerText().catch(() => '')).includes('Ahora sí')) recuperado = true;
      if (pasos === 4) await p.screenshot({ path: `${out}/${nombre}-colocar-medio.png` });
    }
    await p.waitForTimeout(200);
    console.log(nombre, 'colocar recuperado:', recuperado, '| resumen:', await p.locator('.resumen').innerText().catch(() => 'NO'));

    // ---- Escribir ----
    await p.locator('.selector-opcion[data-modo="escribir"]')[tap]();
    const vistos = {};
    pasos = 0;
    while (!(await p.locator('.resumen').count()) && pasos++ < 40) {
      const sig = p.locator('.feedback .boton-principal');
      if (await sig.count()) { await sig[tap](); await p.waitForTimeout(80); continue; }
      const id = await p.locator('path.pais.objetivo').getAttribute('data-id');
      vistos[id] = (vistos[id] || 0) + 1;
      let texto;
      if (vistos[id] === 1 && id === 'MNE') texto = 'titogrado';
      else if (vistos[id] === 1 && ['SVN', 'SRB'].includes(id)) texto = ERRATA[id];
      else if (vistos[id] === 1 && id === 'HRV') texto = 'Belgrado';
      else texto = CAP[id].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      await p.locator('.campo-texto').fill(texto);
      await p.keyboard.press('Enter');
      await p.waitForTimeout(120);
      const fb = (await p.locator('.feedback').innerText()).replace(/\n+/g, ' | ');
      if (vistos[id] === 1 && ['MNE', 'SVN', 'HRV'].includes(id)) {
        console.log(nombre, 'escribir', id, JSON.stringify(texto), '->', fb);
        await p.screenshot({ path: `${out}/${nombre}-escribir-${id}.png` });
      }
    }
    console.log(nombre, 'escribir resumen:', await p.locator('.resumen').innerText().catch(() => 'NO'), JSON.stringify(vistos));

    // ---- Al revés ----
    await p.locator('.selector-opcion[data-modo="alreves"]')[tap]();
    pasos = 0; let primero = true;
    while (!(await p.locator('.resumen').count()) && pasos++ < 40) {
      const sig = p.locator('.feedback .boton-principal');
      if (await sig.count()) { await sig[tap](); await p.waitForTimeout(80); continue; }
      const cap = (await p.locator('.nombre-capital').innerText()).replace('★', '').trim();
      const id = ID_DE[cap];
      const destino = primero ? Object.keys(CAP).find((k) => k !== id) : id;
      await p.locator(`.pais[data-id="${destino}"]`).dispatchEvent('click');
      await p.waitForTimeout(400);
      if (primero) { await p.screenshot({ path: `${out}/${nombre}-alreves-fallo.png` }); console.log(nombre, 'alreves fallo:', (await p.locator('.feedback').innerText()).replace(/\n+/g, ' | ')); primero = false; }
    }
    console.log(nombre, 'alreves resumen:', await p.locator('.resumen').innerText().catch(() => 'NO'));
    await ctx.close();
  }
  console.log('errores:', errores);
  await b.close();
})();

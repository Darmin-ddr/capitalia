// Prueba de la pestaña Aprender (plan v2, F2): escalones, Colocar por tandas y mapa mudo.
// Uso: node scripts/prueba-aprender.cjs <carpeta-capturas>   (con `npx vite preview --port 4173` en marcha)
const { chromium, devices } = require('playwright');
const path = require('path');
const paises = require(path.join(__dirname, '../src/data/countries.json')).paises;
const P = Object.fromEntries(paises.map((p) => [p.id, p]));
const ID_DE_CAPITAL = Object.fromEntries(paises.map((p) => [p.capital, p.id]));

// Balcanes con países en todos los escalones: ALB y MKD en Elegir, BIH y BGR en Colocar,
// HRV en Escribir, SVN y MNE en Mapa mudo, GRC y SRB aprendidos.
const ESTADO = JSON.stringify({
  version: 1, tarjetas: {}, historial: [], trucosPropios: {}, regionesCelebradas: [], ultimaRegion: 'balcanes',
  guiaVista: true, bienvenidaVista: true, prioridad: [],
  aprendizaje: {
    ALB: { escalon: 0, aciertos: 1, aprendido: false },
    BIH: { escalon: 1, aciertos: 0, aprendido: false }, BGR: { escalon: 1, aciertos: 1, aprendido: false },
    HRV: { escalon: 2, aciertos: 0, aprendido: false },
    SVN: { escalon: 3, aciertos: 1, aprendido: false }, MNE: { escalon: 3, aciertos: 0, aprendido: false },
    GRC: { escalon: 3, aciertos: 0, aprendido: true }, SRB: { escalon: 3, aciertos: 0, aprendido: true },
  },
  ajustes: { opcionalesActivados: [], listaExamen: null, fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null, todasDesbloqueadas: true, maxNuevos: 10 },
});

const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const errores = [];
  let fallosPrueba = 0;
  const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };
  for (const [nombre, o] of [['movil', devices['iPhone 13']], ['pc', { viewport: { width: 1366, height: 800 } }]]) {
    const ctx = await b.newContext(o);
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO);
    const p = await ctx.newPage();
    const tap = o.hasTouch ? 'tap' : 'click';
    p.on('pageerror', (e) => errores.push(nombre + ': ' + e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    await p.locator('.modo[data-modo="aprender"]')[tap]();
    await p.waitForSelector('.escalera');
    const cuentas = await p.locator('.escalon-cuenta').allInnerTexts();
    comprobar(cuentas.join(',') === '2,2,1,2,2', `${nombre}: escalera inicial ${cuentas.join(',')}`);
    await p.screenshot({ path: `${out}/${nombre}-aprender-inicio.png`, fullPage: false });
    await p.locator('.contenido-modo .acciones .boton-principal')[tap]();

    // --- Colocar (BIH y BGR): bien a la primera ---
    await p.waitForSelector('.chip-capital');
    comprobar((await p.locator('.chip-capital').count()) === 2, `${nombre}: Colocar con las 2 capitales de su escalón`);
    await p.screenshot({ path: `${out}/${nombre}-aprender-colocar.png` });
    for (let i = 0; i < 2; i++) {
      const chip = p.locator('.chip-capital').first();
      const id = ID_DE_CAPITAL[await chip.innerText()];
      await chip[tap]();
      await p.locator(`.pais[data-id="${id}"]`).first().dispatchEvent('click');
      await p.waitForTimeout(150);
    }
    await p.waitForTimeout(1600);

    // --- Preguntas sueltas: ALB, MKD (Elegir), HRV (Escribir), SVN y MNE (Mapa mudo) ---
    const vistos = {};
    let pasos = 0, capturaMudo = false, capturaMedio = false;
    while (!(await p.locator('.resumen-titulo').count()) && pasos++ < 40) {
      const sig = p.locator('.feedback .boton-principal');
      if (await sig.count()) { await sig[tap](); await p.waitForTimeout(100); continue; }
      const objetivo = await p.locator('path.pais.objetivo').first().getAttribute('data-id').catch(() => null);
      if (!objetivo) { await p.waitForTimeout(200); continue; }
      vistos[objetivo] = (vistos[objetivo] || 0) + 1;
      const pais = P[objetivo];
      if (await p.locator('.mapa-mudo-form').count()) {
        if (!capturaMudo) {
          capturaMudo = true;
          comprobar((await p.locator('.etiqueta-capital').count()) === 0, `${nombre}: mapa mudo sin nombre de capital`);
          comprobar((await p.locator('.estrella').count()) === 1, `${nombre}: mapa mudo con la estrella`);
          await p.screenshot({ path: `${out}/${nombre}-aprender-mapamudo.png` });
        }
        const campos = p.locator('.mapa-mudo-form .campo-texto');
        // SVN, la primera vez: solo el país (medio punto). MNE: bien con Enter para pasar de campo.
        if (objetivo === 'SVN' && vistos[objetivo] === 1) {
          await campos.nth(0).fill('eslovenia');
          await campos.nth(1).fill('Ljubliana mal');
          await p.locator('.mapa-mudo-form .boton-principal')[tap]();
          await p.waitForTimeout(150);
          const fb = await p.locator('.feedback').innerText();
          comprobar(fb.includes('Medio punto'), `${nombre}: medio punto → "${fb.split('\n')[0]}"`);
          if (!capturaMedio) { capturaMedio = true; await p.screenshot({ path: `${out}/${nombre}-aprender-medio.png` }); }
        } else {
          await campos.nth(0).fill(pais.nombre);
          if (nombre === 'pc') {
            await campos.nth(0).press('Enter');
            const foco = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'));
            comprobar(foco === 'Capital', `${nombre}: Enter en País pasa a Capital`);
            await p.keyboard.type(pais.capital);
            await p.keyboard.press('Enter');
          } else {
            await campos.nth(1).fill(pais.capital);
            await p.locator('.mapa-mudo-form .boton-principal')[tap]();
          }
          await p.waitForTimeout(150);
        }
        continue;
      }
      if (await p.locator('.opcion').count()) {
        const textos = await p.locator('.opcion-texto').allInnerTexts();
        await p.locator('.opcion').nth(textos.indexOf(pais.capital))[tap]();
        await p.waitForTimeout(1500);
        continue;
      }
      if (await p.locator('.respuesta-form .campo-texto').count()) {
        await p.locator('.respuesta-form .campo-texto').fill(pais.capital);
        await p.locator('.respuesta-form .boton-principal')[tap]();
        await p.waitForTimeout(1500);
        continue;
      }
      await p.waitForTimeout(200);
    }
    await p.waitForTimeout(300);
    const final = await p.locator('.contenido-modo').innerText();
    console.log(nombre, 'final:', final.split('\n').slice(0, 4).join(' | '));
    await p.screenshot({ path: `${out}/${nombre}-aprender-final.png` });
    const est = JSON.parse(await p.evaluate(() => localStorage.getItem('progreso-capitales')));
    const a = est.aprendizaje;
    comprobar(a.ALB.escalon === 1, `${nombre}: ALB sube a Colocar (${JSON.stringify(a.ALB)})`);
    comprobar(a.MKD.escalon === 0 && a.MKD.aciertos === 1, `${nombre}: MKD un acierto en Elegir (${JSON.stringify(a.MKD)})`);
    comprobar(a.BGR.escalon === 2 && a.BIH.aciertos === 1, `${nombre}: Colocar cuenta (BGR ${JSON.stringify(a.BGR)}, BIH ${JSON.stringify(a.BIH)})`);
    comprobar(a.HRV.escalon === 2 && a.HRV.aciertos === 1, `${nombre}: HRV un acierto en Escribir`);
    comprobar(!a.SVN.aprendido && a.SVN.aciertos <= 1, `${nombre}: SVN con medio punto no sube (${JSON.stringify(a.SVN)})`);
    comprobar(a.MNE.aciertos === 1, `${nombre}: MNE un acierto en Mapa mudo`);
    comprobar(final.includes('Suben de escalón') && final.includes('Albania (a Colocar)'), `${nombre}: el resumen dice quién sube`);
    await ctx.close();
  }

  // --- Holanda en Mapa mudo: vale con aviso, pero no cuenta para el escalón ---
  const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
  const est = JSON.parse(ESTADO);
  est.ultimaRegion = 'europa-occidental';
  est.aprendizaje = {};
  for (const p of paises.filter((x) => x.region === 'europa-occidental')) est.aprendizaje[p.id] = { escalon: 0, aciertos: 0, aprendido: true };
  est.aprendizaje.NLD = { escalon: 3, aciertos: 1, aprendido: false };
  await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, JSON.stringify(est));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errores.push('holanda: ' + e.message));
  await p.goto('http://localhost:4173/');
  await p.waitForSelector('.pais');
  await p.locator('.modo[data-modo="aprender"]').click();
  await p.locator('.contenido-modo .acciones .boton-principal').click();
  await p.waitForSelector('.mapa-mudo-form');
  await p.locator('.mapa-mudo-form .campo-texto').nth(0).fill('holanda');
  await p.locator('.mapa-mudo-form .campo-texto').nth(1).fill('amsterdam');
  await p.locator('.mapa-mudo-form .boton-principal').click();
  await p.waitForTimeout(200);
  const fb = await p.locator('.feedback').innerText();
  comprobar(fb.includes('Países Bajos'), `holanda: aviso → "${fb.replace(/\n+/g, ' | ')}"`);
  await p.screenshot({ path: `${out}/pc-aprender-holanda.png` });
  const despues = JSON.parse(await p.evaluate(() => localStorage.getItem('progreso-capitales')));
  comprobar(!despues.aprendizaje.NLD.aprendido && despues.aprendizaje.NLD.aciertos === 1, `holanda: no cuenta para subir (${JSON.stringify(despues.aprendizaje.NLD)})`);
  await ctx.close();

  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log(fallosPrueba ? `${fallosPrueba} comprobaciones fallidas` : 'todas las comprobaciones bien');
  await b.close();
  process.exit(fallosPrueba || errores.length ? 1 : 0);
})();

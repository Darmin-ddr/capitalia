// Prueba de la pestaña Examen (plan v2, F4): mapa mudo del continente, nota con medio punto y fallos a Hoy.
// Uso: node scripts/prueba-examen.cjs <carpeta-capturas>   (con `npx vite preview --port 4173` en marcha)
const { chromium, devices } = require('playwright');
const path = require('path');
const paises = require(path.join(__dirname, '../src/data/countries.json')).paises;
const P = Object.fromEntries(paises.map((p) => [p.id, p]));

const ESTADO = JSON.stringify({
  version: 1, tarjetas: {}, historial: [], trucosPropios: {}, regionesCelebradas: [], ultimaRegion: 'balcanes',
  guiaVista: true, bienvenidaVista: true, prioridad: [], aprendizaje: {},
  ajustes: { opcionalesActivados: [], listaExamen: ['FRA', 'DEU', 'JPN'], fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null, todasDesbloqueadas: true, maxNuevos: 10 },
});

const out = process.argv[2] || '.';
let fallosPrueba = 0;
const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };

(async () => {
  const b = await chromium.launch();
  const errores = [];
  for (const [nombre, o] of [['movil', devices['iPhone 13']], ['pc', { viewport: { width: 1366, height: 800 } }]]) {
    const ctx = await b.newContext(o);
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO);
    const p = await ctx.newPage();
    const tap = o.hasTouch ? 'tap' : 'click';
    p.on('pageerror', (e) => errores.push(nombre + ': ' + e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    await p.locator('.modo[data-modo="examen"]')[tap]();
    await p.waitForSelector('text=Empezar examen');
    comprobar(await p.locator('.selector-opcion', { hasText: 'Lista del examen' }).count() === 1, `${nombre}: con lista en el panel, se puede elegir`);
    await p.locator('.selector-opcion', { hasText: 'Europa' }).first()[tap]();
    await p.locator('.selector-opcion', { hasText: /^10$/ })[tap]();
    await p.screenshot({ path: `${out}/${nombre}-examen-inicio.png` });
    await p.locator('text=Empezar examen')[tap]();
    await p.waitForSelector('.mapa-mudo-form');
    comprobar(await p.locator('#region-actual').isHidden(), `${nombre}: sin selector de región durante el examen`);
    comprobar((await p.locator('.estrella-fondo').count()) === 45 && (await p.locator('.estrella.activa').count()) === 1, `${nombre}: 46 estrellas, una resaltada (${await p.locator('.estrella-fondo').count()} de fondo)`);
    comprobar((await p.locator('.etiqueta-capital').count()) === 0, `${nombre}: sin nombres de capital`);
    await p.screenshot({ path: `${out}/${nombre}-examen-pregunta.png` });
    // 6 completas, 2 medias (solo el país), 2 en blanco → 7
    for (let i = 0; i < 10; i++) {
      const id = await p.locator('.capa-capital g').first().getAttribute('data-id');
      const c = p.locator('.mapa-mudo-form .campo-texto');
      if (i < 6) { await c.nth(0).fill(P[id].nombre); await c.nth(1).fill(P[id].capital); }
      else if (i < 8) { await c.nth(0).fill(P[id].nombre); await c.nth(1).fill('nada'); }
      await p.locator('.mapa-mudo-form .boton-principal')[tap]();
      await p.waitForTimeout(80);
      if (i < 9) comprobar(!(await p.locator('.feedback').count()) && !(await p.locator('.pais.nivel-1, .pais.nivel-2, .pais.nivel-3, .pais.acierto, .pais.fallo').count()), `${nombre}: sin corrección en el momento ni colores (${i + 1})`);
    }
    await p.waitForSelector('.nota-examen');
    const nota = await p.locator('.nota-examen').innerText();
    comprobar(nota.includes('7'), `${nombre}: nota → ${nota}`);
    comprobar((await p.locator('.lista-fallos li').count()) === 4, `${nombre}: 4 para repasar`);
    await p.screenshot({ path: `${out}/${nombre}-examen-nota.png`, fullPage: true });
    await p.locator('text=Repasarlos antes en Hoy')[tap]();
    const est = JSON.parse(await p.evaluate(() => localStorage.getItem('progreso-capitales')));
    comprobar(est.prioridad.length === 4, `${nombre}: 4 priorizados para Hoy`);
    comprobar(est.historial.filter((h) => h.examen).length === 10 && Object.keys(est.tarjetas).length === 10, `${nombre}: las 10 respuestas cuentan para los repasos`);
    comprobar(Object.keys(est.aprendizaje).length === 0, `${nombre}: el examen no mueve escalones`);
    await p.locator('.modo[data-modo="hoy"]')[tap]();
    await p.waitForTimeout(300);
    comprobar(await p.locator('#region-actual').isVisible(), `${nombre}: al salir vuelve el selector de región`);
    comprobar((await p.locator('.estrella-fondo').count()) === 0, `${nombre}: y el mapa de la región`);
    // Las pestañas caben en una fila.
    const cabe = await p.evaluate(() => {
      const n = document.querySelector('.modos');
      const mas = document.querySelector('#boton-mas').getBoundingClientRect();
      return n.scrollWidth <= n.clientWidth + 1 && mas.right <= innerWidth;
    });
    comprobar(cabe, `${nombre}: las cuatro pestañas caben`);
    await ctx.close();
  }

  // Móvil estrecho (360 px): las pestañas siguen cabiendo.
  {
    const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO);
    const p = await ctx.newPage();
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    const medidas = await p.evaluate(() => {
      const n = document.querySelector('.modos');
      const mas = document.querySelector('#boton-mas').getBoundingClientRect();
      const anchos = [...document.querySelectorAll('.modo')].map((m) => Math.round(m.getBoundingClientRect().height));
      return [n.scrollWidth, n.clientWidth, Math.round(mas.right), innerWidth, Math.min(...anchos), Math.round(mas.width)];
    });
    comprobar(medidas[0] <= medidas[1] + 1 && medidas[2] <= medidas[3] && medidas[4] >= 44 && medidas[5] >= 44, `360px: pestañas y ⋯ caben, 44 px (${medidas.join(', ')})`);
    await p.screenshot({ path: `${out}/movil360-pestanas.png` });
    await ctx.close();
  }

  // Lista con microestados: país sombreado y mapa acercado si es pequeño (Vaticano junto a Roma).
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
    const est = JSON.parse(ESTADO);
    est.ajustes.listaExamen = ['VAT', 'SMR', 'FRA'];
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, JSON.stringify(est));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push('enfoque: ' + e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    await p.locator('.modo[data-modo="examen"]').click();
    await p.locator('.selector-opcion', { hasText: 'Lista del examen' }).click();
    await p.locator('text=Empezar examen').click();
    for (let i = 0; i < 3; i++) {
      await p.waitForSelector('.mapa-mudo-form');
      const id = await p.locator('.capa-capital g').first().getAttribute('data-id');
      const sombreados = await p.locator('.pais.objetivo').evaluateAll((els) => [...new Set(els.map((e) => e.dataset.id || e.closest('[data-id]')?.dataset.id))]);
      const escala = Number((await p.locator('.mapa-svg > g').getAttribute('transform')).match(/scale\(([\d.]+)\)/)[1]);
      const pequeno = id !== 'FRA';
      comprobar(sombreados.length === 1 && sombreados[0] === id && (pequeno ? escala > 1.5 : escala === 1), `enfoque ${id}: sombreado ${sombreados}, zoom ${escala}`);
      if (id === 'VAT') await p.screenshot({ path: `${out}/pc-examen-vaticano.png` });
      await p.locator('.mapa-mudo-form .boton-principal').click();
      await p.waitForTimeout(60);
    }
    await p.waitForSelector('.nota-examen');
    const escalaFinal = await p.locator('.mapa-svg > g').getAttribute('transform');
    comprobar(escalaFinal.includes('scale(1)'), `enfoque: al terminar, vista de todo el continente (${escalaFinal})`);
    await ctx.close();
  }

  // "Las dos": primero Europa y luego Asia, con rótulo al cambiar de continente.
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push('dos: ' + e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    await p.locator('.modo[data-modo="examen"]').click();
    await p.locator('.selector-opcion', { hasText: 'Las dos' }).click();
    await p.locator('.selector-opcion', { hasText: /^20$/ }).click();
    await p.locator('text=Empezar examen').click();
    const continentes = [];
    let rotulos = 0, habia = false;
    for (let i = 0; i < 20; i++) {
      await p.waitForSelector('.mapa-mudo-form');
      const hay = (await p.locator('.rotulo-region').count()) > 0;
      if (hay && !habia) { rotulos++; await p.screenshot({ path: `${out}/pc-examen-asia.png` }); }
      habia = hay;
      const id = await p.locator('.capa-capital g').first().getAttribute('data-id');
      continentes.push(P[id].continentes[0]);
      await p.locator('.mapa-mudo-form .boton-principal').click();
      await p.waitForTimeout(60);
    }
    const cambios = continentes.filter((c, i) => i > 0 && c !== continentes[i - 1]).length;
    comprobar(cambios <= 1 && continentes[0] === 'europa', `dos: Europa y luego Asia (${continentes.join(',')})`);
    comprobar(rotulos === (cambios ? 1 : 0), `dos: rótulo al pasar a Asia (${rotulos})`);
    const nota = await p.locator('.nota-examen').innerText();
    comprobar(nota.includes('0'), `dos: todo en blanco → ${nota}`);
    await ctx.close();
  }

  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log(fallosPrueba ? `${fallosPrueba} comprobaciones fallidas` : 'todas las comprobaciones bien');
  await b.close();
  process.exit(fallosPrueba || errores.length ? 1 : 0);
})();

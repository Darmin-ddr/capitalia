// Prueba de la pestaña Hoy (plan v2, F3): primer día con nuevos intercalados y sesión multirregión.
// Uso: node scripts/prueba-hoy.cjs <carpeta-capturas>   (con `npx vite preview --port 4173` en marcha)
const { chromium, devices } = require('playwright');
const path = require('path');
const paises = require(path.join(__dirname, '../src/data/countries.json')).paises;
const P = Object.fromEntries(paises.map((p) => [p.id, p]));
const ID_DE_CAPITAL = Object.fromEntries(paises.map((p) => [p.capital, p.id]));

const base = (extra) => JSON.stringify({
  version: 1, tarjetas: {}, historial: [], trucosPropios: {}, regionesCelebradas: [], ultimaRegion: null,
  guiaVista: true, bienvenidaVista: true, prioridad: [], aprendizaje: {},
  ajustes: { opcionalesActivados: [], listaExamen: null, fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null, todasDesbloqueadas: false, maxNuevos: 10 },
  ...extra,
});

/** Aprendidos con el repaso vencido en tres regiones distintas (Europa sur, Asia oriental, Golfo). */
function estadoMultirregion() {
  const hace = (d) => new Date(Date.now() - d * 864e5).toISOString();
  const ids = ['ESP', 'ITA', 'PRT', 'JPN', 'CHN', 'KOR', 'SAU', 'OMN', 'QAT'];
  const tarjetas = {}, aprendizaje = {};
  ids.forEach((id, i) => {
    tarjetas[id] = { due: hace(1 + i), stability: 3, difficulty: 5, elapsed_days: 3, scheduled_days: 3, reps: 4, lapses: 0, learning_steps: 0, state: 2, last_review: hace(5 + i) };
    aprendizaje[id] = { escalon: 3, aciertos: 0, aprendido: true };
  });
  return base({ tarjetas, aprendizaje, ultimaRegion: 'europa-sur', ajustes: { opcionalesActivados: [], listaExamen: null, fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null, todasDesbloqueadas: true, maxNuevos: 5 } });
}

const out = process.argv[2] || '.';
let fallosPrueba = 0;
const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };

/** Responde la pregunta en pantalla correctamente (o mal, si `mal`). Devuelve [paisId, modo] o null. */
async function responder(p, tap, mal = false) {
  const sig = p.locator('.feedback .boton-principal');
  if (await sig.count()) { await sig[tap](); await p.waitForTimeout(80); return 'siguiente'; }
  if (await p.locator('.nombre-capital').count()) {
    const cap = (await p.locator('.nombre-capital').innerText()).replace('★', '').trim();
    const id = ID_DE_CAPITAL[cap];
    const otro = mal ? (await p.locator('path.pais.tocable').evaluateAll((els, id) => els.map((e) => e.dataset.id).find((x) => x !== id), id)) : id;
    await p.locator(`.pais[data-id="${otro}"]`).first().dispatchEvent('click');
    return [id, 'alreves'];
  }
  if (await p.locator('.mapa-mudo-form').count()) {
    const id = await p.locator('.capa-capital g').first().getAttribute('data-id');
    const pais = P[id];
    const c = p.locator('.mapa-mudo-form .campo-texto');
    await c.nth(0).fill(mal ? 'nada' : pais.nombre);
    await c.nth(1).fill(mal ? 'nada' : pais.capital);
    await p.locator('.mapa-mudo-form .boton-principal')[tap]();
    return [id, 'mapamudo'];
  }
  const id = await p.locator('path.pais.objetivo').first().getAttribute('data-id').catch(() => null);
  if (!id) return null;
  const pais = P[id];
  if (await p.locator('.opcion').count()) {
    const textos = await p.locator('.opcion-texto').allInnerTexts();
    const i = mal ? textos.findIndex((t) => t !== pais.capital) : textos.indexOf(pais.capital);
    await p.locator('.opcion').nth(i)[tap]();
    return [id, 'elegir'];
  }
  if (await p.locator('.respuesta-form .campo-texto').count()) {
    await p.locator('.respuesta-form .campo-texto').fill(mal ? 'nada' : pais.capital);
    await p.locator('.respuesta-form .boton-principal')[tap]();
    return [id, 'escribir'];
  }
  return null;
}

(async () => {
  const b = await chromium.launch();
  const errores = [];

  // ---------- 1. Primer día: solo nuevos, cada uno dos veces y nunca seguidos ----------
  for (const [nombre, o] of [['movil', devices['iPhone 13']], ['pc', { viewport: { width: 1366, height: 800 } }]]) {
    const ctx = await b.newContext(o);
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, base({}));
    const p = await ctx.newPage();
    const tap = o.hasTouch ? 'tap' : 'click';
    p.on('pageerror', (e) => errores.push(nombre + ': ' + e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    comprobar((await p.locator('.modo[aria-pressed="true"]').innerText()) === 'Hoy', `${nombre}: arranca en Hoy`);
    await p.waitForSelector('.hoy-cuentas');
    const cuentas = await p.locator('.hoy-cuentas').innerText();
    comprobar(/\d+ nuevos/.test(cuentas), `${nombre}: inicio de Hoy → ${cuentas.replace(/\n/g, ' ')}`);
    await p.screenshot({ path: `${out}/${nombre}-hoy-inicio.png` });
    await p.locator('.contenido-modo .acciones .boton-principal')[tap]();
    const secuencia = [];
    let pasos = 0;
    while (!(await p.locator('.resumen-titulo').count()) && pasos++ < 80) {
      const r = await responder(p, tap);
      if (Array.isArray(r)) { secuencia.push(r); await p.waitForTimeout(1500); }
      else if (!r) await p.waitForTimeout(200);
    }
    const ids = secuencia.map((x) => x[0]);
    const veces = {};
    for (const id of ids) veces[id] = (veces[id] || 0) + 1;
    comprobar(Object.values(veces).every((v) => v === 2), `${nombre}: cada nuevo sale dos veces (${Object.keys(veces).length} países, ${ids.length} preguntas)`);
    comprobar(ids.every((id, i) => i === 0 || id !== ids[i - 1]), `${nombre}: nunca dos seguidas del mismo país`);
    const regionesUsadas = new Set(ids.map((id) => P[id].region));
    comprobar(regionesUsadas.size === 1 && regionesUsadas.has('europa-sur'), `${nombre}: los nuevos salen de la primera región (${[...regionesUsadas]})`);
    await p.screenshot({ path: `${out}/${nombre}-hoy-final.png` });
    const fin = await p.locator('.contenido-modo').innerText();
    comprobar(fin.includes('Hoy, hecho') || fin.toUpperCase().includes('HOY, HECHO'), `${nombre}: resumen final`);
    const est = JSON.parse(await p.evaluate(() => localStorage.getItem('progreso-capitales')));
    const subidos = Object.keys(veces).filter((id) => est.aprendizaje[id]?.escalon === 1);
    comprobar(subidos.length === Object.keys(veces).length, `${nombre}: dos aciertos en Elegir los suben a Colocar (${subidos.length})`);
    // Volver a Hoy el mismo día: no más nuevos; los empezados salen en su escalón (Colocar como Al revés).
    await p.locator('.modo[data-modo="aprender"]')[tap]();
    await p.locator('.modo[data-modo="hoy"]')[tap]();
    await p.waitForSelector('.titulo-panel');
    // Los empezados hoy esperan a mañana; los nuevos del día no pasan de 10.
    const segunda = (await p.locator('.hoy-cuentas').innerText().catch(() => '')).replace(/\n/g, ' ');
    const masNuevos = Number((segunda.match(/(\d+) nuevos/) || [0, 0])[1]);
    comprobar(!/aprendizaje/.test(segunda) && Object.keys(veces).length + masNuevos <= 10, `${nombre}: segunda sesión del día → "${segunda}"`);
    await ctx.close();
  }

  // ---------- 2. Multirregión: el mapa salta de región con rótulo ----------
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
    await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, estadoMultirregion());
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push('multi: ' + e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.hoy-cuentas');
    console.log('multi inicio:', (await p.locator('.hoy-cuentas').innerText()).replace(/\n/g, ' '));
    // Contar los rótulos de región que aparecen (un observador en la página no se pierde ninguno).
    await p.evaluate(() => {
      window.__rotulos = 0;
      new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('rotulo-region')) window.__rotulos++; })
        .observe(document.getElementById('mapa'), { childList: true });
    });
    await p.locator('.contenido-modo .acciones .boton-principal').click();
    const regionesVistas = [];
    let rotulos = 0, capturaRotulo = false, pasos = 0, falladoUno = false;
    const secuencia = [];
    while (!(await p.locator('.resumen-titulo').count()) && pasos++ < 80) {
      const rotulo = p.locator('.rotulo-region');
      if (await rotulo.count()) {
        if (!capturaRotulo) { capturaRotulo = true; await p.screenshot({ path: `${out}/pc-hoy-rotulo.png` }); }
        await p.waitForTimeout(1200);
      }
      const reg = (await p.locator('#region-actual').innerText()).replace('▾', '').trim();
      const mal = !falladoUno && secuencia.length === 4;
      const r = await responder(p, 'click', mal);
      if (Array.isArray(r)) {
        if (mal) { falladoUno = true; await p.waitForTimeout(300); await p.screenshot({ path: `${out}/pc-hoy-fallo.png` }); }
        secuencia.push(r);
        if (regionesVistas.at(-1) !== reg) regionesVistas.push(reg);
        await p.waitForTimeout(mal ? 200 : 1500);
      } else if (!r) await p.waitForTimeout(200);
    }
    rotulos = await p.evaluate(() => window.__rotulos);
    console.log('multi secuencia:', secuencia.map((x) => x.join(':')).join(' '));
    console.log('multi regiones:', regionesVistas.join(' → '));
    comprobar(regionesVistas.length === 3, `multi: tres regiones, una tras otra, también con un fallo (${regionesVistas.length})`);
    comprobar(rotulos === 3, `multi: rótulo de región en cada cambio, también el primero (${rotulos})`);
    const REPASOS = ['ESP', 'ITA', 'PRT', 'JPN', 'CHN', 'KOR', 'SAU', 'OMN', 'QAT'];
    const modos = new Set(secuencia.filter((x) => REPASOS.includes(x[0])).map((x) => x[1]));
    comprobar([...modos].every((m) => ['mapamudo', 'escribir', 'alreves'].includes(m)), `multi: aprendidos con preguntas variadas (${[...modos]})`);
    const ids = secuencia.map((x) => x[0]);
    comprobar(ids.length === 20, `multi: 9 repasos + 5 nuevos dos veces + 1 repetición del fallo (${ids.length})`);
    const est = JSON.parse(await p.evaluate(() => localStorage.getItem('progreso-capitales')));
    const tiempos = est.historial.map((h) => h.ms);
    comprobar(tiempos.every((t) => t >= 0 && t < 60000), `multi: tiempos razonables (${tiempos.join(', ')})`);
    await p.screenshot({ path: `${out}/pc-hoy-multi-final.png` });
    // Hecho lo de hoy: se ofrece repasar más.
    await p.locator('.modo[data-modo="explorar"]').click();
    await p.locator('.modo[data-modo="hoy"]').click();
    await p.waitForTimeout(300);
    const nada = await p.locator('.contenido-modo').innerText();
    comprobar(nada.includes('ya está hecho') && nada.includes('Repasar un poco más'), `multi: nada que hacer → ${nada.split('\n').slice(0, 3).join(' | ')}`);
    await p.screenshot({ path: `${out}/pc-hoy-hecho.png` });
    await ctx.close();
  }

  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log(fallosPrueba ? `${fallosPrueba} comprobaciones fallidas` : 'todas las comprobaciones bien');
  await b.close();
  process.exit(fallosPrueba || errores.length ? 1 : 0);
})();

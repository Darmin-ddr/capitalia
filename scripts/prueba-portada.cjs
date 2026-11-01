// Prueba de la portada de Hoy y de "Europa entera" / "Asia entera" (plan v2, F6).
// Uso: node scripts/prueba-portada.cjs <carpeta-capturas>   (con `npx vite preview --port 4173` en marcha)
const { chromium, devices } = require('playwright');
const path = require('path');
const paises = require(path.join(__dirname, '../src/data/countries.json')).paises;

const base = (extra = {}, ajustes = {}) => JSON.stringify({
  version: 1, tarjetas: {}, historial: [], trucosPropios: {}, regionesCelebradas: [], ultimaRegion: 'balcanes',
  guiaVista: true, bienvenidaVista: true, prioridad: [], aprendizaje: {},
  ...extra,
  ajustes: { opcionalesActivados: [], listaExamen: null, fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null, todasDesbloqueadas: false, maxNuevos: 10, ...ajustes },
});

/** Europa del sur y Balcanes aprendidos (dos de ellos esta semana) y lista de examen con fecha. */
function estadoConProgreso() {
  const aprendizaje = {};
  const hace = (d) => new Date(Date.now() - d * 864e5).toISOString();
  paises.filter((p) => ['europa-sur', 'balcanes'].includes(p.region)).forEach((p, i) => {
    aprendizaje[p.id] = { escalon: 3, aciertos: 0, aprendido: true, ...(i < 2 ? { aprendidoEl: hace(2) } : { aprendidoEl: hace(30) }) };
  });
  const fecha = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  return base({ aprendizaje }, { listaExamen: ['ESP', 'FRA', 'DEU', 'JPN'], fechaExamen: fecha });
}

const out = process.argv[2] || '.';
let fallosPrueba = 0;
const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };

async function abrir(b, perfil, estado) {
  const ctx = await b.newContext(perfil);
  await ctx.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, estado);
  const p = await ctx.newPage();
  await p.goto('http://localhost:4173/');
  await p.waitForSelector('.pais');
  return { ctx, p };
}

(async () => {
  const b = await chromium.launch();
  const errores = [];

  // 1. Portada con progreso, en móvil y PC.
  for (const [nombre, o] of [['movil', devices['iPhone 13']], ['pc', { viewport: { width: 1366, height: 800 } }]]) {
    const { ctx, p } = await abrir(b, o, estadoConProgreso());
    p.on('pageerror', (e) => errores.push(nombre + ': ' + e.message));
    const tap = o.hasTouch ? 'tap' : 'click';
    await p.waitForSelector('.portada-progreso');
    comprobar(await p.locator('#region-actual').isHidden(), `${nombre}: Hoy sin selector de región`);
    const texto = await p.locator('.portada-progreso').innerText();
    // Europa del sur y Balcanes: 17 países (Kosovo es opcional). En total, 93 (Rusia y Turquía cuentan una vez).
    const plano = texto.replace(/\s+/g, ' ');
    comprobar(plano.includes('17 de 93 países aprendidos'), `${nombre}: cifra total (17 de 93)`);
    comprobar(plano.includes('17/46') && plano.includes('0/49'), `${nombre}: barras Europa 17/46 y Asia 0/49`);
    comprobar(texto.includes('Esta semana: 2 países aprendidos'), `${nombre}: logros de la semana`);
    comprobar(/Examen \(faltan 5 días\): 1 de 4 países aprendidos/.test(texto), `${nombre}: examen del panel`);
    comprobar(!/racha/i.test(await p.locator('.contenido-modo').innerText()), `${nombre}: sin rachas`);
    const resumen = await p.locator('.contenido-modo .resumen').first().innerText();
    comprobar(/Hoy toca: \d+ preguntas, unos \d+ minutos/.test(resumen), `${nombre}: lo que toca → ${resumen}`);
    // El mapa de la portada es el continente que toca (Europa, aún sin terminar), coloreado.
    const jugables = await p.locator('path.pais.jugable').evaluateAll((els) => new Set(els.map((e) => e.dataset.id)).size);
    comprobar(jugables >= 40, `${nombre}: mapa de Europa entera (${jugables} países)`);
    comprobar((await p.locator('.pais.nivel-3').count()) >= 17, `${nombre}: los aprendidos, coloreados`);
    const circulos = await p.locator('.microestado').evaluateAll((els) => els.map((e) => e.dataset.id));
    comprobar(circulos.length <= 10, `${nombre}: en el mapa del continente, círculos solo para microestados (${circulos.join(',')})`);
    await p.screenshot({ path: `${out}/${nombre}-portada.png`, fullPage: nombre === 'movil' });
    await p.locator('.selector-mapa-portada .selector-opcion', { hasText: 'Asia' })[tap]();
    await p.waitForTimeout(300);
    const deAsia = await p.locator('path.pais.jugable[data-id="JPN"]').count();
    comprobar(deAsia > 0, `${nombre}: el selector de la portada cambia a Asia`);
    // Aprender vuelve a la región elegida (Balcanes, abierta porque tiene países empezados), no al continente de la portada.
    await p.locator('.modo[data-modo="aprender"]')[tap]();
    await p.waitForTimeout(300);
    comprobar((await p.locator('#region-actual').innerText()).includes('Balcanes'), `${nombre}: Aprender vuelve a la región elegida, no al continente de la portada`);
    await ctx.close();
  }

  // 2. Europa entera: bloqueada mientras no estén abiertas todas sus regiones.
  {
    const { ctx, p } = await abrir(b, { viewport: { width: 1366, height: 800 } }, base());
    p.on('pageerror', (e) => errores.push('bloqueada: ' + e.message));
    await p.locator('.modo[data-modo="aprender"]').click();
    await p.locator('#region-actual').click();
    const item = p.locator('.region-item.region-entera', { hasText: 'Europa entera' });
    comprobar(await item.isDisabled(), `Europa entera bloqueada al principio → ${(await item.innerText()).replace(/\n/g, ' | ')}`);
    await p.screenshot({ path: `${out}/pc-selector-bloqueado.png` });
    await ctx.close();
  }

  // 3. Con todas abiertas: Aprender en Europa entera, tandas de 16 y mapa del continente.
  for (const [nombre, o] of [['movil', devices['iPhone 13']], ['pc', { viewport: { width: 1366, height: 800 } }]]) {
    const { ctx, p } = await abrir(b, o, base({}, { todasDesbloqueadas: true }));
    p.on('pageerror', (e) => errores.push('entera ' + nombre + ': ' + e.message));
    const tap = o.hasTouch ? 'tap' : 'click';
    await p.locator('.modo[data-modo="aprender"]')[tap]();
    await p.locator('#region-actual')[tap]();
    await p.locator('.region-item.region-entera', { hasText: 'Europa entera' })[tap]();
    await p.waitForTimeout(400);
    comprobar((await p.locator('#region-actual').innerText()).includes('Europa entera'), `${nombre}: Europa entera elegida`);
    const cuentas = await p.locator('.escalon-cuenta').allInnerTexts();
    comprobar(cuentas[0] === '46', `${nombre}: escalera con los 46 países (${cuentas.join(',')})`);
    comprobar((await p.locator('.escalon-paises').first().innerText()).includes('más'), `${nombre}: nombres resumidos ("y N más")`);
    await p.screenshot({ path: `${out}/${nombre}-europa-entera.png` });
    await p.locator('.contenido-modo .acciones .boton-principal')[tap]();
    await p.waitForSelector('.progreso');
    const prog = await p.locator('.progreso').first().innerText();
    comprobar(/de 16$/.test(prog.trim()), `${nombre}: tanda de 16 → "${prog}"`);
    // Recordada al recargar; Hoy no la usa como mapa de las preguntas.
    await p.reload(); await p.waitForSelector('.pais');
    await p.locator('.modo[data-modo="aprender"]')[tap]();
    comprobar((await p.locator('#region-actual').innerText()).includes('Europa entera'), `${nombre}: se recuerda al recargar`);
    await p.locator('.modo[data-modo="hoy"]')[tap]();
    await p.locator('.contenido-modo .acciones .boton-principal', { hasText: 'Empezar' })[tap]();
    await p.waitForTimeout(1500);
    const reg = (await p.locator('#region-actual').innerText()).replace('▾', '').trim();
    comprobar(!reg.includes('entera'), `${nombre}: las preguntas de Hoy van en el mapa de su región (${reg})`);
    await ctx.close();
  }

  // 4. "Qué estudia Hoy": solo Asia (Europa en pausa), con confirmación y aviso; Volver a Todo.
  for (const [nombre, o] of [['movil', devices['iPhone 13']], ['pc', { viewport: { width: 1366, height: 800 } }]]) {
    const { ctx, p } = await abrir(b, o, estadoConProgreso());
    p.on('pageerror', (e) => errores.push('foco ' + nombre + ': ' + e.message));
    const tap = o.hasTouch ? 'tap' : 'click';
    await p.waitForSelector('.selector-foco');
    await p.locator('.selector-foco .selector-opcion', { hasText: 'Solo Asia' })[tap]();
    const confirmar = await p.locator('.confirmar-foco').innerText();
    comprobar(confirmar.includes('Europa quedará en pausa') && confirmar.includes('No se pierde nada'), `${nombre}: confirmación con el efecto escrito`);
    comprobar(await p.locator('.aviso-pausa').count() === 0, `${nombre}: sin confirmar, aún no cambia nada`);
    await p.screenshot({ path: `${out}/${nombre}-foco-confirmar.png`, fullPage: nombre === 'movil' });
    await p.getByRole('button', { name: 'Sí, solo Asia' })[tap]();
    await p.waitForSelector('.aviso-pausa');
    const aviso = await p.locator('.aviso-pausa').innerText();
    comprobar(aviso.includes('Solo Asia') && aviso.includes('Europa: en pausa'), `${nombre}: aviso fijo → ${aviso.split('\n')[0]}`);
    comprobar((await p.locator('.fila-continente.pausada').innerText()).includes('en pausa'), `${nombre}: la barra de Europa dice "en pausa"`);
    comprobar((await p.locator('path.pais.jugable[data-id="JPN"]').count()) > 0, `${nombre}: el mapa de la portada es Asia`);
    await p.screenshot({ path: `${out}/${nombre}-foco-asia.png`, fullPage: nombre === 'movil' });
    // Las preguntas de Hoy son todas de Asia (Rusia y Turquía cuentan como de los dos).
    await p.locator('.contenido-modo .acciones .boton-principal', { hasText: 'Empezar' })[tap]();
    const continentes = new Set();
    for (let i = 0; i < 4; i++) {
      await p.waitForTimeout(1300);
      const id = (await p.locator('.capa-capital g').first().getAttribute('data-id').catch(() => null))
        ?? (await p.locator('path.pais.objetivo').first().getAttribute('data-id').catch(() => null));
      if (id) continentes.add(paises.find((x) => x.id === id).continentes.join('+'));
      const opcion = p.locator('.opcion');
      if (await opcion.count()) await opcion.first()[tap]();
      const sig = p.locator('.feedback .boton-principal');
      await p.waitForTimeout(300);
      if (await sig.count()) await sig[tap]();
    }
    // Empieza por Asia oriental (Rusia y Turquía, de región principal europea, van al final).
    comprobar(continentes.size > 0 && [...continentes].every((c) => c === 'asia'), `${nombre}: las preguntas de Hoy son de Asia, empezando por Asia oriental (${[...continentes]})`);
    // Se recuerda, el Examen propone Asia y el panel lo dice.
    await p.reload(); await p.waitForSelector('.portada-progreso');
    comprobar(await p.locator('.aviso-pausa').count() === 1, `${nombre}: se recuerda al recargar`);
    await p.locator('.modo[data-modo="examen"]')[tap]();
    comprobar((await p.locator('.selector-opcion[aria-pressed="true"]').first().innerText()) === 'Asia', `${nombre}: el Examen propone Asia`);
    await p.locator('.modo[data-modo="hoy"]')[tap]();
    await p.locator('.aviso-pausa').getByRole('button', { name: 'Volver a Todo' })[tap]();
    await p.waitForTimeout(300);
    comprobar(await p.locator('.aviso-pausa').count() === 0, `${nombre}: "Volver a Todo" quita la pausa en un toque`);
    await ctx.close();
  }

  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log(fallosPrueba ? `${fallosPrueba} comprobaciones fallidas` : 'todas las comprobaciones bien');
  await b.close();
  process.exit(fallosPrueba || errores.length ? 1 : 0);
})();

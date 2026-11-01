// Accesibilidad básica: (1) objetivos táctiles de 44 px como mínimo en todas las pantallas,
// (2) uso completo con teclado en PC. Uso: node scripts/prueba-accesibilidad.cjs
const { chromium, devices } = require('playwright');
// Europa del sur con países en Colocar, Escribir y Mapa mudo, para medir todas las pantallas de Aprender.
const ESTADO = JSON.stringify({ version: 1, tarjetas: {}, guiaVista: true, bienvenidaVista: true,
  aprendizaje: { ESP: { escalon: 1, aciertos: 0, aprendido: false }, PRT: { escalon: 1, aciertos: 0, aprendido: false },
    ITA: { escalon: 2, aciertos: 0, aprendido: false }, MLT: { escalon: 3, aciertos: 0, aprendido: false } } });
const empezarHoy = async (p) => { const e = p.locator('.contenido-modo .acciones .boton-principal', { hasText: 'Empezar' }); if (await e.count()) { await e.click(); await p.waitForTimeout(200); } };

// Mide los elementos interactivos visibles más pequeños de 44 px (los países del mapa
// tienen el tamaño de su geografía y los diminutos llevan su círculo de 44 px aparte).
async function medir(p, pantalla, fallos) {
  const pequenos = await p.evaluate(() => {
    const sel = 'button, input:not([type=checkbox]):not([type=file]), select, textarea, a[href], summary, label.casilla, .microestado.jugable .toque';
    return [...document.querySelectorAll(sel)]
      .filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden]') && !e.closest('dialog:not([open])'); })
      .map((e) => { const r = e.getBoundingClientRect(); return { e: (e.className?.baseVal ?? e.className) || e.tagName, t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
      .filter((x) => x.w < 44 || x.h < 44);
  });
  for (const x of pequenos) fallos.push(`${pantalla}: ${x.e} "${x.t}" ${x.w}x${x.h}`);
}

(async () => {
  const b = await chromium.launch();
  const fallos = [];
  for (const [nombre, perfil] of [['movil', devices['iPhone 13']], ['ipad', devices['iPad (gen 7) landscape']], ['pc', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = await b.newContext(perfil);
    const p = await ctx.newPage();
    p.on('dialog', (d) => d.accept());
    await p.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO); await p.goto('http://localhost:4173/'); await p.waitForSelector('.pais');
    const ir = async (sel) => { await p.locator(sel).click(); await p.waitForTimeout(200); };
    await medir(p, `${nombre}/hoy-inicio`, fallos);
    await empezarHoy(p);
    await medir(p, `${nombre}/hoy`, fallos);
    if (await p.locator('.opcion').count()) { await p.locator('.opcion').first().click(); await p.waitForTimeout(200); }
    await medir(p, `${nombre}/hoy-feedback`, fallos);
    await ir('.modo[data-modo="aprender"]'); await medir(p, `${nombre}/aprender`, fallos);
    await p.locator('.contenido-modo .acciones .boton-principal').click(); await p.waitForTimeout(200);
    await medir(p, `${nombre}/aprender-colocar`, fallos);
    await ir('.modo[data-modo="examen"]'); await medir(p, `${nombre}/examen`, fallos);
    await p.locator('text=Empezar examen').click(); await p.waitForTimeout(200);
    await medir(p, `${nombre}/examen-pregunta`, fallos);
    await ir('.modo[data-modo="explorar"]');
    await p.locator('.chip').first().click();
    await medir(p, `${nombre}/explorar`, fallos);
    await p.getByRole('button', { name: 'Inventa tu truco' }).click();
    await medir(p, `${nombre}/explorar-truco`, fallos);
    await p.getByLabel('Acercar').click();
    await medir(p, `${nombre}/mapa-con-zoom`, fallos);
    await ir('#region-actual'); await medir(p, `${nombre}/regiones`, fallos); await p.keyboard.press('Escape');
    await ir('#boton-mas'); await medir(p, `${nombre}/mas`, fallos);
    await p.getByRole('button', { name: 'Acerca de' }).click(); await medir(p, `${nombre}/acerca`, fallos);
    await p.keyboard.press('Escape');
    await ir('#boton-mas'); await p.getByRole('button', { name: 'Guía para madres y padres' }).click();
    for (let i = 0; i < 4; i++) {
      await medir(p, `${nombre}/guia-adultos-${i + 1}`, fallos);
      if (i < 3) await p.locator('dialog[open]').getByRole('button', { name: 'Siguiente' }).click();
    }
    await p.keyboard.press('Escape');
    await ir('#boton-mas'); await p.getByRole('button', { name: 'Cómo aprender con Capitalia' }).click();
    for (let i = 0; i < 8; i++) {
      if (i === 1) await p.getByRole('button', { name: 'Diez minutos cada día' }).click();
      await medir(p, `${nombre}/guia-${i + 1}`, fallos);
      if (i < 7) await p.getByRole('button', { name: 'Siguiente' }).click();
    }
    await p.keyboard.press('Escape');
    await ir('#boton-mas');
    await p.getByRole('button', { name: 'Panel para adultos', exact: true }).click();
    await medir(p, `${nombre}/panel-pin`, fallos);
    await p.getByPlaceholder('Nuevo PIN (4 a 6 cifras)').fill('2468'); await p.getByPlaceholder('Repite el PIN').fill('2468');
    await p.getByRole('button', { name: 'Crear PIN' }).click(); await p.waitForTimeout(200);
    for (const s of ['Resumen', 'Examen', 'Trucos', 'Ajustes']) {
      await p.locator('dialog[open]').getByRole('button', { name: s, exact: true }).click(); await p.waitForTimeout(150);
      if (s === 'Examen') await p.locator('.grupo-examen summary').first().click();
      await medir(p, `${nombre}/panel-${s.toLowerCase()}`, fallos);
    }
    await ctx.close();
  }
  console.log('Objetivos de menos de 44 px:', fallos.length ? '\n  ' + fallos.join('\n  ') : 'ninguno');

  // Teclado en PC.
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.addInitScript((e) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', e); }, ESTADO); await p.goto('http://localhost:4173/'); await p.waitForSelector('.pais');
  const foco = () => p.evaluate(() => { const e = document.activeElement; return `${e.tagName.toLowerCase()}${e.className ? '.' + String(e.className.baseVal ?? e.className).split(' ')[0] : ''} "${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 25)}"`; });
  const pasos = [];
  // 1) En Hoy, Empezar tiene el foco; luego, la primera opción; la tecla 2 responde.
  pasos.push(['foco inicial en Hoy', await foco()]);
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  pasos.push(['Enter empieza; foco', await foco()]);
  await p.keyboard.press('2'); await p.waitForTimeout(200);
  pasos.push(['tecla 2 responde', (await p.locator('.feedback-titulo').innerText().catch(() => 'NO')).slice(0, 40)]);
  await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  pasos.push(['Enter pasa a la siguiente', (await p.locator('.enunciado').innerText().catch(() => 'NO')).slice(0, 40)]);
  // 2) Tab recorre la cabecera: pestañas, región y Más; con foco visible.
  await p.locator('body').click({ position: { x: 5, y: 790 } });
  await p.keyboard.press('Tab');
  const visible = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none');
  pasos.push(['primer Tab', `${await foco()} | contorno de foco visible: ${visible}`]);
  // 3) Colocar (Aprender): elegir una capital y llegar a un país del mapa con Tab; Enter lo coloca.
  await p.locator('.modo[data-modo="aprender"]').click();
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  await p.locator('.chip-capital').first().focus(); await p.keyboard.press('Enter');
  let llegado = false;
  for (let i = 0; i < 25 && !llegado; i++) { await p.keyboard.press('Tab'); llegado = await p.evaluate(() => document.activeElement?.classList?.contains('pais')); }
  pasos.push(['Tab hasta un país del mapa', `${llegado} ${await foco()}`]);
  await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  pasos.push(['Enter sobre el país responde', (await p.locator('.feedback-titulo').innerText().catch(() => 'NO')).slice(0, 50)]);
  // 4) Examen: el foco va al campo País; Enter pasa a Capital y luego a la siguiente pregunta.
  await p.locator('.modo[data-modo="examen"]').click();
  await p.locator('text=Empezar examen').click(); await p.waitForTimeout(200);
  pasos.push(['foco en el examen', await foco()]);
  await p.keyboard.type('xx'); await p.keyboard.press('Enter');
  pasos.push(['Enter pasa a', await foco()]);
  await p.keyboard.type('yy'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  pasos.push(['Enter sigue', (await p.locator('.progreso').innerText().catch(() => 'NO')).slice(0, 40)]);
  // 5) Diálogos: Escape cierra el selector de región (fuera del examen, que lo oculta).
  await p.locator('.modo[data-modo="hoy"]').click();
  await p.locator('#region-actual').click();
  pasos.push(['foco al abrir regiones', await foco()]);
  await p.keyboard.press('Escape');
  pasos.push(['Escape cierra', `abierto: ${await p.locator('.dialogo-regiones[open]').count()}`]);
  // 6) Zoom con teclado: los botones + y − se alcanzan con Tab.
  await p.getByLabel('Acercar').focus(); await p.keyboard.press('Enter');
  pasos.push(['Enter en Acercar', await p.locator('.mapa-svg > g').getAttribute('transform')]);
  for (const [q, r] of pasos) console.log(`- ${q}: ${r}`);
  await b.close();
})();

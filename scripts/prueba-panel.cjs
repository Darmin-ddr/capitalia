// Prueba de O4: panel de adultos (PIN, resumen, examen, opcionales, trucos) y modo examen.
// Uso: node scripts/prueba-panel.cjs <carpeta-capturas> [movil]
const { chromium, devices } = require('playwright');
const empezarHoy = async (p) => { const e = p.locator('.contenido-modo .acciones .boton-principal', { hasText: 'Empezar' }); if (await e.count()) { await e.click(); await p.waitForTimeout(200); } };
const out = process.argv[2];
const movil = process.argv[3] === 'movil';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(movil ? devices['iPhone 13'] : devices['iPad (gen 7) landscape']);
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('dialog', (d) => d.accept());
  const suf = movil ? '-movil' : '';
  await p.addInitScript(() => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', JSON.stringify({ version: 1, tarjetas: {}, guiaVista: true })); }); await p.goto('http://localhost:4173/');
  await p.waitForSelector('.pais');
  await empezarHoy(p);
  // Algo de actividad para el resumen.
  for (let i = 0; i < 4; i++) {
    await p.locator('.opcion').first().click();
    await p.waitForTimeout(150);
    const sig = p.locator('.feedback .boton-principal');
    if (await sig.count()) await sig.click();
    await p.waitForTimeout(1450);
  }
  const abrirPanel = async () => {
    await p.locator('#boton-mas').click();
    await p.getByRole('button', { name: 'Panel para adultos', exact: true }).click();
  };
  await abrirPanel();
  await p.getByPlaceholder('Nuevo PIN (4 a 6 cifras)').fill('2468');
  await p.getByPlaceholder('Repite el PIN').fill('2468');
  await p.getByRole('button', { name: 'Crear PIN' }).click();
  await p.waitForSelector('.tabla-dominio');
  console.log('resumen: filas', await p.locator('.fila-dominio').count(), '| atascados:', (await p.locator('.lista-simple li').count()));
  await p.screenshot({ path: `${out}/o4-resumen${suf}.png` });
  // Examen: Balcanes entero, fecha dentro de 5 días.
  await p.locator('dialog[open]').getByRole('button', { name: 'Examen', exact: true }).click();
  const f = new Date(Date.now() + 5 * 864e5);
  await p.locator('.campo-fecha').fill(f.toISOString().slice(0, 10));
  await p.locator('.grupo-examen', { hasText: 'Balcanes' }).locator('summary input').check();
  console.log('contador examen:', await p.locator('.panel-cuerpo > .ayuda').nth(1).innerText());
  await p.getByRole('button', { name: 'Guardar examen' }).click();
  await p.screenshot({ path: `${out}/o4-examen${suf}.png` });
  // Trucos: editar Bulgaria.
  await p.locator('dialog[open]').getByRole('button', { name: 'Trucos', exact: true }).click();
  await p.locator('.panel-cuerpo select').selectOption('balcanes');
  const area = p.getByLabel('Truco de Bulgaria');
  await area.fill('Sofía: truco editado por un adulto.');
  await area.blur();
  // Ajustes: activar Kosovo.
  await p.locator('dialog[open]').getByRole('button', { name: 'Ajustes', exact: true }).click();
  await p.locator('label', { hasText: 'Kosovo' }).locator('input').check();
  await Promise.all([p.waitForEvent('load'), p.getByRole('button', { name: 'Cerrar' }).last().click()]);
  await p.waitForSelector('.pais');
  const e = await p.evaluate(() => JSON.parse(localStorage.getItem('progreso-capitales')).ajustes);
  console.log('ajustes guardados:', e.listaExamen.length, 'países examen,', e.fechaExamen, '| opcionales', e.opcionalesActivados, '| trucos editados', Object.keys(e.trucosEditados));
  // Con lista de examen: Hoy empieza por sus países (Balcanes, desbloqueada por el examen) y el Examen ofrece la lista.
  await p.locator('.modo[data-modo="hoy"]').click();
  await p.locator('.contenido-modo .acciones .boton-principal', { hasText: 'Empezar' }).click();
  await p.waitForTimeout(1300);
  console.log('Hoy empieza en:', await p.locator('#region-actual').innerText(), '| Balcanes jugables (con Kosovo):', await p.locator('path.pais.jugable').evaluateAll((els) => new Set(els.map((x) => x.dataset.id)).size));
  await p.locator('.modo[data-modo="examen"]').click();
  await p.locator('.selector-opcion', { hasText: 'Lista del examen' }).click();
  console.log('examen con la lista:', await p.locator('.selector-opcion', { hasText: 'Todas' }).innerText());
  await p.screenshot({ path: `${out}/o4-examen-lista${suf}.png` });
  // PIN incorrecto.
  await abrirPanel();
  await p.getByPlaceholder('PIN').fill('1111');
  await p.getByRole('button', { name: 'Entrar' }).click();
  console.log('PIN incorrecto:', await p.locator('.dialogo-panel .mensaje-copia').innerText());
  console.log('errores:', errores);
  await b.close();
})();

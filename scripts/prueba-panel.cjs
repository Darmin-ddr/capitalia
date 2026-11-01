// Prueba de O4: panel de adultos (PIN, resumen, examen, opcionales, trucos) y modo examen.
// Uso: node scripts/prueba-panel.cjs <carpeta-capturas> [movil]
const { chromium, devices } = require('playwright');
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
  await p.goto('http://localhost:4173/');
  await p.waitForSelector('.pais');
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
  await p.getByRole('button', { name: 'Examen', exact: true }).click();
  const f = new Date(Date.now() + 5 * 864e5);
  await p.locator('.campo-fecha').fill(f.toISOString().slice(0, 10));
  await p.locator('.grupo-examen', { hasText: 'Balcanes' }).locator('summary input').check();
  console.log('contador examen:', await p.locator('.panel-cuerpo > .ayuda').nth(1).innerText());
  await p.getByRole('button', { name: 'Guardar examen' }).click();
  await p.screenshot({ path: `${out}/o4-examen${suf}.png` });
  // Trucos: editar Bulgaria.
  await p.getByRole('button', { name: 'Trucos', exact: true }).click();
  await p.locator('.panel-cuerpo select').selectOption('balcanes');
  const area = p.getByLabel('Truco de Bulgaria');
  await area.fill('Sofía: truco editado por un adulto.');
  await area.blur();
  // Ajustes: activar Kosovo.
  await p.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await p.locator('label', { hasText: 'Kosovo' }).locator('input').check();
  await Promise.all([p.waitForEvent('load'), p.getByRole('button', { name: 'Cerrar' }).last().click()]);
  await p.waitForSelector('.pais');
  const e = await p.evaluate(() => JSON.parse(localStorage.getItem('progreso-capitales')).ajustes);
  console.log('ajustes guardados:', e.listaExamen.length, 'países examen,', e.fechaExamen, '| opcionales', e.opcionalesActivados, '| trucos editados', Object.keys(e.trucosEditados));
  console.log('info repaso (región actual):', await p.locator('.info-examen').innerText());
  // Ir a Balcanes (desbloqueada por el examen) y preparar examen.
  await p.locator('#region-actual').click();
  console.log('Balcanes en el selector:', (await p.locator('.region-item').filter({ has: p.locator('.region-titulo', { hasText: /^Balcanes/ }) }).innerText()).replace(/\n/g, ' | '));
  await p.locator('.region-item').filter({ has: p.locator('.region-titulo', { hasText: /^Balcanes/ }) }).click();
  await p.waitForTimeout(300);
  console.log('Balcanes jugables (con Kosovo):', await p.locator('path.pais.jugable').evaluateAll((els) => new Set(els.map((x) => x.dataset.id)).size));
  await p.getByRole('button', { name: 'Preparar examen' }).click();
  const id = await p.locator('.pais.objetivo').first().getAttribute('data-id');
  // Fallar a propósito: la tarjeta no debe cambiar en modo examen.
  const antes = await p.evaluate((id) => JSON.parse(localStorage.getItem('progreso-capitales')).tarjetas[id] ?? null, id);
  const opciones = await p.locator('.opcion-texto').allInnerTexts();
  const capital = await p.evaluate(async (id) => id, id);
  void capital;
  // Elegimos una opción; si acierta, da igual: comprobamos la regla con el historial.
  await p.locator('.opcion').first().click();
  await p.waitForTimeout(200);
  const estado = await p.evaluate(() => JSON.parse(localStorage.getItem('progreso-capitales')));
  const ultima = estado.historial[estado.historial.length - 1];
  const despues = estado.tarjetas[id] ?? null;
  console.log('respuesta de examen:', ultima.pais, ultima.res, 'examen=', ultima.examen,
    '| tarjeta', ultima.res === 'fallo' ? (JSON.stringify(antes) === JSON.stringify(despues) ? 'sin cambios (OK)' : 'CAMBIÓ (MAL)') : 'actualizada por acierto');
  await p.screenshot({ path: `${out}/o4-preparar-examen${suf}.png` });
  // PIN incorrecto.
  await abrirPanel();
  await p.getByPlaceholder('PIN').fill('1111');
  await p.getByRole('button', { name: 'Entrar' }).click();
  console.log('PIN incorrecto:', await p.locator('.dialogo-panel .mensaje-copia').innerText());
  console.log('opciones vistas:', opciones.length, '| errores:', errores);
  await b.close();
})();

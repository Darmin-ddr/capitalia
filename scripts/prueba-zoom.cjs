// Prueba del zoom del mapa: botones, rueda, arrastre (sin elegir país al soltar) y pellizco simulado.
// Uso: node scripts/prueba-zoom.cjs <carpeta-capturas>
const { chromium, devices } = require('playwright');
const out = process.argv[2];
const escala = (t) => Number((t || '').match(/scale\(([\d.]+)\)/)?.[1] ?? 1);
(async () => {
  const b = await chromium.launch();
  const errores = [];
  // PC: botones, rueda y arrastre con ratón.
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  p.on('pageerror', (e) => errores.push(e.message));
  await p.addInitScript(() => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', JSON.stringify({ version: 1, tarjetas: {}, guiaVista: true })); }); await p.goto('http://localhost:4173/'); await p.waitForSelector('.pais');
  await p.locator('.modo[data-modo="explorar"]').click();
  const lienzo = p.locator('.mapa-svg > g');
  console.log('inicio, escala', escala(await lienzo.getAttribute('transform')), '| botón ver todo visible:', await p.getByLabel('Ver toda la región').isVisible());
  await p.getByLabel('Acercar').click(); await p.getByLabel('Acercar').click();
  console.log('tras 2 × acercar, escala', escala(await lienzo.getAttribute('transform')).toFixed(2), '| botón ver todo visible:', await p.getByLabel('Ver toda la región').isVisible());
  const caja = await p.locator('.mapa-svg').boundingBox();
  const cx = caja.x + caja.width / 2, cy = caja.y + caja.height / 2;
  const antes = await lienzo.getAttribute('transform');
  await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + 120, cy + 60, { steps: 6 }); await p.mouse.up();
  console.log('arrastre mueve el mapa:', antes !== (await lienzo.getAttribute('transform')), '| país elegido al soltar:', await p.locator('.pais.seleccion').count());
  await p.getByLabel('Ver toda la región').click();
  console.log('ver toda la región, escala', escala(await lienzo.getAttribute('transform')));
  await p.mouse.move(cx, cy); await p.mouse.wheel(0, -400);
  console.log('rueda hacia arriba, escala', escala(await lienzo.getAttribute('transform')).toFixed(2));
  // Un clic normal sigue eligiendo país, también con zoom.
  await p.locator('path.pais.jugable[data-id="ESP"]').click({ force: true });
  console.log('clic con zoom elige España:', await p.locator('.ficha-capital').innerText());
  await p.screenshot({ path: `${out}/zoom-pc.png` });
  // Móvil: pellizco simulado con dos punteros.
  const m = await (await b.newContext(devices['iPhone 13'])).newPage();
  m.on('pageerror', (e) => errores.push(e.message));
  await m.addInitScript(() => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', JSON.stringify({ version: 1, tarjetas: {}, guiaVista: true })); }); await m.goto('http://localhost:4173/'); await m.waitForSelector('.pais');
  const k = await m.evaluate(async () => {
    const svg = document.querySelector('.mapa-svg');
    const r = svg.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ev = (tipo, id, x, y, destino) => destino.dispatchEvent(new PointerEvent(tipo, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
    ev('pointerdown', 1, cx - 20, cy, svg); ev('pointerdown', 2, cx + 20, cy, svg);
    for (let i = 1; i <= 10; i++) { ev('pointermove', 1, cx - 20 - i * 8, cy, window); ev('pointermove', 2, cx + 20 + i * 8, cy, window); }
    ev('pointerup', 1, cx - 100, cy, window); ev('pointerup', 2, cx + 100, cy, window);
    return Number(svg.querySelector(':scope > g').getAttribute('transform').match(/scale\(([\d.]+)\)/)[1]);
  });
  console.log('pellizco en móvil, escala', k.toFixed(2));
  await m.screenshot({ path: `${out}/zoom-movil.png` });
  console.log('errores:', errores);
  await b.close();
})();

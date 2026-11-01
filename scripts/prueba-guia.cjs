// Prueba de la guía (se abre sola la primera vez, pregunta, taller de trucos) y de "Acerca de".
// Uso: node scripts/prueba-guia.cjs <carpeta-capturas> [movil]
const { chromium, devices } = require('playwright');
const out = process.argv[2];
const movil = process.argv[3] === 'movil';
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext(movil ? devices['iPhone 13'] : devices['iPad (gen 7) landscape'])).newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  const suf = movil ? '-movil' : '';
  await p.goto('http://localhost:4173/');
  await p.waitForSelector('.dialogo-guia[open]');
  console.log('primer arranque:', await p.locator('.dialogo-guia[open] .dialogo-titulo').innerText());
  await p.screenshot({ path: `${out}/bienvenida${suf}.png` });
  await p.getByRole('button', { name: 'Soy el alumno o la alumna' }).click();
  await p.waitForTimeout(200);
  console.log('el alumno va a su guía:', await p.locator('.dialogo-guia[open] .dialogo-titulo').innerText());
  await p.screenshot({ path: `${out}/guia-1${suf}.png` });
  const titulos = [];
  for (let i = 0; i < 8; i++) {
    titulos.push(await p.locator('.dialogo-guia[open] .dialogo-titulo').innerText());
    if (i === 1) {
      await p.getByRole('button', { name: 'Diez minutos cada día' }).click();
      console.log('pregunta:', (await p.locator('.respuesta-guia .feedback-titulo').innerText()));
      await p.screenshot({ path: `${out}/guia-pregunta${suf}.png` });
    }
    if (i === 6) {
      const capital = (await p.locator('.cuerpo-guia strong').first().innerText()).trim();
      await p.locator('.cuerpo-guia input').fill('algo parecido');
      await p.locator('.cuerpo-guia textarea').fill(`Truco de prueba para ${capital}`);
      await p.getByRole('button', { name: 'Guardar mi truco' }).click();
      console.log('taller:', capital, '->', await p.locator('.dialogo-guia[open] .mensaje-copia').innerText());
      await p.screenshot({ path: `${out}/guia-taller${suf}.png` });
    }
    if (i < 7) await p.getByRole('button', { name: 'Siguiente' }).click();
  }
  console.log('pasos:', titulos.join(' | '));
  await p.getByRole('button', { name: 'Empezar a repasar' }).click();
  const estado = await p.evaluate(() => JSON.parse(localStorage.getItem('progreso-capitales')));
  console.log('guía vista guardada:', estado.guiaVista, '| trucos propios:', JSON.stringify(estado.trucosPropios));
  await p.reload(); await p.waitForSelector('.pais'); await p.waitForTimeout(300);
  console.log('tras recargar, guía abierta:', await p.locator('.dialogo-guia[open]').count());
  // Desde el botón Más: guía y Acerca de.
  await p.locator('#boton-mas').click();
  await p.getByRole('button', { name: 'Cómo aprender con Capitalia' }).click();
  console.log('reabrir guía desde Más:', await p.locator('.dialogo-guia[open] .dialogo-titulo').innerText());
  await p.getByRole('button', { name: 'Cerrar' }).first().click();
  await p.locator('#boton-mas').click();
  await p.getByRole('button', { name: 'Acerca de' }).click();
  console.log('acerca de:', (await p.locator('.dialogo-acerca .dialogo-contenido').innerText()).split('\n').slice(0, 4).join(' | '));
  await p.screenshot({ path: `${out}/acerca${suf}.png` });
  // Recorrido de madre o padre: bienvenida -> guía de adultos -> panel; casillas de continente en el examen.
  const q = await (await b.newContext(movil ? devices['iPhone 13'] : devices['iPad (gen 7) landscape'])).newPage();
  q.on('pageerror', (e) => errores.push(e.message));
  await q.goto('http://localhost:4173/');
  await q.getByRole('button', { name: 'Soy madre o padre' }).click();
  const pasosAdultos = [];
  for (let i = 0; i < 4; i++) {
    pasosAdultos.push(await q.locator('.dialogo-guia[open] .dialogo-titulo').innerText());
    if (i < 3) await q.locator('.dialogo-guia[open]').getByRole('button', { name: 'Siguiente' }).click();
  }
  console.log('guía de adultos:', pasosAdultos.join(' | '));
  await q.screenshot({ path: `${out}/guia-adultos${suf}.png` });
  await q.getByRole('button', { name: 'Configurar ahora' }).click();
  await q.getByPlaceholder('Nuevo PIN (4 a 6 cifras)').fill('2468');
  await q.getByPlaceholder('Repite el PIN').fill('2468');
  await q.getByRole('button', { name: 'Crear PIN' }).click();
  await q.getByRole('button', { name: 'Examen', exact: true }).click();
  const cont = q.locator('.panel-cuerpo > p.ayuda').nth(1);
  const casilla = (texto) => q.locator('.casilla-continente', { hasText: texto }).locator('input');
  const estadoC = async (texto) => q.evaluate((t) => { const i = [...document.querySelectorAll('.casilla-continente')].find((l) => l.textContent.includes(t)).querySelector('input'); return i.checked ? 'todos' : i.indeterminate ? 'parcial' : 'ninguno'; }, texto);
  await casilla('Europa').check();
  console.log('Europa entera:', await cont.innerText(), '| Asia:', await estadoC('Asia'));
  await casilla('Asia').check();
  console.log('+ Asia entera:', await cont.innerText());
  await casilla('Europa').uncheck();
  console.log('- Europa:', await cont.innerText(), '| Asia:', await estadoC('Asia'), '(Rusia y Turquía también son de Asia)');
  await q.locator('.grupo-examen', { hasText: 'Balcanes' }).locator('summary input').check();
  console.log('+ Balcanes:', await cont.innerText(), '| Europa:', await estadoC('Europa'));
  await q.screenshot({ path: `${out}/examen-continentes${suf}.png` });
  console.log('errores:', errores);
  await b.close();
})();

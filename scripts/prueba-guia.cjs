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
  console.log('la guía se abre sola la primera vez:', await p.locator('.dialogo-guia .dialogo-titulo').innerText());
  await p.screenshot({ path: `${out}/guia-1${suf}.png` });
  const titulos = [];
  for (let i = 0; i < 8; i++) {
    titulos.push(await p.locator('.dialogo-guia .dialogo-titulo').innerText());
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
      console.log('taller:', capital, '->', await p.locator('.dialogo-guia .mensaje-copia').innerText());
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
  console.log('reabrir guía desde Más:', await p.locator('.dialogo-guia .dialogo-titulo').innerText());
  await p.getByRole('button', { name: 'Cerrar' }).first().click();
  await p.locator('#boton-mas').click();
  await p.getByRole('button', { name: 'Acerca de' }).click();
  console.log('acerca de:', (await p.locator('.dialogo-acerca .dialogo-contenido').innerText()).split('\n').slice(0, 4).join(' | '));
  await p.screenshot({ path: `${out}/acerca${suf}.png` });
  console.log('errores:', errores);
  await b.close();
})();

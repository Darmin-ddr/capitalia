// Con un diálogo abierto (bienvenida, guías), las teclas no deben responder ni avanzar
// la pregunta de detrás; Enter en la guía pasa al siguiente paso.
// Uso: node scripts/prueba-teclado-dialogos.cjs   (con el preview en el puerto 4173)
const { chromium } = require('playwright');
const empezarHoy = async (p) => { const e = p.locator('.contenido-modo .acciones .boton-principal', { hasText: 'Empezar' }); if (await e.count()) { await e.click(); await p.waitForTimeout(200); } };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  const respuestas = () => p.evaluate(() => JSON.parse(localStorage.getItem('progreso-capitales') || '{"historial":[]}').historial.length);
  const titulo = () => p.locator('dialog[open] .dialogo-titulo').innerText();
  await p.goto('http://localhost:4173/');
  await p.waitForSelector('dialog[open]');
  console.log('bienvenida:', await titulo());
  // Clic en el texto (el foco sale de los botones) y teclas de respuesta.
  await p.locator('dialog[open] p').first().click();
  for (const k of ['1', '2', '3', '4', 'Enter']) await p.keyboard.press(k);
  await p.waitForTimeout(300);
  console.log('tras 1-4 y Enter en la bienvenida: respuestas detrás =', await respuestas(), '| diálogo ahora:', await titulo());
  // Enter con el foco en el texto ha pulsado el botón principal (alumno -> guía).
  await p.locator('dialog[open] p').first().click();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  console.log('Enter en la guía (foco en el texto) -> paso:', await titulo());
  await p.keyboard.press('2');
  await p.waitForTimeout(200);
  console.log('tecla 2 en la guía: respuestas detrás =', await respuestas());
  // Cerrar la guía y empezar Hoy; con la guía abierta encima de una pregunta, las teclas no responden.
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  await empezarHoy(p);
  await p.locator('#boton-mas').click();
  await p.getByRole('button', { name: 'Cómo aprender con Capitalia' }).click();
  await p.locator('dialog[open] p').first().click();
  for (const k of ['1', '2', '3', '4']) await p.keyboard.press(k);
  await p.waitForTimeout(200);
  console.log('guía abierta sobre una pregunta, teclas 1-4: respuestas detrás =', await respuestas());
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  await p.keyboard.press('1');
  await p.waitForTimeout(300);
  console.log('sin diálogo, tecla 1: respuestas =', await respuestas());
  console.log('errores:', errores);
  await b.close();
})();

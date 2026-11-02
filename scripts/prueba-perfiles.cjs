// Prueba de los alumnos (perfiles locales): un solo alumno sigue igual; al añadir otro, cada
// uno con su progreso; "¿Quién va a estudiar?" al abrir; PIN común; borrar desde el panel.
// Uso: node scripts/prueba-perfiles.cjs <carpeta-capturas>   (con `npx vite preview --port 4173` en marcha)
const { chromium, devices } = require('playwright');

const ayer = new Date(Date.now() - 864e5).toISOString();
// Quien ya usaba la app: con progreso (España aprendida) y sin perfiles.
const PREVIO = JSON.stringify({
  version: 1, tarjetas: {}, guiaVista: true, bienvenidaVista: true, ultimaRegion: 'europa-sur', prioridad: [],
  aprendizaje: { ESP: { escalon: 3, aciertos: 0, aprendido: true } },
  historial: [{ t: ayer, pais: 'ESP', modo: 'escribir', res: 'acierto', ms: 3000, nota: 3 }],
  trucosPropios: { ESP: 'truco de Lucía' }, ajustes: {},
});
const out = process.argv[2] || '.';
let fallosPrueba = 0;
const comprobar = (cond, texto) => { console.log((cond ? 'OK   ' : 'FALLO') + ' ' + texto); if (!cond) fallosPrueba++; };
const leer = (p, clave) => p.evaluate((k) => localStorage.getItem(k), clave);

(async () => {
  const b = await chromium.launch();
  const errores = [];
  for (const [nombre, o] of [['pc', { viewport: { width: 1366, height: 800 } }], ['movil', devices['iPhone 13']]]) {
    const ctx = await b.newContext(o);
    await ctx.addInitScript((x) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', x); }, PREVIO);
    const tap = o.hasTouch ? 'tap' : 'click';
    const abrir = async () => {
      const p = await ctx.newPage(); // pestaña nueva = "abrir la app otra vez" (sesión nueva, mismo almacenamiento)
      p.on('pageerror', (e) => errores.push(nombre + ': ' + e.message));
      p.on('dialog', (d) => d.accept());
      await p.goto('http://localhost:4173/');
      return p;
    };

    // 0. Primer arranque con la versión de los alumnos: "¿Cómo te llamas?" (una sola vez); "Ahora no" no insiste.
    let p = await abrir();
    await p.waitForSelector('.dialogo-perfiles[open]');
    const pide = await p.locator('.dialogo-perfiles[open]').innerText();
    comprobar(pide.includes('¿Cómo te llamas?') && pide.includes('sin fotos') && pide.includes('Ahora no'), `${nombre}: el primer arranque pide nombre (con "Ahora no")`);
    await p.screenshot({ path: `${out}/${nombre}-perfil-nombre.png` });
    await p.locator('.dialogo-perfiles[open]').getByRole('button', { name: 'Ahora no' })[tap]();
    p = await abrir();
    await p.waitForSelector('.portada-progreso');
    await p.waitForTimeout(300);

    // 1. Un solo alumno: entra directo, como siempre; crea el PIN.
    comprobar(await p.locator('.dialogo-perfiles[open]').count() === 0, `${nombre}: con un solo alumno, sin preguntar quién ni volver a pedir el nombre`);
    comprobar(await p.locator('.chip-alumno').count() === 0, `${nombre}: con un solo alumno, sin nombre en la portada`);
    await p.locator('#boton-mas')[tap]();
    await p.getByRole('button', { name: 'Panel para adultos', exact: true })[tap]();
    await p.getByPlaceholder('Nuevo PIN (4 a 6 cifras)').fill('2468');
    await p.getByPlaceholder('Repite el PIN').fill('2468');
    await p.getByRole('button', { name: 'Crear PIN' })[tap]();
    await p.keyboard.press('Escape');

    // 2. Añadir alumno (cualquiera, desde ⋯): pide también el nombre de quien ya la usaba.
    await p.locator('#boton-mas')[tap]();
    await p.getByRole('button', { name: 'Añadir alumno' })[tap]();
    await p.waitForSelector('.dialogo-perfiles[open]');
    const form = await p.locator('.dialogo-perfiles[open]').innerText();
    comprobar(form.includes('quien ya usaba la app') && form.includes('sin fotos'), `${nombre}: el formulario pide el nombre de quien ya la usaba y dice que no hay fotos`);
    await p.getByLabel('Nombre de quien ya usaba la app').fill('Lucía');
    await p.getByLabel('Nombre del alumno nuevo').fill('Pablo');
    await p.getByRole('button', { name: 'Icono 🧭' })[tap]();
    await p.getByRole('button', { name: 'Color 3' })[tap]();
    await p.screenshot({ path: `${out}/${nombre}-perfil-nuevo.png` });
    await Promise.all([p.waitForEvent('load'), p.getByRole('button', { name: 'Crear' })[tap]()]);
    await p.waitForSelector('.pais');
    // El alumno nuevo ve su guía la primera vez.
    if (await p.locator('.dialogo-guia[open]').count()) await p.keyboard.press('Escape');
    await p.waitForSelector('.chip-alumno');
    comprobar((await p.locator('.chip-alumno').innerText()).includes('Pablo'), `${nombre}: entra como Pablo, con su nombre en la portada`);
    comprobar((await p.locator('.cifra-portada').innerText()).startsWith('0'), `${nombre}: Pablo empieza de cero`);
    await p.screenshot({ path: `${out}/${nombre}-perfil-portada.png` });
    // Responde una pregunta: se guarda en su progreso, no en el de Lucía.
    await p.locator('.contenido-modo .acciones .boton-principal', { hasText: 'Empezar' })[tap]();
    await p.locator('.opcion').first()[tap]();
    await p.waitForTimeout(300);
    const indice = JSON.parse(await leer(p, 'capitalia-perfiles'));
    const pablo = indice.perfiles.find((x) => x.nombre === 'Pablo');
    comprobar(pablo && pablo.imagen.icono === '🧭', `${nombre}: Pablo con su icono`);
    const deLucia = JSON.parse(await leer(p, 'progreso-capitales'));
    const dePablo = JSON.parse(await leer(p, `progreso-capitales-${pablo.id}`));
    comprobar(deLucia.historial.length === 1 && deLucia.trucosPropios.ESP === 'truco de Lucía', `${nombre}: el progreso de Lucía sigue intacto`);
    comprobar(dePablo.historial.length === 1 && !dePablo.trucosPropios.ESP, `${nombre}: Pablo tiene su propio progreso`);

    // 3. Abrir la app otra vez: con dos alumnos, "¿Quién va a estudiar?" (Escape no lo cierra).
    p = await abrir();
    await p.waitForSelector('.dialogo-perfiles[open]');
    await p.keyboard.press('Escape');
    comprobar(await p.locator('.dialogo-perfiles[open]').count() === 1, `${nombre}: al abrir, hay que elegir (Escape no lo cierra)`);
    await p.screenshot({ path: `${out}/${nombre}-perfil-quien.png` });
    await p.locator('.perfil-item', { hasText: 'Lucía' })[tap]();
    await p.waitForSelector('.portada-progreso');
    comprobar((await p.locator('.chip-alumno').innerText()).includes('Lucía') && (await p.locator('.cifra-portada').innerText()).startsWith('1'), `${nombre}: Lucía, con su progreso`);
    // Al recargar en la misma visita no vuelve a preguntar.
    await p.reload(); await p.waitForSelector('.portada-progreso');
    comprobar(await p.locator('.dialogo-perfiles[open]').count() === 0, `${nombre}: al recargar en la misma visita, no pregunta otra vez`);
    // Volver a la app tras un rato (en iPhone/iPad no se reabre: se reanuda). Se simula ocultarla y adelantar el reloj.
    const ocultarYVolver = (minutos) => p.evaluate((m) => {
      const fijar = (v) => Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
      fijar('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      const ahora = Date.now;
      Date.now = () => ahora() + m * 60000;
      fijar('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      Date.now = ahora;
    }, minutos);
    await p.evaluate(() => (window.__sinRecargar = true));
    await ocultarYVolver(2);
    comprobar(await p.locator('.dialogo-perfiles[open]').count() === 0, `${nombre}: al volver tras 2 minutos, no pregunta`);
    await ocultarYVolver(11);
    comprobar(await p.locator('.dialogo-perfiles[open]').count() === 1, `${nombre}: al volver tras 11 minutos, pregunta quién va a estudiar`);
    await p.keyboard.press('Escape');
    comprobar(await p.locator('.dialogo-perfiles[open]').count() === 1, `${nombre}: y hay que elegir (Escape no lo cierra)`);
    await p.locator('.perfil-item', { hasText: 'Lucía' })[tap]();
    await p.waitForTimeout(300);
    comprobar(await p.evaluate(() => window.__sinRecargar === true) && await p.locator('.dialogo-perfiles[open]').count() === 0, `${nombre}: el mismo alumno sigue donde estaba, sin recargar`);

    // 4. PIN común; borrar alumno solo desde el panel (y no al actual).
    await p.locator('#boton-mas')[tap]();
    await p.waitForSelector('dialog[open] .bloque-alumno');
    comprobar(await p.locator('dialog[open]').getByRole('button', { name: 'Cambiar de alumno' }).count() === 1, `${nombre}: ⋯ deja cambiar de alumno`);
    await p.getByRole('button', { name: 'Panel para adultos', exact: true })[tap]();
    comprobar(await p.getByPlaceholder('Nuevo PIN (4 a 6 cifras)').count() === 0, `${nombre}: el PIN es común (no pide crear otro)`);
    await p.getByPlaceholder('PIN').fill('2468');
    await p.getByRole('button', { name: 'Entrar' })[tap]();
    comprobar((await p.locator('dialog[open] .dialogo-titulo').innerText()).includes('Lucía'), `${nombre}: el panel dice de quién son los datos`);
    await p.locator('dialog[open]').getByRole('button', { name: 'Ajustes', exact: true })[tap]();
    const filas = p.locator('.fila-alumno');
    comprobar(await filas.filter({ hasText: 'Lucía' }).getByRole('button', { name: 'Borrar' }).count() === 0, `${nombre}: no se puede borrar al alumno actual`);
    await p.locator('.seccion-alumnos').scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${out}/${nombre}-perfil-panel.png` });
    await filas.filter({ hasText: 'Pablo' }).getByRole('button', { name: 'Borrar' })[tap]();
    await p.waitForTimeout(200);
    const tras = JSON.parse(await leer(p, 'capitalia-perfiles'));
    comprobar(tras.perfiles.length === 1 && (await leer(p, `progreso-capitales-${pablo.id}`)) === null, `${nombre}: Pablo borrado, con su progreso`);
    p = await abrir();
    await p.waitForSelector('.portada-progreso');
    comprobar(await p.locator('.dialogo-perfiles[open]').count() === 0, `${nombre}: vuelve a un solo alumno: no pregunta`);
    await ctx.close();
  }
  // 5. Ponerle nombre en el primer arranque y editarlo después desde ⋯.
  {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
    await ctx.addInitScript((x) => { if (!localStorage.getItem('progreso-capitales')) localStorage.setItem('progreso-capitales', x); }, PREVIO);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push('nombre: ' + e.message));
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.dialogo-perfiles[open]');
    await p.locator('.dialogo-perfiles[open] input.campo-texto').fill('Lucía');
    await p.getByRole('button', { name: 'Icono 🗺️' }).click();
    await p.locator('.dialogo-perfiles[open]').getByRole('button', { name: 'Guardar' }).click();
    await p.locator('#boton-mas').click();
    await p.waitForSelector('dialog[open] .bloque-alumno');
    comprobar((await p.locator('dialog[open] .alumno-actual').innerText()).includes('Lucía'), 'con nombre: ⋯ muestra el alumno aunque sea uno solo');
    await p.locator('dialog[open]').getByRole('button', { name: 'Editar perfil' }).click();
    await p.waitForSelector('.dialogo-perfiles[open]');
    comprobar((await p.locator('.dialogo-perfiles[open] input.campo-texto').inputValue()) === 'Lucía', 'Editar perfil trae el nombre actual');
    await p.locator('.dialogo-perfiles[open] input.campo-texto').fill('Lucía M.');
    await p.locator('.dialogo-perfiles[open]').getByRole('button', { name: 'Guardar' }).click();
    const ind = JSON.parse(await p.evaluate(() => localStorage.getItem('capitalia-perfiles')));
    comprobar(ind.perfiles[0].nombre === 'Lucía M.' && ind.perfiles[0].imagen.icono === '🗺️' && ind.nombrePedido === true, `nombre e imagen guardados (${ind.perfiles[0].nombre}, ${ind.perfiles[0].imagen.icono})`);
    await p.reload(); await p.waitForSelector('.portada-progreso'); await p.waitForTimeout(300);
    comprobar(await p.locator('.dialogo-perfiles[open]').count() === 0, 'con nombre, no lo vuelve a pedir');
    await ctx.close();
  }

  // 6. Copias: la de ⋯ es del alumno activo y lleva su nombre; importar la de otro avisa (sin bloquear);
  //    la de todos (panel) se descarga y se restaura.
  {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const ctx = await b.newContext({ viewport: { width: 1366, height: 800 }, acceptDownloads: true });
    await ctx.addInitScript(() => {
      if (localStorage.getItem('capitalia-perfiles')) return;
      const vacio = (truco) => JSON.stringify({ version: 1, tarjetas: {}, historial: [], guiaVista: true, bienvenidaVista: true, trucosPropios: truco, ajustes: {} });
      localStorage.setItem('progreso-capitales', vacio({ ESP: 'de Lucía' }));
      localStorage.setItem('progreso-capitales-p2', vacio({ FRA: 'de Pablo' }));
      localStorage.setItem('capitalia-perfiles', JSON.stringify({ version: 1, ultimo: 'p1', pinHash: null, nombrePedido: true,
        perfiles: [{ id: 'p1', nombre: 'Lucía', imagen: { tipo: 'inicial', color: '#c9daf8' } }, { id: 'p2', nombre: 'Pablo', imagen: { tipo: 'icono', icono: '🧭', color: '#fce5cd' } }] }));
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errores.push('copias: ' + e.message));
    const mensajes = [];
    let aceptar = false;
    p.on('dialog', (d) => { mensajes.push(d.message()); if (aceptar) d.accept(); else d.dismiss(); });
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.dialogo-perfiles[open]');
    await p.locator('.perfil-item', { hasText: 'Lucía' }).click();
    await p.waitForSelector('.portada-progreso');
    // Copia de ⋯: de Lucía.
    await p.locator('#boton-mas').click();
    comprobar((await p.locator('dialog[open]').innerText()).includes('Esta copia es solo de Lucía'), 'con varios alumnos, ⋯ dice que la copia es solo del alumno activo');
    const [descarga] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Descargar copia', exact: true }).click()]);
    const copia = JSON.parse(fs.readFileSync(await descarga.path(), 'utf8'));
    comprobar(copia.alumno === 'Lucía' && /un ordenador/.test(copia.dispositivo) && descarga.suggestedFilename().includes('lucia'), `la copia lleva el nombre (${descarga.suggestedFilename()}, ${copia.dispositivo})`);
    // Importar en Lucía una copia de Pablo hecha en un iPad: aviso, no error (se cancela para no tocar nada).
    const dePablo = { ...copia, alumno: 'Pablo', dispositivo: 'un iPad' };
    const ruta = path.join(os.tmpdir(), 'copia-de-pablo.json');
    fs.writeFileSync(ruta, JSON.stringify(dePablo));
    await p.locator('dialog[open] input[type=file]').setInputFiles(ruta);
    await p.waitForTimeout(300);
    const m = mensajes.at(-1) || '';
    comprobar(m.includes('Esta copia es de Pablo') && m.includes('en un iPad') && m.includes('perfil de Lucía'), `importar la copia de otro avisa sin bloquear → "${m.slice(0, 90)}…"`);
    await p.keyboard.press('Escape');
    // Copia de todos desde el panel (crear PIN primero).
    await p.locator('#boton-mas').click();
    await p.getByRole('button', { name: 'Panel para adultos', exact: true }).click();
    await p.getByPlaceholder('Nuevo PIN (4 a 6 cifras)').fill('2468');
    await p.getByPlaceholder('Repite el PIN').fill('2468');
    await p.getByRole('button', { name: 'Crear PIN' }).click();
    await p.locator('dialog[open]').getByRole('button', { name: 'Ajustes', exact: true }).click();
    const [dTodos] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Descargar copia de todos' }).click()]);
    const casa = JSON.parse(fs.readFileSync(await dTodos.path(), 'utf8'));
    comprobar(casa.formato === 'capitalia-casa' && casa.perfiles.length === 2 && casa.progresos.p2.trucosPropios.FRA === 'de Pablo', `copia de todos: ${dTodos.suggestedFilename()} con los 2 alumnos`);
    // Restaurarla (con un cambio, para ver que se aplica).
    casa.perfiles[1].nombre = 'Pablo R.';
    const rutaCasa = path.join(os.tmpdir(), 'copia-casa.json');
    fs.writeFileSync(rutaCasa, JSON.stringify(casa));
    aceptar = true;
    await Promise.all([p.waitForEvent('load'), p.locator('.seccion-alumnos input[type=file]').setInputFiles(rutaCasa)]);
    comprobar((mensajes.at(-1) || '').includes('Se sustituirán todos los alumnos'), 'restaurar pide confirmación');
    await p.waitForSelector('.dialogo-perfiles[open]');
    comprobar(await p.locator('.perfil-item', { hasText: 'Pablo R.' }).count() === 1, 'restaurada: tras recargar, pregunta quién estudia y sale el alumno de la copia');
    await ctx.close();
  }

  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log(fallosPrueba ? `${fallosPrueba} comprobaciones fallidas` : 'todas las comprobaciones bien');
  await b.close();
  process.exit(fallosPrueba || errores.length ? 1 : 0);
})();

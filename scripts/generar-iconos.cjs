// Genera los PNG de los iconos de la PWA a partir de los SVG, con Chromium.
// Uso: node scripts/generar-iconos.cjs <svg-redondeado> <svg-maskable> <svg-cuadrado> <carpeta-salida>
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [redondeado, maskable, cuadrado, salida] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage();
  const tareas = [
    [redondeado, 'icono-192.png', 192, true],
    [redondeado, 'icono-512.png', 512, true],
    [maskable, 'icono-maskable-512.png', 512, false],
    [cuadrado, 'apple-touch-icon.png', 180, false],
  ];
  for (const [svg, nombre, tam, transparente] of tareas) {
    await p.setViewportSize({ width: tam, height: tam });
    await p.setContent(`<html><body style="margin:0;background:transparent">${fs.readFileSync(svg, 'utf8').replace('<svg ', `<svg width="${tam}" height="${tam}" `)}</body></html>`);
    await p.screenshot({ path: `${salida}/${nombre}`, omitBackground: transparente });
  }
  await b.close();
})();

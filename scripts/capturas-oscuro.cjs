// Capturas de revisión visual en modo oscuro (PC y móvil).
// Uso: node scripts/capturas-oscuro.cjs <carpeta-capturas>
const { chromium, devices } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  for (const [nombre, perfil] of [['pc', { viewport: { width: 1280, height: 800 } }], ['movil', devices['iPhone 13']]]) {
    const ctx = await b.newContext({ ...perfil, colorScheme: 'dark' });
    const p = await ctx.newPage();
    p.on('dialog', (d) => d.accept());
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    await p.locator('.opcion').first().click();
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/oscuro-${nombre}-repaso.png` });
    await p.locator('.modo[data-modo="practicar"]').click();
    await p.locator('.selector-opcion[data-modo="colocar"]').click();
    await p.locator('.chip-capital').first().click();
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/oscuro-${nombre}-colocar.png` });
    await p.locator('#region-actual').click();
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/oscuro-${nombre}-regiones.png` });
    await p.keyboard.press('Escape');
    await p.locator('#boton-mas').click();
    await p.getByRole('button', { name: 'Panel para adultos', exact: true }).click();
    await p.getByPlaceholder('Nuevo PIN (4 a 6 cifras)').fill('2468');
    await p.getByPlaceholder('Repite el PIN').fill('2468');
    await p.getByRole('button', { name: 'Crear PIN' }).click();
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/oscuro-${nombre}-panel.png` });
    await ctx.close();
  }
  await b.close();
})();

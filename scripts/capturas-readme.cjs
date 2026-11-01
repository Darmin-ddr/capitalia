// Capturas para el README (docs/capturas/). Se rehacen cuando cambia la interfaz.
// Uso: node scripts/capturas-readme.cjs   (con el preview en el puerto 4173)
const { chromium, devices } = require('playwright');
const path = require('path');
const datos = require(path.join(__dirname, '../src/data/countries.json'));
const destino = path.join(__dirname, '../docs/capturas');

// Progreso simulado: algunos países de Europa occidental y del sur ya trabajados,
// para que el mapa se vea coloreado como marcador.
const ahora = Date.now();
const tarjeta = (estabilidad, estado = 2) => ({
  due: new Date(ahora + 2 * 864e5).toISOString(), stability: estabilidad, difficulty: 5, elapsed_days: 1,
  scheduled_days: 2, reps: 4, lapses: 0, learning_steps: 0, state: estado, last_review: new Date(ahora).toISOString(),
});
const niveles = { FRA: 9, DEU: 9, ESP: 9, ITA: 9, PRT: 9, BEL: 3, NLD: 3, CHE: 3, AUT: 1 };
const tarjetas = {};
for (const [id, s] of Object.entries(niveles)) tarjetas[id] = tarjeta(s, s >= 1 ? 2 : 1);
const historial = [];
for (let d = 13; d >= 0; d--) {
  const n = [6, 0, 9, 12, 0, 8, 15, 10, 0, 7, 14, 11, 9, 13][13 - d];
  for (let i = 0; i < n; i++) {
    historial.push({ t: new Date(ahora - d * 864e5 - i * 6e4).toISOString(), pais: ['FRA', 'DEU', 'BEL', 'NLD', 'AUT'][i % 5], modo: 'elegir', res: i % 4 === 0 ? 'fallo' : 'acierto', ms: 4000, nota: 3 });
  }
}
const estado = {
  version: 1, tarjetas, historial, trucosPropios: {}, regionesCelebradas: [], ultimaRegion: 'europa-occidental',
  guiaVista: true, bienvenidaVista: true,
  ajustes: { opcionalesActivados: [], listaExamen: null, fechaExamen: null, trucosDesactivados: [], trucosEditados: {}, pinHash: null, todasDesbloqueadas: true },
};
void datos;

(async () => {
  const b = await chromium.launch();
  const preparar = async (perfil) => {
    const ctx = await b.newContext({ ...perfil, deviceScaleFactor: 1, colorScheme: 'light' });
    await ctx.addInitScript((e) => localStorage.setItem('progreso-capitales', e), JSON.stringify(estado));
    const p = await ctx.newPage();
    await p.goto('http://localhost:4173/');
    await p.waitForSelector('.pais');
    await p.waitForTimeout(400);
    return p;
  };

  // 1. Escritorio: Repaso con el mapa coloreado.
  const pc = await preparar({ viewport: { width: 1280, height: 760 } });
  await pc.screenshot({ path: `${destino}/repaso-escritorio.png` });

  // 2. Móvil: Explorar con un truco.
  const movil = await preparar({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  await movil.locator('.modo[data-modo="explorar"]').click();
  await movil.locator('.chip', { hasText: 'Países Bajos' }).click();
  await movil.waitForTimeout(300);
  await movil.screenshot({ path: `${destino}/explorar-movil.png` });

  // 3. Panel para adultos: resumen.
  await pc.locator('#boton-mas').click();
  await pc.getByRole('button', { name: 'Panel para adultos', exact: true }).click();
  await pc.getByPlaceholder('Nuevo PIN (4 a 6 cifras)').fill('2468');
  await pc.getByPlaceholder('Repite el PIN').fill('2468');
  await pc.getByRole('button', { name: 'Crear PIN' }).click();
  await pc.waitForTimeout(300);
  await pc.locator('dialog[open]').screenshot({ path: `${destino}/panel-adultos.png` });

  await b.close();
  console.log('capturas en', destino);
})();

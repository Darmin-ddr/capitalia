import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string;
/**
 * Identificador de la compilación: la app lo compara con `version.json` del servidor para
 * saber si hay una nueva. Es una huella del contenido de la app (código, página, ficheros
 * públicos, versión y dependencias), no de la hora: así, publicar solo cambios en el README,
 * los documentos, las pruebas o los scripts no hace saltar el aviso de "versión nueva".
 * Se normalizan los saltos de línea para que salga igual en Windows y en GitHub.
 * CAPITALIA_COMPILACION_EXTRA (solo para pruebas) fuerza una huella distinta.
 */
function huellaDeLaApp(): string {
  const raiz = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const ficheros: string[] = ['index.html', 'vite.config.ts'];
  const recorrer = (dir: string) => {
    for (const nombre of readdirSync(join(raiz, dir))) {
      const ruta = `${dir}/${nombre}`;
      if (statSync(join(raiz, ruta)).isDirectory()) recorrer(ruta);
      else ficheros.push(ruta);
    }
  };
  recorrer('src');
  recorrer('public');
  const paquete = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
  const h = createHash('sha256');
  h.update(JSON.stringify({ version: paquete.version, dependencies: paquete.dependencies }));
  for (const f of ficheros.sort()) {
    h.update(f);
    h.update(readFileSync(join(raiz, f)).toString('latin1').split('\r\n').join('\n'));
  }
  h.update(process.env.CAPITALIA_COMPILACION_EXTRA ?? '');
  return h.digest('hex').slice(0, 12);
}
const compilacion = huellaDeLaApp();

/** Publica `version.json` con la versión y la compilación (no va en la copia sin conexión: se pide siempre a la red). */
const ficheroVersion = {
  name: 'capitalia-version-json',
  generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, compilacion }) });
  },
};

export default defineConfig({
  // Rutas relativas: la web funciona en cualquier subcarpeta (p. ej. GitHub Pages)
  // sin depender del nombre del repositorio.
  base: './',
  // Versión y fecha de compilación, para "Acerca de".
  define: {
    __VERSION__: JSON.stringify(version),
    __FECHA_COMPILACION__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    __COMPILACION__: JSON.stringify(compilacion),
  },
  plugins: [
    ficheroVersion,
    VitePWA({
      // El service worker se actualiza solo. La página va "primero la red" (ver workbox): con
      // conexión se abre siempre la última versión; sin ella, la guardada.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icono.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Capitalia: capitales sobre el mapa',
        short_name: 'Capitalia',
        description: 'Aprende las capitales del mundo sobre el mapa.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f6f4ef',
        theme_color: '#2f62a8',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todo empaquetado y disponible sin conexión (incluido el mapa, que va dentro del JS).
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // La página (index.html) no sale de la copia guardada: "primero la red" (abajo).
        // Sin esto, "./" se serviría de la copia y la versión nueva tardaría una apertura.
        directoryIndex: null,
        // vite-plugin-pwa añade por defecto una regla que sirve la página guardada a todas las
        // navegaciones; iría antes que "primero la red" y ganaría siempre. Se desactiva.
        navigateFallback: null,
        runtimeCaching: [
          {
            // La página: con conexión, siempre la última (esperando como mucho 3 s); si no
            // llega, la última guardada; y si no hay ninguna, la de la copia sin conexión.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'capitalia-pagina',
              networkTimeoutSeconds: 3,
              precacheFallback: { fallbackURL: 'index.html' },
            },
          },
          {
            // Código y estilos de una versión nueva que aún no está en la copia: se guardan
            // al cargarlos, para que sin conexión no falte nada justo después de actualizar.
            urlPattern: ({ url }) => url.pathname.includes('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'capitalia-recursos', expiration: { maxEntries: 40 } },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});

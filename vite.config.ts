import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string;

export default defineConfig({
  // Rutas relativas: la web funciona en cualquier subcarpeta (p. ej. GitHub Pages)
  // sin depender del nombre del repositorio.
  base: './',
  // Versión y fecha de compilación, para "Acerca de".
  define: {
    __VERSION__: JSON.stringify(version),
    __FECHA_COMPILACION__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    VitePWA({
      // La nueva versión se instala sola en segundo plano y se usa en la siguiente apertura.
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
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas: la web funciona en cualquier subcarpeta (p. ej. GitHub Pages)
  // sin depender del nombre del repositorio.
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});

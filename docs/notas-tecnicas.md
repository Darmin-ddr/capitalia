# Notas técnicas (memoria de trabajo)

## Estructura
- `src/logic/`: lógica pura con tests (`tests/`). Nada de DOM.
- `src/map/mapa.ts`: mapa SVG (d3-geo + world-atlas 50m). Kosovo desactivado se une a Serbia con `topojson.merge`.
- `src/ui/`: interfaz sin framework. `comun.ts` tiene el feedback compartido.
- `src/data/countries.json` y `regions.json`; `src/data/index.ts` los exporta tipados.

## Comandos
- `npm test`, `npm run build`, `npx vite preview --port 4173 --strictPort` (en segundo plano).
- Pruebas en navegador: `node scripts/prueba-modos.cjs <carpeta-capturas>` con el preview levantado.
  Ojo: para tocar países usar `locator.dispatchEvent('click')`, no `tap()`: el centro del
  rectángulo de Croacia cae en Bosnia.
- No usar `pkill -f "vite preview"` en la misma orden que otras cosas: mata la propia shell (código 144).

## Datos
- Coordenadas: GeoNames vía el fichero `cities.pbf` del paquete npm `all-the-cities` (no se puede ejecutar
  su código; se decodifica con `python3 -I scripts/geonames-capitales.py <ruta>/cities.pbf`, editando
  los códigos de país de la lista `want`). Descargar con `npm pack all-the-cities` en una carpeta aparte.
- Wikipedia y github.io están bloqueados desde este entorno.
- world-atlas: ids ISO numéricos como texto ("008"). Sin id: Kosovo, N. Cyprus, Somaliland, Indian Ocean Ter., Siachen Glacier.

## FSRS
- `ts-fsrs` 5.4.2: `fsrs(generatorParameters())`, `createEmptyCard(fecha)`, `f.next(card, fecha, Rating.X).card`.
  Rating: Again 1, Hard 2, Good 3, Easy 4. State: New 0, Learning 1, Review 2, Relearning 3.
  Con pasos de aprendizaje cortos: un Good nuevo -> Learning con due a 10 min; otro Good -> Review a 2 días.

## Scripts de prueba en navegador (todos con el preview en el puerto 4173)
- `scripts/prueba-modos.cjs <carpeta>`: los cuatro modos de Practicar en móvil, iPad y PC.
- `scripts/prueba-progreso.cjs <carpeta>`: repaso, guardado y truco propio.
- `scripts/prueba-regiones.cjs <carpeta> [movil]`: las 13 regiones con progreso simulado.
- `scripts/prueba-pwa.cjs <carpeta>`: sin conexión y copia por código.
- `scripts/prueba-panel.cjs <carpeta> [movil]`: panel de adultos y modo examen.
- `scripts/capturas-oscuro.cjs <carpeta>`: capturas en modo oscuro.
- `scripts/prueba-zoom.cjs <carpeta>`: zoom, arrastre, rueda y pellizco simulado.
- `scripts/prueba-accesibilidad.cjs`: objetivos táctiles de 44 px en todas las pantallas y recorrido con teclado.

## Mapa recortado
- La app usa `src/data/mapa-50m.json`, generado con `node scripts/recortar-mapa.cjs` a partir de world-atlas (dependencia de desarrollo). Si se añaden países fuera del recuadro, ampliar el recuadro del script y regenerar.

## Arquitectura de la interfaz (O1-O4)
- `src/ui/app.ts`: estado (progreso), región actual, mapa, pestañas, `Motor` (registrar respuestas, modo por dominio, trucos), avisos.
- `src/ui/ronda.ts`: controlador común de rondas de preguntas sueltas; `src/ui/preguntas.ts`: una función por modo (elegir, escribir, al revés).
- `src/ui/colocar.ts`: modo 3, aparte (va por tandas).
- `src/ui/repaso.ts` (sesión y examen), `practicar.ts`, `explorar.ts`, `regiones.ts` (selector), `mas.ts` (copia), `panel.ts` (adultos).
- Cambios de ajustes que afectan a los datos (Kosovo, examen, importar) recargan la página.

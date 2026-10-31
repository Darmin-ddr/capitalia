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

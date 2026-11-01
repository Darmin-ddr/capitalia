# Notas técnicas (memoria de trabajo)

## Estructura
- `src/logic/`: lógica pura con tests (`tests/`). Nada de DOM.
- `src/map/mapa.ts`: mapa SVG (d3-geo + world-atlas 50m). Kosovo desactivado se une a Serbia con `topojson.merge`.
- `src/ui/`: interfaz sin framework. `comun.ts` tiene el feedback compartido.
- `src/data/countries.json` y `regions.json`; `src/data/index.ts` los exporta tipados.

## Comandos
- `npm test`, `npm run build`, `npx vite preview --port 4173 --strictPort` (en segundo plano).
- Pruebas en navegador: `node scripts/prueba-hoy.cjs <carpeta-capturas>` (y las demás de la lista de abajo) con el preview levantado.
  Ojo: para tocar países usar `locator.dispatchEvent('click')`, no `tap()`: el centro del
  rectángulo de Croacia cae en Bosnia.
- No usar `pkill -f "vite preview"` en la misma orden que otras cosas: mata la propia shell (código 144).
- **Playwright no es dependencia del proyecto.** En la nube venía preinstalado. En Windows se instala aparte (`npm i playwright` y `npx playwright install chromium` en una carpeta fuera del repo) y se ejecutan los scripts con `NODE_PATH` apuntando a su `node_modules`.
- En Windows el repositorio tiene saltos de línea CRLF: al editar ficheros con scripts, normalizar o usar el editor para no ensuciar el diff.

## Datos
- Coordenadas: GeoNames vía el fichero `cities.pbf` del paquete npm `all-the-cities` (no se puede ejecutar
  su código; se decodifica con `python3 -I scripts/geonames-capitales.py <ruta>/cities.pbf`, editando
  los códigos de país de la lista `want`). Descargar con `npm pack all-the-cities` en una carpeta aparte.
- En el entorno en la nube, Wikipedia y github.io estaban bloqueados (por eso se usó GeoNames).
- world-atlas: ids ISO numéricos como texto ("008"). Sin id: Kosovo, N. Cyprus, Somaliland, Indian Ocean Ter., Siachen Glacier.

## FSRS
- `ts-fsrs` 5.4.2: `fsrs(generatorParameters())`, `createEmptyCard(fecha)`, `f.next(card, fecha, Rating.X).card`.
  Rating: Again 1, Hard 2, Good 3, Easy 4. State: New 0, Learning 1, Review 2, Relearning 3.
  Con pasos de aprendizaje cortos: un Good nuevo -> Learning con due a 10 min; otro Good -> Review a 2 días.

## Scripts de prueba en navegador (todos con el preview en el puerto 4173)
Las de la v2 (`prueba-aprender`, `prueba-hoy`, `prueba-examen`, `prueba-tema`) comprueban y dicen OK o FALLO en cada punto, y salen con código 1 si algo falla.
- `scripts/prueba-aprender.cjs <carpeta>`: escalones, Colocar por tandas, mapa mudo (medio punto, Holanda) en móvil y PC.
- `scripts/prueba-hoy.cjs <carpeta>`: primer día (nuevos dos veces, nunca seguidos) y sesión de tres regiones con rótulo.
- `scripts/prueba-examen.cjs <carpeta>`: examen de Europa (nota con medio punto, sin colores, priorizar en Hoy), "Las dos" por continentes y pestañas a 360 px.
- `scripts/prueba-tema.cjs <carpeta>`: tema Automático/Claro/Oscuro y capturas en oscuro.
- `scripts/prueba-instalar.cjs <carpeta>`: entrada "Instalar la app" y aviso de una vez (simula el evento de instalación de Chrome; iPhone muestra los pasos de Safari).
- `scripts/prueba-portada.cjs <carpeta>`: portada de Hoy (cifras, sin selector, mapa del continente), "Europa entera" (bloqueada, tandas de 16) y vuelta a la región elegida.
- `scripts/prueba-progreso.cjs <carpeta>`: Hoy, guardado y truco propio.
- `scripts/prueba-regiones.cjs <carpeta> [movil]`: las 13 regiones con progreso simulado y una tanda de Colocar en cada una.
- `scripts/prueba-pwa.cjs <carpeta>`: sin conexión y copia por código.
- `scripts/prueba-panel.cjs <carpeta> [movil]`: panel de adultos y lista de examen.
- `scripts/prueba-zoom.cjs <carpeta>`: zoom, arrastre, rueda y pellizco simulado.
- `scripts/prueba-accesibilidad.cjs`: objetivos táctiles de 44 px en todas las pantallas y recorrido con teclado.
- `scripts/prueba-guia.cjs <carpeta> [movil]`: bienvenida, guía del alumno (pregunta y taller), guía de adultos, casillas de continente del examen y Acerca de.
- `scripts/prueba-teclado-dialogos.cjs`: con un diálogo abierto, las teclas no responden la pregunta de detrás.
- `scripts/capturas-readme.cjs`: regenera las capturas del README en `docs/capturas/`.

## Otros scripts
- `scripts/generar-icono-svg.py` + `scripts/generar-iconos.cjs`: icono (mosaico de regiones con chincheta).
- `scripts/generar-paises.py`: genera `countries.json` desde la tabla de países y el TSV de GeoNames.
- `scripts/recortar-mapa.cjs`: mapa recortado (ver abajo).

## Mapa recortado
- Encuadre por región: `src/logic/encuadre.ts` quita los trozos pequeños y lejanos de cada país (ultramar) para encuadrar; se dibujan igual.
- Zoom: `src/logic/vista.ts` (0,6x a 8x, holgura del 35 % para desplazarse).
- La app usa `src/data/mapa-50m.json`, generado con `node scripts/recortar-mapa.cjs` a partir de world-atlas (dependencia de desarrollo). Si se añaden países fuera del recuadro, ampliar el recuadro del script y regenerar.

## Arquitectura de la interfaz (v2)
- `src/ui/app.ts`: estado (progreso), región actual, mapa, pestañas (Hoy, Aprender, Examen, Explorar), `Motor` (registrar respuesta en FSRS y en el escalón, trucos), avisos. Monta el mapa de la región, el de otra región cuando Hoy salta (con rótulo) y el mapa mudo del examen (sin colores ni selector de región).
- Regiones "continente entero": ids `continente-europa` y `continente-asia`, creadas en `app.ts` (no están en `regions.json`). `region` es la del mapa en cada momento y `regionElegida` la del selector.
- Lógica v2: `src/logic/portada.ts` (cifras de la portada, orden del curso), `src/logic/hoy.ts` (sesión de Hoy agrupada por regiones, nuevos autorregulados, `ColaHoy`), `progreso.ts` (escalones y migración desde la v1), `examen.ts` (ámbitos, corrección de mapa mudo con medio punto, nota), `texto.ts` (validación de capital y de país).
- `src/ui/hoy.ts`: bucle propio de preguntas (el mapa puede cambiar de región entre preguntas). `src/ui/aprender.ts`: escalera y tandas. `src/ui/examen.ts`: configuración, preguntas y nota.
- `src/ui/ronda.ts`: rondas de preguntas sueltas con mapa fijo (Aprender); `src/ui/preguntas.ts`: una función por tipo (elegir, escribir, al revés, mapa mudo).
- `src/ui/colocar.ts`: Colocar, aparte (va por tandas).
- `src/ui/explorar.ts`, `regiones.ts` (selector), `mas.ts` (copia y tema), `tema.ts` (Automático/Claro/Oscuro, guardado aparte del progreso), `panel.ts` (adultos).
- Medio punto en mapa mudo: "repasar" para FSRS y fallo para el escalón y la cola (`OpcionesRespuesta.escalon`).
- `src/ui/bienvenida.ts` (primer arranque y guía de adultos), `guia.ts` (guía del alumno), `acerca.ts` (versión y créditos; la autoría está en `AUTORIA`).
- Los atajos de teclado de las preguntas (`Teclado` en `comun.ts`) se ignoran mientras haya un `<dialog>` abierto.
- Cambios de ajustes que afectan a los datos (Kosovo, examen, importar) recargan la página.

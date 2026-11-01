# Plan hacia la v1.0 (trabajo autónomo)

Documento de trabajo para una sesión autónoma. El objetivo es llegar a una v1.0 usable; se prioriza **tener algo que funcione y corregir después** frente a la calidad perfecta.

Progreso: se marca cada objetivo (`[x]`) al cerrarlo, y se anota en [`informe-noche.md`](informe-noche.md).

## Cómo retomar (si la sesión se corta o se resume)

1. Leer `CLAUDE.md`, `SPEC.md`, este plan y `docs/informe-noche.md`.
2. `git log --oneline -20` para ver lo último hecho.
3. Seguir por el **primer objetivo sin marcar**. Si estaba a medias, comprobar qué falta con sus criterios.

## Memoria de trabajo (para sobrevivir a las compactaciones)

La conversación se resume sola cuando crece, y lo que solo esté "en la cabeza" se pierde. Por eso:

- **Escribir antes de seguir:** toda decisión, hallazgo relevante (p. ej. un dato que no cuadra, un bloqueo, un truco técnico que ha costado encontrar) o cambio de rumbo se anota **en el momento** en `docs/informe-noche.md`, no al final.
- **Sección "Ahora mismo"** al principio del informe: objetivo en curso, qué está hecho de él, qué falta y cuál es el siguiente paso concreto. Se actualiza cada vez que se cierra un paso.
- **Commit y push frecuentes:** como mínimo al cerrar cada paso relevante (no solo cada objetivo), incluyendo los cambios del informe. Nunca acumular más de una hora de trabajo sin subir.
- **Notas técnicas para mí** (cómo está organizado algo, comandos de prueba útiles, scripts de Playwright): en `docs/notas-tecnicas.md`, también con commit. Los scripts de prueba que merezca la pena conservar, en `scripts/`.
- **Tras una compactación:** releer este plan, el informe ("Ahora mismo" primero) y `git log` antes de tocar nada.

## Reglas

- **Fuente de verdad:** `SPEC.md` para el producto y los listados de `docs/listas/` para los datos. Países, nombres y capitales, exactamente como en los listados. **Nada de notas políticas ni nombres antiguos.** Variantes solo para grafías alternativas evidentes (Ljubljana, Kyiv, Beijing...).
- **Coordenadas de capitales:** GeoNames (código PPLC), como en los Balcanes, con su `geonamesId`. Si una no aparece, anotar y usar el mejor dato disponible, marcado.
- **Trucos:** pocos y buenos, todos con `revisado: false`. Si no sale uno bueno, ninguno.
- **Rama:** todo en `claude/hito-1-plan-7opthj` (Pages publica desde ella). Sin PR ni fusión con `main`. Se pueden usar ramas o agentes de apoyo si de verdad ayudan, pero el resultado acaba en esta rama.
- **Dependencias permitidas:** `ts-fsrs`, `vite-plugin-pwa`, una librería pequeña de QR. Otras, solo si son pequeñas y sin alternativa razonable; anotarlo.
- **Antes de cada push:** `npm run build` y `npm test` en verde. Probar en Chromium (Playwright, perfiles iPad, iPhone y PC) lo que se haya tocado.
- **Commits** pequeños, en español, con push al cerrar cada objetivo (o antes, si es largo).
- **Bloqueos:** tras dos intentos razonables, anotarlo en el informe y seguir con otra cosa.
- **Decisiones:** tomarlas sin esperar, anotando en el informe las opciones barajadas, la elegida, el porqué y si es fácil de revertir.
- **No adelantar** trabajo de un objetivo posterior si el anterior no cumple sus criterios mínimos, salvo bloqueo.

## Objetivos

### [x] O1. Progreso, FSRS y sesión (hito 3)

- Capa de almacenamiento local con manejo de errores (si falla o está vacía, la app funciona en memoria y lo indica discretamente). Datos con número de versión para poder migrar. `navigator.storage.persist()` si está disponible.
- Una tarjeta FSRS por país (`ts-fsrs`, parámetros por defecto). **"Al revés" comparte la tarjeta.**
- Nota deducida (SPEC 6): fallo → Again; errata, nombre antiguo o respuesta lenta → Hard; normal → Good; rápida en modos 4 y 5 → Easy; modo 2 como máximo Good; modo 3 como máximo Good. Umbrales de tiempo en un fichero de configuración, conservadores.
- Historial de respuestas (fecha, modo, resultado, tiempo).
- **Sesión normal** de unas 20 preguntas: primero las vencidas, luego unas pocas nuevas de la región; lo fallado vuelve a los pocos minutos (la cola actual, adaptada). Al terminar, opción de seguir.
- **Modo por dominio:** cada país sale en el modo que le toca según su progreso (nuevo → 2; algo aprendido → 3 o 5; consolidado → 4). Se puede seguir eligiendo modo a mano.
- **El mapa como marcador:** los países se colorean (pastel de la región) según su dominio.
- **Región dominada** (todas sus tarjetas con estabilidad de varios días, umbral configurable): confeti y desbloqueo de la siguiente región.
- Criterios: tests de nota deducida, selección de la sesión, cálculo de dominio y almacenamiento que falla. Recargar la página conserva el progreso.

### [x] O2. Datos completos de Europa y Asia (hito 4)

- Todos los países de los dos listados (unos 93 distintos; Rusia y Turquía están en ambos). Kosovo se mantiene opcional y desactivado.
- Regiones de 6 a 10 países, con nombre y color pastel, propuestas por mí y documentadas.
- Transcontinentales según SPEC 3.2 (cada uno en el mapa de los continentes donde lo pone el listado; una sola tarjeta).
- Mapa: selector de continente y región, con regiones desbloqueadas progresivamente (siempre se puede volver a las anteriores). Encuadre por región. Zoom y desplazamiento básicos si hacen falta para Asia.
- **Microestados** (Vaticano, Mónaco, San Marino, Liechtenstein, Andorra, Malta, Singapur, Baréin, Maldivas y los que se vea que hacen falta): círculo tocable de 44 px como mínimo.
- Natural Earth: revisar territorios que no coinciden con los listados (p. ej. el norte de Chipre) y tratarlos como Kosovo (unidos al país del listado). Anotarlo.
- Trucos: pocos, para familias de capitales que se confunden (Bratislava/Bucarest/Budapest, las "-stán"...).
- Criterios: los tests de datos (capital dentro de su país, nombres iguales al listado) pasan para Europa y Asia; todas las regiones se pueden jugar en todos los modos.

### [x] O3. PWA y exportar/importar (hito 6)

- `vite-plugin-pwa`: manifest, iconos (sencillos, generados por mí) y service worker. La app se instala y funciona sin conexión.
- Exportar e importar el progreso como fichero y como código de texto; QR si es sencillo.
- Criterios: el build genera el service worker; en Chromium, la app recarga sin red; exportar e importar conserva el progreso (con test de la lógica).

### [x] O4. Panel de adultos y modo examen (hito 5)

- Acceso con PIN (guardado como hash; es una cerradura de niños, no seguridad).
- Muestra: dominio por región, países que más se atascan, actividad reciente.
- Configura: lista de examen (filtro "solo examen"), opcionales (Kosovo), edición y desactivación de trucos, reinicio del progreso.
- **Modo examen:** fecha y regiones o lista; repasa sobre todo lo flojo; no cambia la planificación FSRS normal, solo registra los aciertos.
- Criterios: tests de la lógica de selección del modo examen y del PIN; flujo completo probado en Chromium.

### [ ] O5. Pulido (hito 7, lo que dé tiempo)

- Revisión visual de todas las pantallas en claro y oscuro, móvil, iPad y PC.
- Accesibilidad básica (contraste, teclado, objetivos de 44 px).
- Rendimiento: recortar el mapa a Europa y Asia si reduce mucho el peso.
- Repasar los textos de la interfaz (tono cercano y breve, español de España).

### [ ] O6. Informe final

- `docs/informe-noche.md` completo: lo hecho, lo que requiere atención, las decisiones (opciones, elección, motivo, reversibilidad) y la **lista de pruebas manuales** (sobre todo iPad, iPhone y Safari).
- Resumen en el chat con el enlace a la web y al informe.

**La v1.0 está lista** cuando se cumplen O1 a O4. O5 es lo que dé tiempo. O6 se hace siempre, aunque no se llegue a todo.

## Decisiones ya tomadas

- "Al revés" comparte tarjeta con el resto de modos (una tarjeta por país).
- El modo examen no altera la planificación FSRS normal; solo registra los aciertos.
- Sin notas políticas ni nombres antiguos: los listados mandan (decisión del responsable).
- Kosovo: opcional y desactivado por defecto, sin nota. Activable desde el panel. *(Decisión mía; reversible quitando su entrada de los datos.)*
- Erratas: se aceptan sin coral, con aviso, y el país se repite más tarde (decisión del responsable).
- Colocar: lo fallado vuelve en una tanda posterior (decisión del responsable).

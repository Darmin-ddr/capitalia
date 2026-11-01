# Plan v2: Hoy, Aprender y Examen

Rediseño acordado con el responsable (SPEC 4, 6 y 7). Rama de trabajo: `rediseno-hoy-aprender-examen` (no publica en Pages; se fusiona con la rama publicada al terminar y probar).

## Ahora mismo
- **Estado:** F1 a F5 terminadas en la rama `rediseno-hoy-aprender-examen`. **Sin fusionar** con la rama publicada: espera la aprobación del responsable.
- **Siguiente paso:** que el responsable la pruebe (en local con `npm run build` y `npx vite preview`) y, si le parece bien, fusionar con `claude/hito-1-plan-7opthj` para publicarla.
- **Pendientes que no bloquean:** el color del mapa sigue el dominio FSRS (no los escalones); el resumen del panel tampoco muestra escalones. Pruebas con el alumno en iPad y iPhone reales.

## Cómo retomar (tras una compactación o en otra sesión)
1. Leer `CLAUDE.md`, `SPEC.md` (secciones 3.3, 4, 6, 7), este plan y `docs/notas-tecnicas.md`.
2. `git log --oneline -15` en la rama `rediseno-hoy-aprender-examen`.
3. Seguir por la primera fase sin marcar; si estaba a medias, comprobar sus criterios.

## Modo de trabajo (el mismo que en la noche de la v1)
- **Autonomía:** el responsable confía en los avances; tomar decisiones sin preguntar y anotarlas en "Decisiones de implementación" (opción elegida, motivo, si se puede revertir), **en el momento**, no al final.
- **Memoria:** actualizar "Ahora mismo" al cerrar cada paso; commit y push tras cada paso relevante (nunca más de una hora sin subir).
- **Calidad antes de cerrar una fase:** `npm test`, `npx tsc --noEmit`, `npm run build` y prueba en navegador con Playwright (móvil, iPad y PC; claro y oscuro donde toque). Revisar capturas, no solo los recuentos.
- **Rama:** todo en `rediseno-hoy-aprender-examen`. **No fusionar con la rama publicada** (`claude/hito-1-plan-7opthj`, la que despliega Pages y usa el alumno) **hasta que el responsable lo apruebe**: al terminar F5, dejarlo listo y avisar.
- **Datos:** los listados de clase mandan (CLAUDE.md). Nada de notas políticas ni nombres antiguos.
- **Reglas de producto:** las de CLAUDE.md (sobrio, sin castigos, sin rachas, 44 px, teclado).

## Notas del entorno (Windows)
- Playwright no es dependencia del proyecto: está en la carpeta temporal de la sesión; ejecutar los scripts con `NODE_PATH` apuntando a su `node_modules` (si se pierde, `npm i playwright` y `npx playwright install chromium` en una carpeta fuera del repo).
- Preview: `npx vite preview --port 4173 --strictPort` en segundo plano.
- La herramienta PowerShell bloquea algunos textos largos (here-strings con `/**` o `*'`): escribir ficheros con el editor y hacer commit con `git commit -F <fichero>`.
- El repositorio usa CRLF en Windows: editar con el editor, no reescribir ficheros enteros desde scripts.
- Llega a veces un aviso repetido "Sigue con docs/plan-v1.md..." de una tarea programada antigua de otra sesión: el plan v1 está completo, así que se ignora sin hacer nada.

## Decisiones del responsable
- Tres modos: **Hoy** (rutina diaria con nuevos intercalados), **Aprender** (extra, por escalones) y **Examen** (mapa mudo del continente). Explorar se queda. Desaparecen Practicar y "Preparar examen".
- Escalones: Elegir → Colocar → Escribir → Mapa mudo; subir con dos aciertos separados. "Al revés" solo para variedad en Hoy.
- Examen: país y capital; medio punto si solo uno; los resultados cuentan para la planificación.
- Variantes de nombre de país; Holanda con aviso.
- Nuevos por día autorregulados entre 5 y 10.
- En Hoy el mapa puede saltar de región.
- Botón de tema claro/oscuro (Automático/Claro/Oscuro) en ⋯.

## Fases

### [x] F1. Lógica y datos (con tests)
- Variantes de nombre de país en los datos (`variantesPais`, `avisosPais`) y validación del nombre del país.
- Escalones por país en el estado (`aprendizaje`), con la regla de subida y paso a "aprendido".
- Migración del progreso v1: nivel FSRS 3 → aprendido; 2 → escalón Escribir; 1 → Colocar; sin empezar → nada.
- Sesión de Hoy: repasos vencidos de aprendidos + en curso + nuevos intercalados; prioridad de examen; nuevos autorregulados 5-10.
- Modo de cada pregunta en Hoy según el estado del país (incluye Al revés y Mapa mudo para variedad).
- Examen: selección de preguntas por ámbito y corrección con medio punto; registro en FSRS.

### [x] F2. Aprender
- Pestaña por región; cada país en su escalón; Colocar por tandas para los países en ese escalón.
- Pregunta de mapa mudo (estrella resaltada, país y capital).

### [x] F3. Hoy
- Sesión mezclada multirregión con transición de mapa y nombre de región; tiempo desde que el mapa está quieto.
- Nuevos intercalados; resumen al terminar.

### [x] F4. Examen
- Mapa del continente sin colores de progreso, con todas las estrellas; ámbito y número de preguntas; nota y lista de fallos.

### [x] F5. Navegación, tema y documentación
- Pestañas Hoy / Aprender / Examen / Explorar (comprobar que caben en móvil).
- Ajuste de tema en ⋯.
- Guías, README, SPEC, notas técnicas; panel de adultos (máximo de nuevos por día).
- Pruebas en navegador completas. La fusión con la rama publicada queda para cuando el responsable la apruebe.

## Decisiones de implementación
- **E1. Subida de escalón:** dos aciertos en el modo del escalón (Colocar admite Al revés, que es su versión suelta). Un fallo reinicia el contador sin bajar; una errata ni suma ni resta (`progreso.ts`, `registrarEscalon`).
- **E2. Región superada** (abre la siguiente): todos sus países en el escalón Escribir o más. Antes era "todos en repaso FSRS"; se acepta también eso para no bloquear a quien venga de la v1.
- **E3. Conversión de la v1:** dominado → aprendido; en repaso → Escribir; aprendiendo → Colocar. Se hace sola al cargar el progreso.
- **E4. Composición de Hoy:** 3 repasos de calentamiento; luego los nuevos repartidos entre el resto; cada nuevo sale dos veces, separado por 3 preguntas. Orden de los repasos: países priorizados (examen, fallados) y luego los más atrasados. Los nuevos salen primero de la región actual.
- **E5. Nuevos autorregulados:** con menos de 10 respuestas recientes, la media (7-8); 90 % de aciertos o más, el máximo (10); 80 %, unos 8; 70 %, 6; menos, 5. Con más de 40 repasos pendientes, 5. Se descuentan los países empezados hoy, para que dos sesiones el mismo día no doblen los nuevos.
- **E6. Tipo de pregunta de los aprendidos en Hoy:** al azar entre Mapa mudo, Escribir y Al revés; más Mapa mudo (50 %) cuando el país ya es estable.
- **E7. Corrección de Mapa mudo:** una errata o un aviso (Holanda) valen el punto en la nota, pero el país se repasa (cuenta como "repasar" para la planificación y no sube de escalón). Medio punto vale 0,5 en la nota y cuenta como "repasar" (Hard) para la planificación, como dice la SPEC 4.4; fuera del examen, para el escalón y la cola de la ronda cuenta como fallo (se vio en la prueba de F2: si no, un país podía quedar aprendido sin saberse la capital).
- **E8. Pregunta de mapa mudo fuera del examen:** solo la estrella, sin nombre y sin resaltar el país (SPEC 4.2); hay que escribir país y capital. Enter en el campo del país pasa al de la capital. Al corregir se muestra el nombre de la capital en el mapa.
- **E9. Tanda de Aprender:** una pregunta por cada país pendiente de la región, en el modo de su escalón; los de Colocar van juntos en el pool de capitales (si hay al menos dos; uno solo va como Al revés). Así los dos aciertos de un escalón llegan siempre en tandas distintas. Al terminar, resumen con quién sube y la escalera actualizada. Si la región está toda aprendida, se ofrece practicarla con mapa mudo.
- **E10. Practicar desaparece ya en F2:** la pestaña Aprender ocupa su sitio (las pestañas definitivas se ordenan en F5).
- **E11. Hoy agrupa por región:** para que el mapa salte poco, la sesión va por bloques de región: primero las regiones sin nuevos (por urgencia) y al final la de los nuevos, con ellos intercalados. En la prueba, 20 preguntas de tres regiones pasaron de 7 cambios de mapa a 3.
- **E12. Los países en aprendizaje salen en Hoy una vez al día:** si ya se respondieron hoy, esperan a mañana (como los pasos de aprendizaje de Anki). Sin esto, Hoy nunca quedaba "hecho".
- **E13. Reintento de un fallo en Hoy** (`ColaHoy`): dentro del bloque de su región (hasta 3 preguntas después); si el bloque se acaba, tras la última pregunta de esa región o al final. Así un fallo no hace ir y volver el mapa.
- **E14. Cambio de región en Hoy:** rótulo con el nombre de la región en la parte baja del mapa durante 1,1 s; el tiempo de la respuesta empieza a contar al terminar. Ese cambio no toca la "última región" guardada. Elegir otra región en el selector reinicia la sesión de Hoy (lo hecho ya está guardado).
- **E15. Prioridad:** un país priorizado (fallado en un examen) deja de serlo al acertarlo fuera del examen. La lista de examen del panel también prioriza en Hoy.
- **E16. "Las dos" (Europa y Asia) en el examen:** un mapa por continente, primero Europa y luego Asia, con rótulo al cambiar. Un solo mapa de los dos continentes no cabe en la proyección (recorta a 60° del centro) y los países quedarían diminutos. Con la lista del panel, igual: por continentes. Rusia y Turquía salen en el mapa del ámbito elegido (en "Las dos", en Europa).
- **E17. Examen sin corrección en el momento:** como en clase, se responde todo y al final se ve la nota y la lista de fallos (con lo que se escribió). En blanco vale como "no lo sé". El mapa mudo no lleva colores de región ni de progreso, tampoco mientras se responde; el selector de región se oculta durante el examen.
- **E18. Priorizar en Hoy es un botón** al final del examen ("Repasarlos antes en Hoy"), como pide la SPEC 4.4 ("opción de priorizarlos"). El examen cuenta para FSRS pero no mueve escalones.
- **E19. Pestañas en móvil:** Hoy, Aprender, Examen y Explorar más ⋯ caben en una fila desde 360 px (texto algo más pequeño por debajo de 380 px), con objetivos de 44 px.
- **E20. Versión 2.0.0** (se ve en Acerca de): cambia la estructura de la app. Se puede dejar en 1.x si se prefiere.
- **E21. Tema guardado aparte del progreso** (`localStorage`, clave `capitalia-tema`): es una preferencia del dispositivo, no del alumno; no viaja con la copia de seguridad.
- **E22. Se retiran `prueba-modos.cjs` y `capturas-oscuro.cjs`** (probaban Practicar); los sustituyen `prueba-aprender`, `prueba-hoy` y `prueba-tema`.


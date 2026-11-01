# Plan v2: Hoy, Aprender y Examen

Rediseño acordado con el responsable (SPEC 4, 6 y 7). Rama de trabajo: `rediseno-hoy-aprender-examen` (no publica en Pages; se fusiona con la rama publicada al terminar y probar).

## Memoria de trabajo
- Marcar cada fase (`[x]`) al cerrarla y anotar decisiones en "Decisiones" (abajo), en el momento.
- Commit y push tras cada paso relevante.
- Antes de cerrar una fase: `npm test`, `npm run build` y prueba en navegador (scripts en `scripts/`, ver `docs/notas-tecnicas.md`).

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

### [ ] F2. Aprender
- Pestaña por región; cada país en su escalón; Colocar por tandas para los países en ese escalón.
- Pregunta de mapa mudo (estrella resaltada, país y capital).

### [ ] F3. Hoy
- Sesión mezclada multirregión con transición de mapa y nombre de región; tiempo desde que el mapa está quieto.
- Nuevos intercalados; resumen al terminar.

### [ ] F4. Examen
- Mapa del continente sin colores de progreso, con todas las estrellas; ámbito y número de preguntas; nota y lista de fallos.

### [ ] F5. Navegación, tema y documentación
- Pestañas Hoy / Aprender / Examen / Explorar (comprobar que caben en móvil).
- Ajuste de tema en ⋯.
- Guías, README, SPEC, notas técnicas; panel de adultos (máximo de nuevos por día).
- Pruebas en navegador completas y fusión con la rama publicada.

## Decisiones de implementación
- **E1. Subida de escalón:** dos aciertos en el modo del escalón (Colocar admite Al revés, que es su versión suelta). Un fallo reinicia el contador sin bajar; una errata ni suma ni resta (`progreso.ts`, `registrarEscalon`).
- **E2. Región superada** (abre la siguiente): todos sus países en el escalón Escribir o más. Antes era "todos en repaso FSRS"; se acepta también eso para no bloquear a quien venga de la v1.
- **E3. Conversión de la v1:** dominado → aprendido; en repaso → Escribir; aprendiendo → Colocar. Se hace sola al cargar el progreso.
- **E4. Composición de Hoy:** 3 repasos de calentamiento; luego los nuevos repartidos entre el resto; cada nuevo sale dos veces, separado por 3 preguntas. Orden de los repasos: países priorizados (examen, fallados) y luego los más atrasados. Los nuevos salen primero de la región actual.
- **E5. Nuevos autorregulados:** con menos de 10 respuestas recientes, la media (7-8); 90 % de aciertos o más, el máximo (10); 80 %, unos 8; 70 %, 6; menos, 5. Con más de 40 repasos pendientes, 5. Se descuentan los países empezados hoy, para que dos sesiones el mismo día no doblen los nuevos.
- **E6. Tipo de pregunta de los aprendidos en Hoy:** al azar entre Mapa mudo, Escribir y Al revés; más Mapa mudo (50 %) cuando el país ya es estable.
- **E7. Corrección de Mapa mudo:** una errata o un aviso (Holanda) valen el punto en la nota, pero el país se repasa (cuenta como "repasar" para la planificación y no sube de escalón).

# Capitalia: especificación

Capitales de Europa y Asia. Versión 0.2 (31/10/2026). Documento vivo: actualizar cuando cambie una decisión.

Nombre provisional: Capitalia (repo `capitalia`). Puede cambiar más adelante; no acoplar el nombre en rutas o claves de almacenamiento difíciles de migrar.

## 1. Objetivo

Herramienta interactiva para que un alumno de 3º de ESO aprenda las capitales de Europa y Asia sobre un mapa político, con refuerzo positivo, trucos de memoria y repetición espaciada. Debe servir tanto para práctica diaria corta como para estudio intensivo antes de un examen.

## 2. Usuario y contexto

- Alumno de 3º de ESO (14 a 15 años). Requisito clave: **que no parezca infantil**. A esa edad rechazan rápido lo que parece de primaria o de los primeros cursos.
- Dispositivos: iPad, móvil y navegador de PC (Chrome). Todo debe funcionar con táctil y con ratón.
- Un adulto (padre/madre) consulta el progreso y configura la lista de examen.

## 3. Decisiones de producto (cerradas)

### 3.1 Estructura del contenido
- Europa y Asia **separadas**, cada una dividida en **regiones** de 6 a 10 países (p. ej. Europa nórdica, Balcanes, Asia central, Sudeste Asiático). La división concreta se define en los datos.
- Las regiones se desbloquean progresivamente; siempre se puede volver a las anteriores.
- **Lista base: los listados de clase** (material del colegio, 3º de ESO): `docs/listas/Europa.md` y `docs/listas/Asia.md`. Son la **fuente de verdad**: todo país que aparece en ellos está incluido y activo por defecto, con el nombre de país y de capital tal como figura en el listado. Fuera de los listados solo existen los opcionales desactivados de 3.2 (Kosovo).
- **Filtro "solo examen"**: el adulto marca qué países entran en un examen concreto (cuando se conozca la lista del libro o del profesor).

### 3.2 Casos especiales
- **Transcontinentales** (Rusia, Turquía, Kazajistán, Georgia, Armenia, Azerbaiyán, Chipre): cada uno aparece en el mapa del continente o continentes donde lo pone el listado de clase (Rusia y Turquía en ambos; Chipre en Europa; Georgia, Armenia, Azerbaiyán y Kazajistán en Asia). Siempre **una sola tarjeta con un solo progreso**.
- **Kosovo:** opcional, desactivado por defecto (España no lo reconoce y muchos libros españoles no lo incluyen). No figura en el listado de clase. Mientras está desactivado, el mapa dibuja su territorio unido al de Serbia, sin frontera interior (es como lo tratan los mapas que no incluyen Kosovo como país).
- **Taiwán:** incluido y activo por defecto, porque figura en el listado de clase (capital: Taipéi).
- **Palestina:** incluida. El listado da "Jerusalén Este / Ramala": se muestra así y se acepta cualquiera de las dos.
- **Israel:** Jerusalén, como en el listado.
- **Sin notas políticas.** Los listados de clase mandan: no se añaden notas, aclaraciones ni datos que no estén en ellos (decisión del responsable, 31/10/2026). El campo `nota` queda disponible pero vacío.

### 3.3 Nombres
- **Forma principal: la del listado de clase** (que en general sigue el criterio RAE/Fundéu: Pekín, Nueva Delhi, Hanói, Taskent, Astaná, Naipyidó...). Si la forma normativa difiere de la del listado (p. ej. Chisinau/Chisináu), se muestra la del listado y la normativa se acepta como variante.
- **Variantes aceptadas** en texto libre: Kiev/Kyiv, Pekín/Beijing, etc.
- **Nombres antiguos:** no se añaden (los listados mandan). La lógica para aceptarlos con aviso existe, pero el campo `antiguos` queda vacío salvo decisión expresa del responsable. Tampoco se acepta Colombo para Sri Lanka.
- Texto libre tolerante: sin exigir tildes, mayúsculas, espacios ni guiones, y con margen para erratas pequeñas (distancia de edición ajustada a la longitud del nombre: 0 hasta 4 letras, 1 de 5 a 8, 2 desde 9; dos letras intercambiadas cuentan como un solo error). Si lo escrito se parece tanto o más a otra capital, es fallo.
- **Erratas** (y nombres antiguos, si algún día se añaden): no se marcan como fallo (sin coral), pero se avisa de la forma correcta y el país **se repite más tarde en la sesión, como si fuera un fallo**. No lanzan confeti al acertarse después y cuentan como "a la primera" en el resumen.

## 4. Modos de juego (niveles de dificultad)

1. **Explorar:** tocar un país muestra su capital y su truco. Sin evaluación.
2. **Elegir entre opciones:** país marcado en el mapa, 4 capitales posibles. Distractores preferentemente de la misma región.
3. **Pool de capitales:** tandas de 5 capitales para colocar en su país. Una capital mal colocada vuelve en una tanda posterior. Todos los países de la región se pueden tocar siempre (no solo los de la tanda), para que no se acierte por descarte. Interacción "toca la capital, luego toca el país" (más fiable que arrastrar en iPad y móvil). Arrastrar puede añadirse como alternativa en PC.
4. **Texto libre:** escribir la capital del país marcado.
5. **Al revés:** se muestra una capital y hay que tocar el país en el mapa.

Cada país avanza por los modos según su dominio; el alumno también puede elegir modo libremente.

## 5. Pedagogía y feedback

### 5.1 Acierto
- Animación breve y discreta.
- Celebración mayor (confeti corto) solo al **dominar una región** o al **acertar una capital que antes había fallado** (momento clave del aprendizaje).

### 5.2 Fallo
- Decir con claridad que no es correcto, **sin castigo** y **sin rojo intenso**.
- Mostrar la capital correcta en el mapa, el truco asociado y un mensaje tipo: "Acuérdate de [truco]. En seguida tendrás otra oportunidad 😉".
- El país vuelve a salir pocos minutos después dentro de la misma sesión.

### 5.3 Trucos de memoria
- Tipos variados: historia loca breve (pocas palabras, absurda y visual), juego de palabras, comparación visual, familias de capitales parecidas (Bratislava/Bucarest/Budapest, las "-stán").
- **Calidad antes que cantidad:** mejor pocos trucos buenos que uno forzado por país. Un país puede no tener truco.
- **Trucos propios:** botón "inventa tu truco". El truco del alumno se guarda y sustituye al predefinido (efecto de generación).
- El adulto puede editar o desactivar trucos desde el panel.

### 5.4 Guía para aprender
- **Primer arranque**: "¿Quién la está abriendo ahora?". El alumno va a su guía; la madre o el padre, a una **guía breve para adultos** (cómo funciona, qué se configura en el panel, instalar y copia de seguridad, cómo ayudar sin presionar) que termina en "Configurar ahora" (abre el panel) o "Pasar al alumno". Las dos guías están siempre en el botón ⋯.
- **"Cómo aprender con Capitalia"**: guía breve dirigida al alumno, en tono cercano y sin infantilizar. Se abre sola la primera vez que la usa el alumno.
- Explica el uso de la app y **cómo aprender con ella**: práctica de recuerdo (intentar antes de mirar), repaso espaciado (poco y a menudo), el valor de los errores, la dificultad deseable de los modos, y técnicas para fabricar trucos propios (a qué te suena, imagen exagerada, significado, parejas y familias).
- Dos partes interactivas: una pregunta sobre cómo repartir el estudio y un **taller** que guía paso a paso para inventar un truco y guardarlo como truco propio (propone el país que más se ha fallado de la región).
- **"Acerca de"**: versión, autoría y créditos de datos y librerías (GeoNames exige atribución por su licencia CC BY).

### 5.5 Lo que NO incluimos
- Sin rachas de días ni ninguna mecánica que castigue no entrar.
- Sin síntesis de voz.
- Sin mascota.

## 6. Repetición espaciada

- **Entre días:** FSRS mediante la librería `ts-fsrs`, parámetros por defecto. Una tarjeta por país (país a capital). El modo "al revés" puede compartir tarjeta o tener la suya; **decidido: comparte la tarjeta del país** (ver `docs/informe-noche.md`, D2).
- **Dentro de la sesión:** cola corta de reaprendizaje; lo fallado reaparece a los pocos minutos.
- **Nota FSRS deducida, nunca preguntada:**
  - Fallo: Again.
  - Acierto con pista, con aviso de nombre antiguo o tras mucho tiempo: Hard.
  - Acierto normal: Good.
  - Acierto rápido en modos 4 o 5: Easy.
  - Los umbrales de tiempo son configurables; empezar conservador.
- Los aciertos en modo 2 (opciones) cuentan menos que los de modos 4 y 5: como máximo Good.
- Incertidumbre conocida: con unas 100 tarjetas, la ventaja de FSRS frente a un Leitner simple probablemente sea modesta. Se usa porque el coste es bajo.

## 7. Sesiones

- **Sesión normal:** corta (objetivo orientativo: unos 10 minutos o unas 20 preguntas), con opción de seguir al terminar.
- **Modo examen:** se elige fecha y regiones/lista. Repasa sobre todo lo flojo. No debe alterar la planificación FSRS normal salvo para registrar aciertos (**decidido:** los fallos en modo examen solo van al historial; los aciertos actualizan la tarjeta. El examen se prepara región a región; ver `docs/informe-noche.md`, D13 y D14).

## 8. Panel de adultos

- Protegido con **PIN** (guardado como hash). Es una cerradura de niños, no seguridad real: todo es local.
- Muestra: dominio por región, países que más se atascan, actividad reciente.
- Configura: lista de examen (con casillas para marcar Europa o Asia enteras, o una región entera), países opcionales (Kosovo; Taiwán está en el listado y siempre activo), desbloqueo de todas las regiones, edición de trucos, reinicio de progreso.

## 9. Persistencia y dispositivos

- Todo en local (IndexedDB o localStorage). Sin cuentas ni servidor.
- **Exportar/importar progreso** mediante código o fichero (y QR si es sencillo). Sirve para pasar progreso entre dispositivos y como copia de seguridad.
- Pedir almacenamiento persistente (`navigator.storage.persist()`) cuando esté disponible.
- Nota iOS: Safari puede borrar datos de webs no visitadas en unos días; las webs añadidas a pantalla de inicio deberían estar exentas según WebKit (confianza media). De ahí la importancia del export.
- Sincronización con backend: fuera de alcance en v1.

## 10. Estilo visual: "atlas amable"

- Mapa escolar limpio. Lo divertido viene de las historias y del progreso, no de la decoración.
- **El mapa es el marcador de progreso:** países en gris claro que se colorean (pastel por región) según se dominan.
- Feedback: verde menta (acierto), coral/ámbar (fallo). Nunca rojo intenso.
- Tipografía redondeada y legible (p. ej. Nunito), tamaños generosos.
- Capital marcada con estrella pequeña. Microestados (Vaticano, Mónaco, San Marino, Liechtenstein, Andorra, Malta, Singapur, Baréin, Maldivas...) con círculo ampliado y tocable; zoom/pan en el mapa.
- Distribución: en móvil, mapa arriba y tarjeta de pregunta abajo; en iPad y PC, mapa a la izquierda y panel a la derecha.
- Modo oscuro automático.
- Objetivos táctiles amplios (mínimo 44 px).

## 11. Técnica (propuesta, revisable)

- **PWA estática** desplegada en **GitHub Pages** (GitHub Actions). Instalable y funcional sin conexión (service worker).
- Stack propuesto: Vite + TypeScript, sin framework pesado (o uno ligero si se justifica). `vite-plugin-pwa` para manifest y service worker.
- Mapa: geometrías de Natural Earth (p. ej. paquete `world-atlas` en TopoJSON) renderizadas en SVG con d3-geo. Resolución suficiente para que los países pequeños existan como forma (50m o superior). Ojo: Natural Earth aplica sus propios criterios en fronteras disputadas; revisar cómo se muestran los casos de 3.2.
- Datos de países en JSON versionado en el repo (ver sección 12).
- Sin dependencias de red en tiempo de ejecución: todo empaquetado.

## 12. Modelo de datos (borrador)

`countries.json`, una entrada por país:
- `id`: código ISO 3166-1 alfa-3.
- `nombre`: nombre normativo en español.
- `capital`: nombre normativo.
- `variantes`: otras formas aceptadas sin aviso.
- `antiguos`: formas aceptadas con aviso de actualización.
- `continentes`: ["europa"], ["asia"] o ambos.
- `region`: identificador de región.
- `capitalCoords`: [lon, lat].
- `opcional`: true si está desactivado por defecto.
- `nota`: texto neutro opcional.
- `trucos`: lista de { tipo, texto }.

Progreso (local): estado FSRS por tarjeta, nivel/modo por país, historial de respuestas (fecha, modo, acierto, tiempo, pista), trucos propios, configuración y hash del PIN.

## 13. Hitos

1. **Prototipo de una región** (p. ej. Europa nórdica o Balcanes): mapa, modos 1 y 2, feedback. Probar en iPad.
2. Resto de modos (3, 4, 5) y validación tolerante de texto.
3. FSRS + cola de sesión + progreso persistente.
4. Datos completos de Europa y Asia, con trucos revisados.
5. Panel de adultos, lista de examen, modo examen.
6. PWA, despliegue en GitHub Pages, export/import.
7. Pulido visual y pruebas con el usuario real.

## 14. Pendiente

- ~~Curso exacto~~: 3º de ESO. Listados de clase recibidos (`docs/listas/`); falta saber si habrá listas de examen más reducidas.
- División definitiva en regiones.
- Revisión de todos los trucos por un adulto antes de dárselos al alumno.

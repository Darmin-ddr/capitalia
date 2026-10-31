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
- **Lista base:** estados miembros de la ONU de Europa y Asia, más los casos especiales de 3.2.
- **Listados de clase** (material de 3º de ESO): `docs/listas/Europa.md` y `docs/listas/Asia.md`. Son la referencia de qué países y qué forma del nombre espera el profesor. Las discrepancias con la lista base o con el criterio RAE/Fundéu se resuelven caso a caso y se documentan.
- **Filtro "solo examen"**: el adulto marca qué países entran en un examen concreto (cuando se conozca la lista del libro o del profesor).

### 3.2 Casos especiales
- **Transcontinentales** (Rusia, Turquía, Kazajistán, Georgia, Armenia, Azerbaiyán, Chipre): aparecen en ambos mapas, pero son **una sola tarjeta con un solo progreso**.
- **Kosovo:** opcional, desactivado por defecto (España no lo reconoce y muchos libros españoles no lo incluyen).
- **Taiwán:** opcional, desactivado por defecto.
- **Palestina:** incluida, con nota breve y neutra sobre la capital (Jerusalén Este reclamada, Ramala sede administrativa).
- **Israel:** Jerusalén, con nota breve y neutra (la mayoría de embajadas están en Tel Aviv).
- Las notas son informativas, sin valoraciones. Revisar estos datos antes de cada versión publicada: son de actualidad.

### 3.3 Nombres
- **Español normativo** (criterio RAE/Fundéu): Pekín, Nueva Delhi, Hanói, Taskent, Astaná, Naipyidó...
- **Variantes aceptadas** en texto libre: Kiev/Kyiv, Pekín/Beijing, etc.
- **Nombres antiguos** (Rangún, Nursultán...): se aceptan con aviso amable, p. ej. "¡Casi! Ahora se llama Astaná". Motivo: los libros escolares a veces están desactualizados.
- Texto libre tolerante: sin exigir tildes ni mayúsculas, y con margen para erratas pequeñas (distancia de edición baja, ajustada a la longitud del nombre).

## 4. Modos de juego (niveles de dificultad)

1. **Explorar:** tocar un país muestra su capital y su truco. Sin evaluación.
2. **Elegir entre opciones:** país marcado en el mapa, 4 capitales posibles. Distractores preferentemente de la misma región.
3. **Pool de capitales:** 5 o 6 capitales por ronda para colocar en su país. Interacción "toca la capital, luego toca el país" (más fiable que arrastrar en iPad y móvil). Arrastrar puede añadirse como alternativa en PC.
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

### 5.4 Lo que NO incluimos
- Sin rachas de días ni ninguna mecánica que castigue no entrar.
- Sin síntesis de voz.
- Sin mascota.

## 6. Repetición espaciada

- **Entre días:** FSRS mediante la librería `ts-fsrs`, parámetros por defecto. Una tarjeta por país (país a capital). El modo "al revés" puede compartir tarjeta o tener la suya; decidir en implementación y documentar.
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
- **Modo examen:** se elige fecha y regiones/lista. Repasa sobre todo lo flojo. No debe alterar la planificación FSRS normal salvo para registrar aciertos (decidir en implementación y documentar).

## 8. Panel de adultos

- Protegido con **PIN** (guardado como hash). Es una cerradura de niños, no seguridad real: todo es local.
- Muestra: dominio por región, países que más se atascan, actividad reciente.
- Configura: lista de examen, países opcionales (Kosovo, Taiwán), edición de trucos, reinicio de progreso.

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

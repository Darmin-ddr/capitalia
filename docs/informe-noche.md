# Informe del trabajo autónomo hacia la v1.0

Se va rellenando según avanza el trabajo (ver [`plan-v1.md`](plan-v1.md)).

## Ahora mismo

- **Objetivo en curso:** O5 (pulido).
- **Hecho de él:** nada aún.
- **Falta:** revisión visual (claro/oscuro, móvil/iPad/PC), accesibilidad básica, peso del mapa, textos.
- **Siguiente paso:** capturas de todas las pantallas en modo oscuro y revisión.

## Estado

| Objetivo | Estado |
|---|---|
| O1. Progreso, FSRS y sesión | Hecho |
| O2. Datos completos | Hecho |
| O3. PWA y exportar/importar | Hecho |
| O4. Panel de adultos y modo examen | Hecho |
| O5. Pulido | Pendiente |
| O6. Informe final | Pendiente |

## Lo hecho

### O1. Progreso, FSRS y sesión
- El progreso se guarda en el navegador (una tarjeta FSRS por país, historial de respuestas, trucos propios, última región). Si el navegador no deja guardar, la app avisa y sigue en memoria. Se pide almacenamiento persistente.
- Nueva pestaña **Repaso** (la que se abre al entrar): sesión de hasta 20 países por prioridad, cada uno en el modo que le toca según su dominio. Al terminar, "Seguir practicando".
- **Practicar** mantiene la elección manual de modo; todos los modos registran progreso.
- **El mapa es el marcador:** cada país se colorea con el pastel de su región en tres intensidades según el dominio. El resto del continente se ve atenuado, también con su progreso.
- **Región dominada:** confeti y aviso (una sola vez por región). **Región nueva desbloqueada:** aviso.
- **Inventa tu truco** en Explorar: el truco propio sustituye al predefinido en todos los modos; se puede volver al original.
- Probado en Chromium (iPad): repaso completo, recarga con progreso conservado y países coloreados, truco propio guardado; los cuatro modos de práctica siguen completando rondas en móvil, iPad y PC. 57 tests.

### O2. Datos completos de Europa y Asia
- **94 países** en `src/data/countries.json`: los 46 del listado de Europa y los 49 de Asia (Rusia y Turquía están en ambos), más Kosovo opcional y desactivado. Nombres y capitales copiados del listado; un test lo comprueba fila a fila en los dos listados.
- **Coordenadas** de GeoNames para todas las capitales (script `scripts/geonames-capitales.py`, datos en `scripts/capitales-geonames.tsv`, generación en `scripts/generar-paises.py`).
- **13 regiones** (6 de Europa, 7 de Asia) con su color. Ver D8.
- **Selector de región** en la cabecera (en móvil, sobre la esquina del mapa): lista por continente, con progreso y candado en las bloqueadas.
- **Mapa:** encuadre por región (los países enormes y los transcontinentales invitados cuentan solo por su capital), círculos tocables para países diminutos (también archipiélagos como Maldivas), norte de Chipre unido a Chipre.
- **Trucos nuevos** (todos sin revisar): Budapest, Astaná, Dusambé, Taskent, Tokio, Pekín, Reikiavik, Ámsterdam, Islamabad, Kuala Lumpur, Ulán Bator, Riad y "la capital se llama igual que el país" (Mónaco, San Marino, Luxemburgo, Kuwait, Singapur, Vaticano).
- **Variantes** añadidas solo para transliteraciones evidentes (Beijing, Kyiv, Tbilisi, Dhaka, Phnom Penh...). Ver la lista en `scripts/generar-paises.py`.
- Probado en Chromium (iPad y móvil): las 13 regiones se abren, todos sus países se pueden tocar y "Al revés" acierta 3 de 3 en cada una. 62 tests.

### O3. PWA y exportar/importar
- **Instalable y sin conexión:** `vite-plugin-pwa` genera el manifest y un service worker que guarda toda la app (unos 990 KB, mapa incluido). Las versiones nuevas se instalan solas en segundo plano y se usan al volver a abrir.
- **Iconos:** estrella blanca sobre el azul de la app (`public/`, generados con `scripts/generar-iconos.cjs`).
- **Botón ⋯ (Más)** en la cabecera: copia de seguridad con "Descargar copia" (fichero JSON con todo, historial incluido), "Copiar código" (texto sin historial, para pasar el progreso a otro dispositivo) e importación de código o fichero, con confirmación antes de sustituir el progreso.
- Probado en Chromium (móvil): la página queda controlada por el service worker, recarga sin red, y exportar código, borrar el progreso e importar lo recupera. 67 tests.

### O4. Panel de adultos y modo examen
- **Panel para adultos** (botón ⋯ → Panel para adultos), protegido con PIN de 4 a 6 cifras (guardado como hash SHA-256). Si se olvida el PIN, se puede borrar a cambio de volver a los ajustes iniciales; el progreso del alumno se conserva.
- **Resumen:** barra de dominio por región (sin empezar, aprendiendo, en repaso, dominados), los países que más fallos han tenido en 30 días y un gráfico de actividad de 14 días.
- **Examen:** fecha y casillas por región y país. Las regiones con países del examen se desbloquean y llevan 📝 en el selector.
- **Trucos:** editar o desactivar el truco de cualquier país (por región). Si el alumno tiene truco propio, se indica.
- **Ajustes:** países opcionales (Kosovo), cambiar PIN y reiniciar progreso (doble confirmación; conserva ajustes y trucos propios).
- **Modo examen:** en Repaso aparece "Preparar examen" cuando hay examen: pregunta los países del examen de la región actual, de más flojo a más sólido, cada uno en el modo de su nivel. Los fallos no tocan la planificación FSRS; los aciertos sí.
- Probado en Chromium (iPad y móvil) el flujo completo: crear PIN, resumen, examen, editar truco, activar Kosovo, preparar examen con un fallo (tarjeta sin cambios), PIN incorrecto. 75 tests.

## Requiere tu atención

- **Revisar los trucos** (todos marcados `revisado: false`). Varios son etimologías que he escrito de memoria y no he podido contrastar con una fuente desde aquí (p. ej. Podgorica «al pie de la colina», Dusambé «lunes», Ulán Bator «héroe rojo», Kuala Lumpur «confluencia fangosa»). Si alguno no te convence, se borra.
- **División en regiones** (D8): es una propuesta mía. Si el libro las agrupa de otra forma, se cambia en `regions.json` y en `scripts/generar-paises.py`.
- **Progreso de pruebas anteriores:** como ahora la primera región de Europa es "Europa del sur", quien hubiera practicado los Balcanes los encontrará bloqueados hasta superar las regiones anteriores (el progreso no se pierde).
- **Coordenadas que no son el PPLC de GeoNames:** Sri Lanka (uso Sri Jayewardenepura Kotte, porque GeoNames marca Colombo como capital), Palestina (uso Ramallah) e Israel (Jerusalem aparece como PPLA). Solo afectan a dónde se dibuja la estrella.

## Decisiones tomadas

*(para cada una: opciones barajadas, elección, motivo, implicaciones y reversibilidad)*

### D1. Niveles de dominio y desbloqueo de regiones (O1)
- **Opciones:** (a) desbloquear la siguiente región solo cuando la actual esté *dominada* (estabilidad FSRS de varios días); (b) desbloquearla cuando todos sus países estén *en repaso* (acertados y graduados del aprendizaje inicial).
- **Elección:** (b). Cuatro niveles por país: 0 sin empezar, 1 aprendiendo, 2 en repaso, 3 dominado (estabilidad >= 5 días, ajustable en `src/logic/config.ts`). Se abre la siguiente región cuando todos los países de la anterior están en nivel 2 o más; el confeti de región sale al llegar todos a nivel 3.
- **Motivo:** con (a), la siguiente región tardaría días en abrirse aunque el alumno ya se supiera la actual; para preparar un examen es demasiado lento.
- **Reversibilidad:** total; es una función (`regionesDesbloqueadas`) y un umbral.

### D2. Modo según dominio (O1)
- **Elección:** nivel 0-1: elegir entre opciones; nivel 2: al revés; nivel 3: escribir. El modo 3 (colocar) va por tandas y no encaja en una sesión de preguntas sueltas: queda para elegirlo a mano.
- **Motivo:** progresión de reconocer, a situar, a recordar sin ayuda (SPEC 4).
- **Reversibilidad:** total (`modoSegunDominio`).

### D3. Nota FSRS del modo colocar y umbrales de tiempo (O1)
- **Elección:** colocar, como elegir, da como máximo Good (el SPEC solo lo dice del modo 2; colocar también tiene la respuesta a la vista). Lento (Hard): más de 12 s en elegir y al revés, 15 s en colocar, 20 s en escribir. Rápido (Easy): menos de 5 s escribiendo, menos de 3,5 s en al revés.
- **Reversibilidad:** total (`src/logic/config.ts`).

### D4. Sesión normal (O1)
- **Elección:** hasta 20 países: primero los vencidos de cualquier región desbloqueada, luego hasta 5 nuevos de la región actual, y si sobra sitio, repaso adelantado de la región actual. Dentro de la sesión, cada país sale hasta acertarse (la cola del hito 2).
- **Reversibilidad:** total (`src/logic/sesionDiaria.ts`).

### D8. Regiones (O2)
- **Europa:** Europa del sur (8, con los microestados), Europa occidental (8), Islas Británicas y nórdicos (7), Europa central y bálticos (7), Balcanes (9), Europa del este (7, con Rusia, Turquía y Chipre).
- **Asia:** Asia oriental (6), Asia del sur (7), Sudeste asiático continental (6), Sudeste asiático insular (**5**: no llega a 6; prefiero no meter Taiwán o Malasia donde no encajan), Cáucaso y Oriente Próximo (9, con Turquía), Golfo Pérsico y Arabia (9), Asia central (7, con Rusia y Afganistán, para juntar las "-stán").
- **Orden:** se empieza por lo más conocido (Europa del sur, Asia oriental) y se termina por lo más difícil.
- **Transcontinentales:** Rusia y Turquía tienen una región en cada continente (campo `regionesExtra`), con una sola tarjeta.
- **Reversibilidad:** total (datos).

### D9. Selector de región en móvil (O2)
- **Elección:** en pantallas de menos de 480 px el botón de región va sobre la esquina superior del mapa (en la barra no caben las tres pestañas y la región) y el mapa reserva ese hueco al encuadrar. El nombre de la app se oculta en móvil.
- **Reversibilidad:** total (CSS).

### D10. Tolerancia del test "capital dentro de su país" (O2)
- Lisboa y Mónaco quedan fuera del contorno simplificado de Natural Earth 50m (costa). El test acepta capitales a menos de 10 km del contorno; no he tocado las coordenadas de GeoNames.

### D11. Copia de seguridad sin QR (O3)
- **Opciones:** QR, código de texto, fichero.
- **Elección:** fichero y código de texto; **sin QR**. Con el progreso de los 94 países el código ronda los 25.000 caracteres y un QR admite como mucho unos 3.000; habría que recortar mucho los datos o partirlo en varios QR. No compensa en la v1.
- **Reversibilidad:** se puede añadir más adelante (por ejemplo, un QR solo con el nivel de cada país, sin el detalle FSRS).

### D12. Importar sustituye, no mezcla (O3)
- **Elección:** importar sustituye el progreso del dispositivo por el de la copia (con aviso previo). Si se importa un código (que no trae historial), se conserva el historial local.
- **Motivo:** mezclar dos progresos FSRS no tiene una respuesta obvia y es fuente de errores.
- **Reversibilidad:** total.

### D13. Modo examen por región (O4)
- **Opciones:** (a) una sola ronda con todos los países del examen, cambiando el mapa de región en cada pregunta; (b) preparar el examen región a región.
- **Elección:** (b). "Preparar examen" usa los países del examen de la región actual; el selector marca con 📝 las regiones que tienen países del examen y estas se desbloquean aunque no toque por progreso.
- **Motivo:** cambiar el mapa en cada pregunta desorienta y complica mucho el código.
- **Implicación:** con un examen de varias regiones, el alumno tiene que ir pasando de una a otra.
- **Reversibilidad:** media (habría que rehacer la ronda de examen).

### D14. La lista de examen no filtra el repaso normal (O4)
- **Elección:** la lista de examen solo se usa en "Preparar examen" (y para desbloquear sus regiones). El Repaso normal y Practicar siguen con todos los países de la región.
- **Motivo:** el SPEC dice que el examen no debe alterar la planificación normal.
- **Reversibilidad:** total.

### D15. Olvido del PIN (O4)
- **Elección:** "¿Lo has olvidado?" borra el PIN y vuelve a los ajustes iniciales (sin examen, trucos sin editar), conservando el progreso. Como todo es local, no hay otra forma razonable de recuperarlo; un alumno podría usarlo, pero solo perdería la lista de examen.
- **Reversibilidad:** total.

### D6. Pestañas (O1)
- **Elección:** tres pestañas: **Repaso** (sesión automática; se abre por defecto), **Practicar** (modo a elegir) y **Explorar**.
- **Motivo:** el uso diario debería ser "abrir y repasar" sin decidir nada; elegir modo queda para quien quiera.
- **Reversibilidad:** total.

### D7. Trucos propios (O1)
- **Elección:** "Inventa tu truco" está en Explorar (ficha del país), con un máximo de 160 caracteres. El truco propio sustituye al predefinido en el feedback de fallo de todos los modos.
- **Pendiente:** el SPEC no dice si también debe ofrecerse en el momento del fallo; no lo he añadido para no cargar esa pantalla.

### D5. Almacenamiento (O1)
- **Elección:** `localStorage` con una sola clave genérica (`progreso-capitales`), datos con número de versión. Si no se puede leer o escribir, la app funciona en memoria y avisa. Si lo guardado no se entiende, se aparta una copia (`progreso-capitales-ilegible`) en vez de borrarlo.
- **Alternativa descartada:** IndexedDB (más robusta para grandes volúmenes, pero asíncrona y más compleja; el progreso ocupa pocos KB).
- **Reversibilidad:** media: cambiar de almacenamiento exigiría migrar los datos guardados.

## Pruebas manuales pendientes

*(lo que no se ha podido comprobar desde aquí: iPad, iPhone, Safari, instalación, teclado en pantalla...)*

- **Microestados con el dedo:** en Europa del sur, tocar Vaticano, San Marino, Mónaco, Andorra y Malta (círculos). En Oriente Próximo, comprobar que se puede tocar Israel sin dar al círculo de Palestina, que está muy cerca.
- **Instalar en pantalla de inicio** en iPad y iPhone (Safari: Compartir → Añadir a pantalla de inicio) y en Android (Chrome: menú → Instalar aplicación). Abrirla en modo avión después de haberla usado con conexión.
- **Copia de seguridad en iPad/iPhone:** "Descargar copia" (dónde se guarda el fichero en Safari), "Copiar código" y pegarlo en otro dispositivo, e "Importar fichero" desde Archivos.
- **Panel para adultos en iPad/iPhone:** teclado numérico al escribir el PIN, selector de fecha del examen, casillas de países, y que los avisos de confirmación (reiniciar, importar) aparezcan bien en Safari.
- **Selector de región:** abrirlo y cerrarlo en iPad y iPhone (usa `<dialog>`, que Safari soporta desde la versión 15.4).

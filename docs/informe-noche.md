# Informe del trabajo autónomo hacia la v1.0

Se va rellenando según avanza el trabajo (ver [`plan-v1.md`](plan-v1.md)).

## Ahora mismo

- **Objetivo en curso:** O3 (PWA y exportar/importar).
- **Hecho de él:** nada aún.
- **Falta:** vite-plugin-pwa (manifest, iconos, service worker), exportar/importar (fichero y código), QR si es sencillo.
- **Siguiente paso:** instalar vite-plugin-pwa y crear los iconos.

## Estado

| Objetivo | Estado |
|---|---|
| O1. Progreso, FSRS y sesión | Hecho |
| O2. Datos completos | Hecho |
| O3. PWA y exportar/importar | Pendiente |
| O4. Panel de adultos y modo examen | Pendiente |
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
- **Selector de región:** abrirlo y cerrarlo en iPad y iPhone (usa `<dialog>`, que Safari soporta desde la versión 15.4).

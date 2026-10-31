# Informe del trabajo autónomo hacia la v1.0

Se va rellenando según avanza el trabajo (ver [`plan-v1.md`](plan-v1.md)).

## Ahora mismo

- **Objetivo en curso:** O2 (datos completos de Europa y Asia).
- **Hecho de él:** nada aún. El mapa ya soporta varias regiones, contexto del continente, microestados con círculo y uniones de territorios (Kosovo, norte de Chipre).
- **Falta:** coordenadas GeoNames de todas las capitales; countries.json completo; regiones; selector de región; tests de datos para Asia.
- **Siguiente paso:** extraer coordenadas de GeoNames para los ~93 países.

## Estado

| Objetivo | Estado |
|---|---|
| O1. Progreso, FSRS y sesión | Hecho |
| O2. Datos completos | Pendiente |
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

## Requiere tu atención

*(datos y trucos por revisar, bloqueos, dudas)*

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

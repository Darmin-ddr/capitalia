# Informe del trabajo autónomo hacia la v1.0

Se va rellenando según avanza el trabajo (ver [`plan-v1.md`](plan-v1.md)).

## Ahora mismo

- **Objetivo en curso:** O1 (progreso, FSRS y sesión).
- **Hecho de él:** ts-fsrs instalado; lógica pura (config, nota deducida, progreso y dominio, regiones desbloqueadas, sesión normal, almacén) con 16 tests nuevos.
- **Falta:** lógica (almacén, nota, progreso, sesión) con tests; interfaz (sesión, mapa por dominio, desbloqueo, confeti de región).
- **Siguiente paso:** interfaz de O1: guardar progreso desde todos los modos, pestaña de sesión, mapa coloreado por dominio, confeti de región.

## Estado

| Objetivo | Estado |
|---|---|
| O1. Progreso, FSRS y sesión | En curso |
| O2. Datos completos | Pendiente |
| O3. PWA y exportar/importar | Pendiente |
| O4. Panel de adultos y modo examen | Pendiente |
| O5. Pulido | Pendiente |
| O6. Informe final | Pendiente |

## Lo hecho

*(por objetivo)*

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

### D5. Almacenamiento (O1)
- **Elección:** `localStorage` con una sola clave genérica (`progreso-capitales`), datos con número de versión. Si no se puede leer o escribir, la app funciona en memoria y avisa. Si lo guardado no se entiende, se aparta una copia (`progreso-capitales-ilegible`) en vez de borrarlo.
- **Alternativa descartada:** IndexedDB (más robusta para grandes volúmenes, pero asíncrona y más compleja; el progreso ocupa pocos KB).
- **Reversibilidad:** media: cambiar de almacenamiento exigiría migrar los datos guardados.

## Pruebas manuales pendientes

*(lo que no se ha podido comprobar desde aquí: iPad, iPhone, Safari, instalación, teclado en pantalla...)*

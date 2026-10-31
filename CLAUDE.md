# Instrucciones para trabajar en este repo

Lee `SPEC.md` antes de empezar cualquier tarea. Es la fuente de verdad del producto; si una tarea la contradice, pregunta antes de implementar.

## Cómo trabajamos

- El responsable dirige el proyecto (arquitectura, prioridades, revisión y pruebas) pero no es programador experto. Explica las decisiones técnicas de forma breve y concreta, sin jerga innecesaria.
- Trabaja por hitos (`SPEC.md`, sección 13). No adelantes funcionalidades de hitos futuros sin pedirlo.
- Commits pequeños y descriptivos, en español. Una rama por funcionalidad.
- Antes de dar algo por terminado: compila, ejecuta los tests y comprueba el resultado en el navegador. Indica qué has probado y qué no.
- Si algo no lo sabes o no lo has verificado, dilo. No inventes datos.

## Reglas de producto que no se negocian

- **No debe parecer infantil.** Público de 3º de ESO (14 a 15 años). Sobrio, amable, sin mascotas ni decoración recargada.
- **Sin rachas, sin síntesis de voz, sin mecánicas que castiguen.**
- En el fallo: claro pero sin castigo, nunca rojo intenso. Mostrar respuesta correcta y truco.
- Celebraciones grandes solo al dominar una región o recuperar un fallo.
- Textos de la interfaz en español de España, tono cercano y breve.

## Datos

- **Los listados de clase (`docs/listas/`) son la fuente de verdad**: qué países entran y con qué nombre se muestran. Si un dato del listado parece erróneo o desactualizado, avisa al responsable; no lo cambies por tu cuenta.
- Formas normativas (RAE/Fundéu) distintas de las del listado: se aceptan como variantes, no sustituyen a la del listado.
- Cualquier dato geográfico o político (capitales, reconocimiento de estados, cambios de nombre) debe **verificarse con una fuente** al añadirlo o modificarlo. Anota la fuente en el commit o en un comentario del fichero de datos.
- Casos especiales (transcontinentales, Kosovo, Taiwán, Palestina, Israel): seguir exactamente `SPEC.md`, sección 3.2. Notas neutras, sin valoraciones.
- Los trucos de memoria deben ser breves, apropiados para la edad y revisables. Si un truco es flojo, mejor no ponerlo.

## Técnica

- PWA estática para GitHub Pages. Nada de servidor ni dependencias de red en tiempo de ejecución.
- Debe funcionar en Safari de iPad/iPhone, Chrome de Android y Chrome de escritorio. Prioriza táctil.
- Persistencia local con manejo de errores (el almacenamiento puede fallar o vaciarse).
- Lógica pura (FSRS, validación de respuestas, selección de preguntas) separada de la interfaz y con tests unitarios.
- Accesibilidad básica: contraste suficiente, objetivos táctiles de 44 px como mínimo, funcionamiento con teclado en PC.

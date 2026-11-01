import { boton, el, enterPulsaPrincipal } from './dom';

export interface DatosBienvenida {
  /** Abre la guía del alumno. */
  abrirGuiaAlumno(): void;
  /** Abre el panel de adultos (para crear el PIN y configurar). */
  abrirPanel(): void;
  /** Se llama la primera vez que se elige una opción (para no volver a mostrar la bienvenida). */
  alElegir(): void;
}

const p = (...hijos: (Node | string)[]) => el('p', '', ...hijos);
const fuerte = (t: string) => el('strong', '', t);
const lista = (...items: (Node | string)[][]) => el('ul', 'lista-guia', ...items.map((i) => el('li', '', ...i)));

/**
 * Primer arranque: "¿Quién eres?". El alumno va a su guía; la madre o el
 * padre, a una guía breve para configurar el panel de adultos.
 * Devuelve las funciones para abrir la bienvenida y la guía de adultos.
 */
export function crearBienvenida(datos: DatosBienvenida): { abrirBienvenida(): void; abrirGuiaAdultos(): void } {
  const dialogo = el('dialog', 'dialogo-regiones dialogo-guia');
  dialogo.setAttribute('aria-label', 'Bienvenida');
  document.body.append(dialogo);
  enterPulsaPrincipal(dialogo);

  function mostrar(...hijos: Node[]): void {
    const c = el('div', 'dialogo-contenido');
    c.append(...hijos);
    dialogo.replaceChildren(c);
    dialogo.scrollTop = 0;
    if (!dialogo.open) dialogo.showModal();
    (c.querySelector('.boton-principal') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  function abrirBienvenida(): void {
    const alumno = boton('Soy el alumno o la alumna', 'boton-principal boton-ancho', () => {
      datos.alElegir();
      dialogo.close();
      datos.abrirGuiaAlumno();
    });
    const adulto = boton('Soy madre o padre', 'boton-secundario boton-ancho', () => {
      datos.alElegir();
      abrirGuiaAdultos();
    });
    mostrar(
      el('h2', 'dialogo-titulo', 'Hola'),
      p('Capitalia sirve para aprender capitales sobre el mapa, unos minutos al día.'),
      p('¿Quién la está abriendo ahora?'),
      el('div', 'acciones acciones-columna', alumno, adulto),
    );
  }

  // Guía para adultos: pasos cortos.
  const pasos: { titulo: string; cuerpo: () => Node[] }[] = [
    {
      titulo: 'Cómo funciona',
      cuerpo: () => [
        p('En la pestaña ', fuerte('Hoy'), ' la app pregunta cada día lo que conviene repasar (repetición espaciada) y mete unos pocos países nuevos: lo que el alumno sabe sale cada vez menos, lo que le cuesta, más a menudo. Con ', fuerte('unos diez minutos al día'), ' es suficiente.'),
        p('Además, en ', fuerte('Aprender'), ' puede adelantar una región a su ritmo, y en ', fuerte('Examen'), ' hacer un examen de prueba con un mapa mudo como el de clase, con nota.'),
        p('El progreso se guarda solo en este dispositivo. No hay cuentas, anuncios ni datos que salgan de aquí.'),
        p('El alumno tiene su propia guía, con técnicas de estudio y trucos de memoria. Se le abrirá la primera vez que use la app.'),
      ],
    },
    {
      titulo: 'El panel para adultos',
      cuerpo: () => [
        p('Está en el botón ', fuerte('⋯'), ' (arriba a la derecha) → ', fuerte('Panel para adultos'), ', protegido con un PIN que crearás al entrar por primera vez. Desde ahí puedes:'),
        lista(
          [fuerte('Resumen'), ': cómo va cada región, qué países se le atascan y cuántos días ha practicado.'],
          [fuerte('Examen'), ': marcar los países que entran (hay casillas para Europa o Asia enteras, y para cada región) y la fecha. Hoy les dará prioridad y el Examen de prueba podrá hacerse solo con ellos.'],
          [fuerte('Trucos'), ': revisar, cambiar o desactivar los trucos de memoria que trae la app.'],
          [fuerte('Ajustes'), ': cuántos países nuevos al día como mucho, desbloquear todas las regiones si el curso va en otro orden, cambiar el PIN o reiniciar el progreso.'],
        ),
      ],
    },
    {
      titulo: 'Instalar y no perder el progreso',
      cuerpo: () => [
        lista(
          [fuerte('Instalarla'), ': en iPhone o iPad, desde Safari: Compartir → Añadir a pantalla de inicio. En Android, desde Chrome: menú → Instalar aplicación. Así funciona también sin conexión.'],
          [fuerte('Copia de seguridad'), ': en ⋯ → Descargar copia. Conviene hacerla de vez en cuando: si se borran los datos del navegador, el progreso se pierde.'],
          [fuerte('Cambiar de dispositivo'), ': ⋯ → Copiar código en el antiguo y pegarlo en el nuevo.'],
        ),
      ],
    },
    {
      titulo: 'Cómo ayudar',
      cuerpo: () => [
        lista(
          ['Mejor ', fuerte('poco y a menudo'), ' que un atracón antes del examen.'],
          ['La app ', fuerte('no castiga'), ' saltarse días ni fallar: no hay rachas. Conviene no añadir presión desde fuera.'],
          ['Si un país se le resiste, anímale a inventar su propio truco (en Explorar).'],
          ['Un vistazo al Resumen de vez en cuando basta para saber cómo va.'],
        ),
      ],
    },
  ];

  function abrirGuiaAdultos(indice = 0): void {
    const paso = pasos[indice];
    const ultimo = indice === pasos.length - 1;
    const anterior = boton('Anterior', 'boton-secundario', () => abrirGuiaAdultos(indice - 1));
    anterior.disabled = indice === 0;
    const acciones = ultimo
      ? el(
          'div',
          'acciones acciones-guia',
          anterior,
          boton('Configurar ahora', 'boton-principal', () => {
            dialogo.close();
            datos.abrirPanel();
          }),
          boton('Pasar al alumno', 'boton-secundario', () => {
            dialogo.close();
            datos.abrirGuiaAlumno();
          }),
        )
      : el(
          'div',
          'acciones acciones-guia',
          anterior,
          boton('Siguiente', 'boton-principal', () => abrirGuiaAdultos(indice + 1)),
          boton('Cerrar', 'boton-enlace', () => dialogo.close()),
        );
    mostrar(
      el('p', 'progreso', `Guía para madres y padres · ${indice + 1} de ${pasos.length}`),
      el('h2', 'dialogo-titulo', paso.titulo),
      el('div', 'cuerpo-guia', ...paso.cuerpo()),
      acciones,
    );
  }

  return { abrirBienvenida, abrirGuiaAdultos: () => abrirGuiaAdultos(0) };
}

import type { Pais } from '../logic/types';
import { boton, el, rellenar } from './dom';

export interface DatosGuia {
  /** Un país de la región actual sin truco propio, para el taller de trucos. */
  paisParaTaller(): Pais | null;
  /** Guarda un truco propio (como "Inventa tu truco" en Explorar). */
  guardarTruco(paisId: string, texto: string): void;
  /** Se llama al cerrar la guía (para no volver a abrirla sola). */
  alCerrar(): void;
  /** Botón final: empezar a repasar. */
  alEmpezar(): void;
}

interface Paso {
  titulo: string;
  pintar(zona: HTMLElement): void;
}

const p = (...hijos: (Node | string)[]) => el('p', '', ...hijos);
const fuerte = (t: string) => el('strong', '', t);

/**
 * Guía para el alumno: cómo usar la app y, sobre todo, cómo aprender con
 * ella (práctica de recuerdo, repaso espaciado, errores, dificultad deseable,
 * trucos de memoria). Con dos partes interactivas: una pregunta y un taller
 * para fabricar un truco propio.
 */
export function crearGuia(datos: DatosGuia): () => void {
  const dialogo = el('dialog', 'dialogo-regiones dialogo-guia');
  dialogo.setAttribute('aria-label', 'Cómo aprender con Capitalia');
  document.body.append(dialogo);
  dialogo.addEventListener('close', () => datos.alCerrar());
  let indice = 0;

  const pasos: Paso[] = [
    {
      titulo: 'Capitales sin empollar',
      pintar(z) {
        z.append(
          p('Aquí no se trata de leer una lista mil veces. Se trata de ', fuerte('sacar las capitales de tu cabeza'), ', un poco cada día, hasta que salgan solas.'),
          p('En dos minutos te cuento cómo funciona y cómo sacarle el máximo partido. Puedes volver a esta guía cuando quieras desde el botón ⋯.'),
          el(
            'ul',
            'lista-guia',
            el('li', '', fuerte('Repaso'), ': lo que toca hoy. Es lo único imprescindible.'),
            el('li', '', fuerte('Practicar'), ': para entrenar a tu aire, eligiendo el tipo de pregunta.'),
            el('li', '', fuerte('Explorar'), ': para mirar el mapa con calma e inventar tus trucos.'),
          ),
        );
      },
    },
    {
      titulo: 'Poco y a menudo',
      pintar(z) {
        const respuesta = el('div', 'respuesta-guia');
        const opciones = el('div', 'opciones');
        const elegir = (bien: boolean, b: HTMLButtonElement) => {
          for (const x of opciones.querySelectorAll('button')) x.disabled = true;
          b.classList.add(bien ? 'correcta' : 'elegida-mal');
          respuesta.className = `respuesta-guia feedback ${bien ? 'acierto' : 'fallo'}`;
          rellenar(
            respuesta,
            el('p', 'feedback-titulo', bien ? '¡Eso es!' : 'Parece lógico, pero no.'),
            p(
              'Repartir el estudio en varios días funciona mucho mejor que darse un atracón, aunque el tiempo total sea el mismo. ',
              'Entre un repaso y otro, tu memoria "consolida" lo aprendido, sobre todo mientras duermes.',
            ),
          );
        };
        const a = boton('Una hora seguida el domingo', 'opcion', () => elegir(false, a));
        const b = boton('Diez minutos cada día', 'opcion', () => elegir(true, b));
        opciones.append(a, b);
        z.append(p('Tienes una hora para estudiar las capitales esta semana. ¿Qué crees que funciona mejor?'), opciones, respuesta);
      },
    },
    {
      titulo: 'La app decide cuándo repasar',
      pintar(z) {
        z.append(
          p(
            'Cada vez que respondes, la app calcula cuándo estás a punto de olvidar esa capital y te la vuelve a preguntar justo entonces. ',
            'Lo que te sabes bien sale cada vez menos; lo que te cuesta, más a menudo.',
          ),
          p('Por eso en ', fuerte('Repaso'), ' no tienes que decidir nada: entra, responde lo que te salga y listo. Unos diez minutos al día bastan.'),
          p(
            'El mapa es tu marcador: cada país se va coloreando a medida que lo dominas. Cuando dominas una región entera, lo celebramos, y se van abriendo regiones nuevas.',
          ),
        );
      },
    },
    {
      titulo: 'Fallar también es aprender',
      pintar(z) {
        z.append(
          p(
            'Intentar recordar, aunque falles, deja más huella que releer la respuesta. Lo importante es el esfuerzo de ',
            fuerte('buscar en tu memoria'),
            '.',
          ),
          el(
            'ul',
            'lista-guia',
            el('li', '', 'Piensa tu respuesta ', fuerte('antes'), ' de mirar las opciones.'),
            el('li', '', 'Si no lo sabes, arriésgate: un fallo seguido de la respuesta correcta se recuerda muy bien.'),
            el('li', '', 'Cuando fallas, lee el truco y mira dónde está en el mapa. Ese país volverá a salir en unos minutos.'),
            el('li', '', 'Recuperar una capital que habías fallado es el mejor momento de todos. Por eso también lo celebramos.'),
          ),
        );
      },
    },
    {
      titulo: 'Cuanto más difícil, mejor (sin pasarse)',
      pintar(z) {
        z.append(
          p('Hay cuatro tipos de pregunta, de más fácil a más difícil:'),
          el(
            'ol',
            'lista-guia',
            el('li', '', fuerte('Elegir'), ': reconocer la capital entre cuatro.'),
            el('li', '', fuerte('Colocar'), ': poner varias capitales en su país del mapa.'),
            el('li', '', fuerte('Al revés'), ': ver la capital y encontrar el país.'),
            el('li', '', fuerte('Escribir'), ': recordarla sin ninguna ayuda.'),
          ),
          p(
            'Las preguntas que cuestan un poco son las que más enseñan. En Repaso, la app sube de nivel cada país cuando ya te lo sabes: primero eliges, luego lo buscas en el mapa y al final lo escribes. ',
            'En Escribir no hace falta poner tildes, y si se te escapa una letra te lo damos por bueno (pero volverá a salir).',
          ),
        );
      },
    },
    {
      titulo: 'Fabrica tus propios trucos',
      pintar(z) {
        z.append(
          p('Un buen truco une el nombre de la capital con su país mediante una imagen. Los que inventas tú se recuerdan mucho mejor que los que te dan hechos. Algunas técnicas:'),
          el(
            'ul',
            'lista-guia',
            el('li', '', fuerte('A qué te suena.'), ' Busca una palabra conocida que se parezca: VARsovia suena a "barra"; POLonia, a "polar".'),
            el('li', '', fuerte('Imagen exagerada.'), ' Junta las dos cosas en una escena absurda: un oso polar bailando en una barra. Cuanto más rara, mejor se queda.'),
            el('li', '', fuerte('Lo que significa.'), ' Muchas capitales tienen un significado: Belgrado es "ciudad blanca" y Montenegro, "monte negro".'),
            el('li', '', fuerte('Parejas y familias.'), ' Agrupa las que se parecen y fíjate en la diferencia: Budapest, Bucarest y Bratislava; o Tokio y Kioto.'),
            el('li', '', fuerte('Tuyo y corto.'), ' Una frase que entiendas tú. Si te hace gracia, mejor.'),
          ),
        );
      },
    },
    {
      titulo: 'Taller: tu primer truco',
      pintar(z) {
        const pais = datos.paisParaTaller();
        if (!pais) {
          z.append(p('Ya tienes trucos propios para todos los países de esta región. ¡Bien hecho! Puedes cambiarlos cuando quieras en Explorar.'));
          return;
        }
        const suena = el('input', 'campo-texto');
        suena.placeholder = `${pais.capital} me suena a...`;
        suena.setAttribute('aria-label', `¿A qué te suena ${pais.capital}?`);
        const escena = el('textarea', 'campo-truco');
        escena.rows = 2;
        escena.maxLength = 160;
        escena.placeholder = `Una escena que junte eso con ${pais.nombre}`;
        escena.setAttribute('aria-label', `Escena que une ${pais.capital} con ${pais.nombre}`);
        const mensaje = el('p', 'mensaje-copia');
        mensaje.setAttribute('role', 'status');
        const guardar = boton('Guardar mi truco', 'boton-principal', () => {
          const texto = escena.value.trim();
          if (!texto) {
            mensaje.textContent = 'Escribe primero tu escena.';
            escena.focus();
            return;
          }
          datos.guardarTruco(pais.id, texto);
          guardar.disabled = true;
          mensaje.textContent = `Guardado. Te saldrá cuando falles ${pais.capital}, y puedes cambiarlo en Explorar.`;
        });
        z.append(
          p('Vamos con uno de esta región: ', fuerte(`${pais.capital}`), `, capital de ${pais.nombre}.`),
          el('label', 'etiqueta-guia', '1. ¿A qué te suena el nombre? (una palabra parecida, aunque sea en broma)', suena),
          el('label', 'etiqueta-guia', `2. Imagina una escena exagerada que una esa palabra con ${pais.nombre}:`, escena),
          el('div', 'acciones', guardar),
          mensaje,
          el('p', 'ayuda', 'No te preocupes si no es perfecto: un truco tuyo y raro funciona mejor que uno bonito que no te dice nada.'),
        );
      },
    },
    {
      titulo: 'Tu rutina',
      pintar(z) {
        z.append(
          el(
            'ul',
            'lista-guia',
            el('li', '', fuerte('Cada día'), ': un Repaso de unos diez minutos. Mejor un poco cada día que mucho de golpe.'),
            el('li', '', fuerte('Antes de empezar una región'), ': date una vuelta por Explorar y fíjate en dónde está cada país y en sus vecinos.'),
            el('li', '', fuerte('Si un país se te resiste'), ': inventa tu propio truco para él.'),
            el('li', '', fuerte('Antes de un examen'), ': usa "Preparar examen" en Repaso (aparece cuando hay un examen configurado). Empieza unos días antes, no la víspera.'),
            el('li', '', fuerte('Para no perder tu progreso'), ': haz de vez en cuando una copia de seguridad desde el botón ⋯.'),
          ),
          p('Y lo más importante: no hace falta acertarlo todo. Lo que cuenta es volver mañana.'),
        );
      },
    },
  ];

  function pintar(): void {
    const paso = pasos[indice];
    const zona = el('div', 'cuerpo-guia');
    paso.pintar(zona);
    const puntos = el('div', 'puntos-guia');
    puntos.setAttribute('aria-hidden', 'true');
    pasos.forEach((_, i) => puntos.append(el('span', i === indice ? 'punto actual' : 'punto')));
    const anterior = boton('Anterior', 'boton-secundario', () => ir(indice - 1));
    anterior.disabled = indice === 0;
    const ultimo = indice === pasos.length - 1;
    const siguiente = ultimo
      ? boton('Empezar a repasar', 'boton-principal', () => {
          dialogo.close();
          datos.alEmpezar();
        })
      : boton('Siguiente', 'boton-principal', () => ir(indice + 1));
    const contenido = el(
      'div',
      'dialogo-contenido',
      el('p', 'progreso', `${indice + 1} de ${pasos.length}`),
      el('h2', 'dialogo-titulo', paso.titulo),
      zona,
      puntos,
      el('div', 'acciones acciones-guia', anterior, siguiente, boton('Cerrar', 'boton-enlace', () => dialogo.close())),
    );
    dialogo.replaceChildren(contenido);
    dialogo.scrollTop = 0;
    siguiente.focus({ preventScroll: true });
  }

  function ir(i: number): void {
    indice = Math.max(0, Math.min(pasos.length - 1, i));
    pintar();
  }

  return () => {
    indice = 0;
    pintar();
    if (!dialogo.open) dialogo.showModal();
  };
}

import { boton, el } from './dom';

declare const __VERSION__: string;
declare const __FECHA_COMPILACION__: string;

/** Quién figura como autor en "Acerca de". */
export const AUTORIA = 'Idea y dirección: Darmin-ddr. Programación: Claude (Anthropic).';

/** Diálogo "Acerca de": versión, autoría y créditos de datos y librerías (licencias que piden atribución). */
export function crearAcercaDe(): () => void {
  const dialogo = el('dialog', 'dialogo-regiones dialogo-acerca');
  dialogo.setAttribute('aria-label', 'Acerca de Capitalia');
  document.body.append(dialogo);
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close();
  });

  const enlace = (texto: string, url: string) => {
    const a = el('a', '', texto);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  };

  return () => {
    const contenido = el(
      'div',
      'dialogo-contenido',
      el('h2', 'dialogo-titulo', 'Capitalia'),
      el('p', 'ayuda', `Versión ${__VERSION__} · ${__FECHA_COMPILACION__}`),
      el('p', '', 'Capitales de Europa y Asia sobre el mapa, para 3º de ESO.'),
      el('p', '', AUTORIA),
      el('p', 'ayuda', 'Sin anuncios ni cuentas: tu progreso se guarda solo en este dispositivo y no se envía a ningún sitio.'),
      el('h3', 'dialogo-subtitulo', 'Créditos'),
      el(
        'ul',
        'lista-simple lista-creditos',
        el('li', '', 'Países y capitales: listados de clase de 3º de ESO.'),
        el('li', '', 'Mapa: ', enlace('Natural Earth', 'https://www.naturalearthdata.com/'), ' (dominio público), vía world-atlas.'),
        el('li', '', 'Coordenadas de las capitales: ', enlace('GeoNames', 'https://www.geonames.org/'), ' (licencia CC BY 4.0).'),
        el('li', '', 'Repaso espaciado: algoritmo FSRS, librería ', enlace('ts-fsrs', 'https://github.com/open-spaced-repetition/ts-fsrs'), ' (MIT).'),
        el('li', '', 'Tipografía: Nunito (SIL Open Font License).'),
        el('li', '', 'Dibujo del mapa: d3-geo y topojson-client (ISC).'),
      ),
      el('div', 'acciones acciones-cerrar', boton('Cerrar', 'boton-secundario', () => dialogo.close())),
    );
    dialogo.replaceChildren(contenido);
    dialogo.showModal();
  };
}

import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './ui/estilos.css';
import { paises as todos, regiones } from './data';

import { paisesActivos, paisesDeRegion } from './logic/datos';
import { Mapa } from './map/mapa';
import { iniciarExplorar, type Modo } from './ui/explorar';
import { iniciarPracticar } from './ui/practicar';

const activos = paisesActivos(todos);
const idsActivos = new Set(activos.map((p) => p.id));
const region = regiones[0];
const paisesRegion = paisesDeRegion(activos, region.id);

document.documentElement.style.setProperty('--region-base', region.color);
document.getElementById('region-actual')!.textContent = region.nombre;

const panel = document.getElementById('panel')!;
let modo: Modo | null = null;

const mapa = new Mapa({
  contenedor: document.getElementById('mapa')!,
  paises: todos,
  activos: idsActivos,
  region: paisesRegion,
  onSeleccion: (id) => modo?.alSeleccionarPais(id),
});

const botonesModo = document.querySelectorAll<HTMLButtonElement>('.modo');

function cambiarModo(nombre: 'explorar' | 'elegir'): void {
  modo?.salir();
  for (const b of botonesModo) b.setAttribute('aria-pressed', String(b.dataset.modo === nombre));
  modo =
    nombre === 'explorar'
      ? iniciarExplorar(panel, mapa, paisesRegion)
      : iniciarPracticar(panel, mapa, paisesRegion, activos, Math.random, () => cambiarModo('explorar'));
}

for (const b of botonesModo) b.addEventListener('click', () => cambiarModo(b.dataset.modo as 'explorar' | 'elegir'));
cambiarModo('explorar');

// Teclado en pantalla (iPhone/Android): la app se ajusta al alto visible para
// que el campo de texto y el mapa no queden tapados. Con zoom de pellizco no se toca.
const vista = window.visualViewport;
if (vista) {
  const ajustarAlto = () => {
    if (Math.abs(vista.scale - 1) > 0.01) return;
    document.documentElement.style.setProperty('--alto-app', `${Math.round(vista.height)}px`);
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  };
  vista.addEventListener('resize', ajustarAlto);
  ajustarAlto();
}

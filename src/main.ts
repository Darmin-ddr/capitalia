import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './ui/estilos.css';
import { paises as todos, regiones } from './data';

import { paisesActivos, paisesDeRegion } from './logic/datos';
import { Mapa } from './map/mapa';
import { iniciarExplorar, type Modo } from './ui/explorar';
import { iniciarElegir } from './ui/elegir';

const activos = paisesActivos(todos);
const idsActivos = new Set(activos.map((p) => p.id));
const region = regiones[0];
const paisesRegion = paisesDeRegion(activos, region.id);

document.documentElement.style.setProperty('--color-region', region.color);
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
      : iniciarElegir(panel, mapa, paisesRegion, activos, Math.random, () => cambiarModo('explorar'));
}

for (const b of botonesModo) b.addEventListener('click', () => cambiarModo(b.dataset.modo as 'explorar' | 'elegir'));
cambiarModo('explorar');

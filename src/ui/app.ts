import { paises as todos, regiones } from '../data';
import { paisesActivos } from '../logic/datos';
import { Almacen, almacenDelNavegador } from '../logic/almacen';
import {
  modoSegunDominio,
  nivelesDe,
  registrarRespuesta,
  regionDominada,
  regionesDesbloqueadas,
} from '../logic/progreso';
import { crearSesion } from '../logic/sesionDiaria';
import type { Continente, Pais, Region } from '../logic/types';
import { Mapa } from '../map/mapa';
import { lanzarConfeti } from './confeti';
import { el } from './dom';
import type { Motor } from './comun';
import { iniciarExplorar, type Modo, type ServicioTrucos } from './explorar';
import { iniciarPracticar } from './practicar';
import { iniciarRepaso } from './repaso';

type Pestana = 'explorar' | 'repaso' | 'practicar';

/**
 * Estado y orquestación de la app: progreso guardado, región actual, mapa,
 * pestañas y avisos (región dominada, región desbloqueada).
 */
export function iniciarApp(): void {
  const almacen = new Almacen(almacenDelNavegador());
  const estado = almacen.cargar();
  const panel = document.getElementById('panel')!;
  const contenedorMapa = document.getElementById('mapa')!;
  const avisos = document.getElementById('avisos')!;
  const botonesPestana = document.querySelectorAll<HTMLButtonElement>('.modo');

  let activos: Pais[] = [];
  let region: Region = regiones[0];
  let mapa: Mapa | null = null;
  let modo: Modo | null = null;
  let pestana: Pestana = 'repaso';

  const regionDe = (id: string) => regiones.find((r) => r.id === id);
  const paisesDeRegion = (regionId: string) => activos.filter((p) => p.region === regionId);
  const regionesDe = (c: Continente) => regiones.filter((r) => r.continente === c).sort((a, b) => a.orden - b.orden);
  const desbloqueadas = (c: Continente) => regionesDesbloqueadas(estado, regionesDe(c), paisesDeRegion);
  /** Países del continente de la región actual (el mapa los colorea por dominio). */
  const paisesContinente = () => activos.filter((p) => p.continentes.includes(region.continente));

  function guardar(): void {
    if (!almacen.guardar(estado)) mostrarAvisoAlmacen();
  }

  function mostrarAvisoAlmacen(): void {
    if (document.getElementById('aviso-almacen')) return;
    const aviso = el('p', 'aviso-almacen', 'Este navegador no deja guardar el progreso: lo que hagas se perderá al cerrar.');
    aviso.id = 'aviso-almacen';
    document.querySelector('.app')!.append(aviso);
  }

  function avisar(texto: string): void {
    const t = el('div', 'aviso', texto);
    avisos.append(t);
    window.setTimeout(() => t.classList.add('saliendo'), 3500);
    window.setTimeout(() => t.remove(), 4000);
  }

  function actualizarNiveles(): void {
    mapa?.setNiveles(nivelesDe(estado, paisesContinente()));
  }

  const trucos: ServicioTrucos = {
    predefinido(id) {
      if (estado.ajustes.trucosDesactivados.includes(id)) return null;
      return estado.ajustes.trucosEditados[id] ?? todos.find((p) => p.id === id)?.trucos[0]?.texto ?? null;
    },
    propio: (id) => estado.trucosPropios[id] ?? null,
    guardarPropio(id, texto) {
      if (texto) estado.trucosPropios[id] = texto;
      else delete estado.trucosPropios[id];
      guardar();
    },
  };

  const motor: Motor = {
    registrar(paisId, modoId, resultado, tiempoMs) {
      const antes = desbloqueadas(region.continente);
      registrarRespuesta(estado, paisId, modoId, resultado, tiempoMs, new Date());
      guardar();
      actualizarNiveles();
      comprobarHitos(antes);
    },
    modoPara: (id) => modoSegunDominio(estado.tarjetas[id]),
    truco: (id) => trucos.propio(id) ?? trucos.predefinido(id),
  };

  /** Celebraciones grandes solo al dominar una región (SPEC 5.1) y aviso de región nueva. */
  function comprobarHitos(antes: Set<string>): void {
    for (const r of regionesDe(region.continente)) {
      if (!estado.regionesCelebradas.includes(r.id) && regionDominada(estado, paisesDeRegion(r.id))) {
        estado.regionesCelebradas.push(r.id);
        guardar();
        lanzarConfeti();
        avisar(`¡Has dominado ${r.nombre}!`);
      }
    }
    for (const id of desbloqueadas(region.continente)) {
      if (!antes.has(id)) avisar(`Nueva región disponible: ${regionDe(id)?.nombre ?? id}`);
    }
  }

  function montarMapa(): void {
    mapa?.destruir();
    const paisesRegion = paisesDeRegion(region.id);
    mapa = new Mapa({
      contenedor: contenedorMapa,
      paises: todos,
      activos: new Set(activos.map((p) => p.id)),
      region: paisesRegion,
      contexto: paisesContinente(),
      colorDe: (id) => regionDe(activos.find((p) => p.id === id)?.region ?? '')?.color ?? '#cccccc',
      onSeleccion: (id) => modo?.alSeleccionarPais(id),
    });
    actualizarNiveles();
    document.documentElement.style.setProperty('--region-base', region.color);
    const etiqueta = document.getElementById('region-actual');
    if (etiqueta) etiqueta.textContent = region.nombre;
  }

  function cambiarPestana(nueva: Pestana): void {
    modo?.salir();
    pestana = nueva;
    for (const b of botonesPestana) b.setAttribute('aria-pressed', String(b.dataset.modo === nueva));
    if (!mapa) return;
    const paisesRegion = paisesDeRegion(region.id);
    const ctx = {
      mapa,
      region: paisesRegion,
      candidatos: activos,
      rng: Math.random,
      alExplorar: () => cambiarPestana('explorar'),
      motor,
    };
    if (nueva === 'explorar') modo = iniciarExplorar(panel, mapa, paisesRegion, trucos);
    else if (nueva === 'practicar') modo = iniciarPracticar(panel, mapa, paisesRegion, activos, Math.random, ctx.alExplorar, motor);
    else
      modo = iniciarRepaso(panel, ctx, () => {
        const abiertas = desbloqueadas(region.continente);
        return crearSesion({
          estado,
          region: paisesRegion,
          desbloqueados: activos.filter((p) => abiertas.has(p.region)),
          ahora: new Date(),
          rng: Math.random,
        });
      });
  }

  /** Cambia la región en estudio (la recuerda para la próxima vez). */
  function irARegion(id: string): void {
    const r = regionDe(id);
    if (!r) return;
    modo?.salir();
    modo = null;
    region = r;
    estado.ultimaRegion = id;
    guardar();
    montarMapa();
    cambiarPestana(pestana);
  }

  function recalcularActivos(): void {
    activos = paisesActivos(todos, new Set(estado.ajustes.opcionalesActivados));
  }

  // --- Arranque ---
  recalcularActivos();
  const guardada = estado.ultimaRegion ? regionDe(estado.ultimaRegion) : undefined;
  if (guardada && desbloqueadas(guardada.continente).has(guardada.id)) region = guardada;
  if (!almacen.disponible) mostrarAvisoAlmacen();
  // Pedir almacenamiento persistente (Safari puede borrar datos de webs poco visitadas).
  void navigator.storage?.persist?.().catch(() => undefined);

  for (const b of botonesPestana) b.addEventListener('click', () => cambiarPestana(b.dataset.modo as Pestana));
  montarMapa();
  cambiarPestana('repaso');

  // Expuesto para el selector de regiones (O2) y el panel de adultos (O4).
  Object.assign(window, { __capitalia: { irARegion, estado } });
}

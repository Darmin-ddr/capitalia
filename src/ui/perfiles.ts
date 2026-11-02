import {
  COLORES_PERFIL, ICONOS_PERFIL, NOMBRE_MAX, inicial, limpiarNombre, type ImagenPerfil, type IndicePerfiles, type Perfil,
} from '../logic/perfiles';
import { boton, el, enterPulsaPrincipal } from './dom';

/** Imagen del alumno: su inicial o un icono, sobre su color. Sin fotos. */
export function avatar(perfil: Pick<Perfil, 'nombre' | 'imagen'>, clase = ''): HTMLElement {
  const a = el('span', `avatar ${clase}`.trim(), perfil.imagen.tipo === 'icono' && perfil.imagen.icono ? perfil.imagen.icono : inicial(perfil.nombre));
  a.style.background = perfil.imagen.color;
  a.setAttribute('aria-hidden', 'true');
  return a;
}

export function nombreVisible(perfil: Perfil): string {
  return perfil.nombre || 'Sin nombre';
}

function dialogoBase(etiqueta: string, cerrable: boolean): HTMLDialogElement {
  const d = el('dialog', 'dialogo-regiones dialogo-perfiles');
  d.setAttribute('aria-label', etiqueta);
  document.body.append(d);
  if (cerrable) {
    d.addEventListener('click', (e) => {
      if (e.target === d) d.close();
    });
  } else {
    // Hay que elegir: Escape no lo cierra (así no se estudia en el perfil de otro sin querer).
    d.addEventListener('cancel', (e) => e.preventDefault());
  }
  return d;
}

function campoNombre(etiqueta: string, placeholder: string, valor = ''): HTMLInputElement {
  const c = el('input', 'campo-texto');
  c.type = 'text';
  c.maxLength = NOMBRE_MAX;
  c.placeholder = placeholder;
  c.autocomplete = 'off';
  c.value = valor;
  c.setAttribute('aria-label', etiqueta);
  return c;
}

/** Elegir imagen (inicial o icono) y color, con vista previa que sigue al nombre escrito. */
function selectorImagen(nombre: HTMLInputElement, inicialImagen: ImagenPerfil): { nodos: HTMLElement[]; valor: () => ImagenPerfil } {
  let imagen: ImagenPerfil = { ...inicialImagen };
  const vista = el('div', 'vista-avatar');
  const pintarVista = () => vista.replaceChildren(avatar({ nombre: nombre.value, imagen }, 'avatar-grande'));
  nombre.addEventListener('input', pintarVista);

  const rejilla = el('div', 'rejilla-iconos');
  rejilla.setAttribute('role', 'group');
  rejilla.setAttribute('aria-label', 'Imagen');
  const botones: HTMLButtonElement[] = [];
  const elegir = (b: HTMLButtonElement, tipo: ImagenPerfil['tipo'], icono?: string) => {
    imagen = { ...imagen, tipo, icono };
    for (const x of botones) x.setAttribute('aria-pressed', String(x === b));
    pintarVista();
  };
  const bInicial = boton('Inicial', 'opcion-imagen opcion-inicial', () => elegir(bInicial, 'inicial'));
  bInicial.setAttribute('aria-pressed', String(imagen.tipo === 'inicial'));
  botones.push(bInicial);
  rejilla.append(bInicial);
  for (const icono of ICONOS_PERFIL) {
    const b = boton(icono, 'opcion-imagen', () => elegir(b, 'icono', icono));
    b.setAttribute('aria-pressed', String(imagen.tipo === 'icono' && imagen.icono === icono));
    b.setAttribute('aria-label', `Icono ${icono}`);
    botones.push(b);
    rejilla.append(b);
  }

  const colores = el('div', 'rejilla-colores');
  colores.setAttribute('role', 'group');
  colores.setAttribute('aria-label', 'Color');
  const botonesColor = COLORES_PERFIL.map((c, i) => {
    const b = boton('', 'opcion-color', () => {
      imagen = { ...imagen, color: c };
      for (const x of botonesColor) x.setAttribute('aria-pressed', String(x === b));
      pintarVista();
    });
    b.style.background = c;
    b.setAttribute('aria-label', `Color ${i + 1}`);
    b.setAttribute('aria-pressed', String(c === imagen.color));
    return b;
  });
  colores.append(...botonesColor);
  pintarVista();
  return {
    nodos: [
      el('div', 'campo-etiquetado', el('span', 'etiqueta-campo', 'Imagen'), el('div', 'fila-avatar', vista, rejilla)),
      el('div', 'campo-etiquetado', el('span', 'etiqueta-campo', 'Color'), colores),
    ],
    valor: () => imagen,
  };
}

const AVISO_PRIVACIDAD = 'Solo se guarda en este dispositivo: un nombre y una imagen, sin fotos ni datos que salgan de aquí.';
const mismoNombre = (a: string, b: string) => a.toLocaleLowerCase('es') === b.toLocaleLowerCase('es');

/**
 * "¿Quién va a estudiar?": un botón por alumno y "Añadir alumno".
 * `obligatorio`: al abrir la app con dos o más alumnos no se puede cerrar sin elegir.
 */
export function elegirAlumno(
  indice: IndicePerfiles,
  opciones: { obligatorio: boolean; actual?: string; alElegir: (id: string) => void; alAnadir: () => void },
): void {
  const d = dialogoBase('Elegir alumno', !opciones.obligatorio);
  const lista = el('div', 'lista-perfiles');
  for (const p of indice.perfiles) {
    const b = boton('', `perfil-item${p.id === opciones.actual ? ' actual' : ''}`, () => {
      d.close();
      d.remove();
      opciones.alElegir(p.id);
    });
    b.append(avatar(p), el('span', 'perfil-nombre', nombreVisible(p), p.id === opciones.actual ? el('span', 'perfil-ahora', ' (ahora)') : null));
    lista.append(b);
  }
  const anadir = boton('Añadir alumno', 'boton-secundario', () => {
    d.close();
    d.remove();
    opciones.alAnadir();
  });
  const acciones = el('div', 'acciones acciones-cerrar', anadir);
  if (!opciones.obligatorio) acciones.append(boton('Cerrar', 'boton-secundario', () => (d.close(), d.remove())));
  d.append(
    el(
      'div',
      'dialogo-contenido',
      el('h2', 'dialogo-titulo', '¿Quién va a estudiar?'),
      el('p', 'ayuda', 'Cada alumno tiene su propio progreso en este dispositivo.'),
      lista,
      acciones,
    ),
  );
  d.showModal();
  (lista.querySelector('.perfil-item.actual') as HTMLElement | null ?? lista.querySelector('.perfil-item') as HTMLElement | null)?.focus();
}

/**
 * Añadir un alumno: nombre e imagen (inicial o icono) con su color. Si quien ya
 * usaba la app aún no tiene nombre, se le pide también (para distinguirlos).
 */
export function nuevoAlumno(
  indice: IndicePerfiles,
  opciones: { alCrear: (nombre: string, imagen: ImagenPerfil, nombrePrimero: string | null) => void; alCancelar: () => void },
): void {
  const d = dialogoBase('Añadir alumno', true);
  enterPulsaPrincipal(d);
  const primeroSinNombre = indice.perfiles.length === 1 && !indice.perfiles[0].nombre;
  const nombrePrimero = primeroSinNombre ? campoNombre('Nombre de quien ya usaba la app', 'Su nombre') : null;
  const nombre = campoNombre('Nombre del alumno nuevo', 'Nombre');
  const imagen = selectorImagen(nombre, { tipo: 'inicial', color: COLORES_PERFIL[indice.perfiles.length % COLORES_PERFIL.length] });
  const mensaje = el('p', 'mensaje-copia');
  mensaje.setAttribute('role', 'status');
  const crear = boton('Crear', 'boton-principal', () => {
    const n = limpiarNombre(nombre.value);
    const n1 = nombrePrimero ? limpiarNombre(nombrePrimero.value) : null;
    if (nombrePrimero && !n1) {
      mensaje.textContent = 'Escribe primero el nombre de quien ya usaba la app.';
      nombrePrimero.focus();
      return;
    }
    if (!n) {
      mensaje.textContent = `Escribe el nombre del alumno nuevo (hasta ${NOMBRE_MAX} letras).`;
      nombre.focus();
      return;
    }
    if (indice.perfiles.some((p) => mismoNombre(p.nombre, n)) || (n1 && mismoNombre(n1, n))) {
      mensaje.textContent = 'Ya hay un alumno con ese nombre.';
      nombre.focus();
      return;
    }
    d.close();
    d.remove();
    opciones.alCrear(n, imagen.valor(), n1);
  });
  const cancelar = boton('Cancelar', 'boton-secundario', () => {
    d.close();
    d.remove();
    opciones.alCancelar();
  });
  d.append(
    el(
      'div',
      'dialogo-contenido',
      el('h2', 'dialogo-titulo', 'Añadir alumno'),
      el('p', 'ayuda', AVISO_PRIVACIDAD),
      nombrePrimero
        ? el('label', 'campo-etiquetado', el('span', 'etiqueta-campo', 'Antes, ¿cómo se llama quien ya usaba la app? (su progreso sigue siendo suyo)'), nombrePrimero)
        : null,
      el('label', 'campo-etiquetado', el('span', 'etiqueta-campo', 'Nombre del alumno nuevo'), nombre),
      ...imagen.nodos,
      mensaje,
      el('div', 'acciones acciones-cerrar', crear, cancelar),
    ),
  );
  d.showModal();
  (nombrePrimero ?? nombre).focus();
}

/**
 * Editar el perfil (nombre, imagen y color). También sirve para ponerle nombre
 * la primera vez (`primeraVez`: "¿Cómo te llamas?", con "Ahora no").
 */
export function editarAlumno(
  indice: IndicePerfiles,
  perfil: Perfil,
  opciones: { primeraVez?: boolean; alGuardar: (nombre: string, imagen: ImagenPerfil) => void; alCerrar: () => void },
): void {
  const d = dialogoBase(opciones.primeraVez ? 'Tu nombre' : 'Editar perfil', true);
  enterPulsaPrincipal(d);
  const nombre = campoNombre('Nombre', 'Tu nombre', perfil.nombre);
  const imagen = selectorImagen(nombre, perfil.imagen);
  const mensaje = el('p', 'mensaje-copia');
  mensaje.setAttribute('role', 'status');
  const cerrar = () => {
    d.close();
    d.remove();
  };
  d.addEventListener('close', () => {
    if (d.isConnected) {
      d.remove();
      opciones.alCerrar();
    }
  });
  const guardar = boton('Guardar', 'boton-principal', () => {
    const n = limpiarNombre(nombre.value);
    if (!n) {
      mensaje.textContent = `Escribe un nombre (hasta ${NOMBRE_MAX} letras).`;
      nombre.focus();
      return;
    }
    if (indice.perfiles.some((p) => p.id !== perfil.id && mismoNombre(p.nombre, n))) {
      mensaje.textContent = 'Ya hay otro alumno con ese nombre.';
      nombre.focus();
      return;
    }
    cerrar();
    opciones.alGuardar(n, imagen.valor());
  });
  const otro = boton(opciones.primeraVez ? 'Ahora no' : 'Cancelar', 'boton-secundario', () => {
    cerrar();
    opciones.alCerrar();
  });
  d.append(
    el(
      'div',
      'dialogo-contenido',
      el('h2', 'dialogo-titulo', opciones.primeraVez ? '¿Cómo te llamas?' : 'Editar perfil'),
      el('p', 'ayuda', opciones.primeraVez ? `Ponle nombre a tu perfil. ${AVISO_PRIVACIDAD} Lo puedes cambiar cuando quieras en ⋯.` : AVISO_PRIVACIDAD),
      el('label', 'campo-etiquetado', el('span', 'etiqueta-campo', 'Nombre'), nombre),
      ...imagen.nodos,
      mensaje,
      el('div', 'acciones acciones-cerrar', guardar, otro),
    ),
  );
  d.showModal();
  nombre.focus();
}

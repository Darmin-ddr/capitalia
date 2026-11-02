import { aplicarImportacion, exportarCodigo, exportarFichero, importar, mensajeImportar, nombreFichero, tipoDispositivo } from '../logic/copia';
import type { EstadoProgreso } from '../logic/progreso';
import { boton, el } from './dom';
import type { Perfil } from '../logic/perfiles';
import { avatar, nombreVisible } from './perfiles';
import { guardarTema, leerTema, type Tema } from './tema';

export interface DatosMas {
  /** Alumno actual y si hay varios en el dispositivo. */
  alumno?: () => { perfil: Perfil; varios: boolean };
  cambiarAlumno?: () => void;
  anadirAlumno?: () => void;
  editarPerfil?: () => void;
  estado(): EstadoProgreso;
  /** Sustituye el progreso guardado y reinicia la app. */
  reemplazar(nuevo: EstadoProgreso): void;
  /** Abre el panel de adultos (si existe). */
  abrirPanelAdultos?: () => void;
  abrirGuia?: () => void;
  abrirAcercaDe?: () => void;
  abrirGuiaAdultos?: () => void;
  /** Instalar la app (null si ya está instalada: no se ofrece). */
  abrirInstalar?: () => (() => void) | null;
}

/**
 * Diálogo "Más": copia de seguridad (exportar e importar el progreso, SPEC 9)
 * y acceso al panel de adultos.
 */
export function prepararMas(disparador: HTMLButtonElement, datos: DatosMas): void {
  const dialogo = el('dialog', 'dialogo-regiones dialogo-mas');
  dialogo.setAttribute('aria-label', 'Más opciones');
  document.body.append(dialogo);
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close();
  });

  function abrir(): void {
    const mensaje = el('p', 'mensaje-copia');
    mensaje.setAttribute('role', 'status');
    const decir = (texto: string) => (mensaje.textContent = texto);
    // La copia dice de quién es (para avisar al importarla en otro perfil o dispositivo).
    const alumnoActual = datos.alumno?.();
    const nombreAlumno = alumnoActual?.perfil.nombre || undefined;
    const origen = () => ({ alumno: nombreAlumno, dispositivo: tipoDispositivo(navigator.userAgent, navigator.maxTouchPoints) });

    const descargar = boton('Descargar copia', 'boton-principal', () => {
      const blob = new Blob([exportarFichero(datos.estado(), new Date(), origen())], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = el('a');
      a.href = url;
      a.download = nombreFichero(new Date(), nombreAlumno);
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      decir('Copia descargada. Guárdala en un sitio seguro.');
    });

    const areaCodigo = el('textarea', 'campo-truco campo-codigo');
    areaCodigo.rows = 3;
    areaCodigo.placeholder = 'Pega aquí un código para importarlo';
    areaCodigo.setAttribute('aria-label', 'Código de progreso');
    areaCodigo.spellcheck = false;

    const copiar = boton('Copiar código', 'boton-secundario', async () => {
      const codigo = exportarCodigo(datos.estado(), origen());
      areaCodigo.value = codigo;
      try {
        await navigator.clipboard.writeText(codigo);
        decir('Código copiado. Pégalo en el otro dispositivo, en este mismo apartado.');
      } catch {
        areaCodigo.select();
        decir('Selecciona y copia el código del recuadro.');
      }
    });

    function confirmarEImportar(texto: string): void {
      const r = importar(texto);
      if (!r.ok) {
        decir(r.error);
        return;
      }
      // Aviso, no bloqueo: restaurar en otro dispositivo o perfil es un uso normal de la copia.
      const ok = window.confirm(mensajeImportar(r.origen, nombreAlumno ?? null));
      if (!ok) return;
      datos.reemplazar(aplicarImportacion(datos.estado(), r.estado, r.incluyeHistorial));
    }

    const importarCodigo = boton('Importar código', 'boton-secundario', () => confirmarEImportar(areaCodigo.value));
    const selectorFichero = el('input');
    selectorFichero.type = 'file';
    selectorFichero.accept = 'application/json,.json';
    selectorFichero.hidden = true;
    selectorFichero.addEventListener('change', async () => {
      const fichero = selectorFichero.files?.[0];
      if (fichero) confirmarEImportar(await fichero.text());
      selectorFichero.value = '';
    });
    const importarFichero = boton('Importar fichero', 'boton-secundario', () => selectorFichero.click());

    const ayuda = el('div', 'acciones acciones-rejilla');
    if (datos.abrirGuia) ayuda.append(boton('Cómo aprender con Capitalia', 'boton-principal', () => (dialogo.close(), datos.abrirGuia?.())));
    const instalar = datos.abrirInstalar?.();
    if (instalar) ayuda.append(boton('Instalar la app', 'boton-secundario', () => (dialogo.close(), instalar())));
    if (datos.abrirAcercaDe) ayuda.append(boton('Acerca de', 'boton-secundario', () => (dialogo.close(), datos.abrirAcercaDe?.())));
    const temas: { valor: Tema; texto: string }[] = [
      { valor: 'auto', texto: 'Automático' },
      { valor: 'claro', texto: 'Claro' },
      { valor: 'oscuro', texto: 'Oscuro' },
    ];
    const selectorTema = el('div', 'selector-practica selector-tema');
    selectorTema.setAttribute('role', 'group');
    selectorTema.setAttribute('aria-label', 'Tema');
    const botonesTema = temas.map((t) => {
      const b = boton(t.texto, 'selector-opcion', () => {
        guardarTema(t.valor);
        for (const x of botonesTema) x.setAttribute('aria-pressed', String(x === b));
      });
      b.setAttribute('aria-pressed', String(leerTema() === t.valor));
      return b;
    });
    selectorTema.append(...botonesTema);
    const alumno = datos.alumno?.();
    // Tu perfil: imagen y nombre (con varios alumnos, tocarlos deja cambiar), lápiz para editar y "+" para añadir.
    let bloqueAlumno: HTMLElement | null = null;
    if (alumno) {
      const quien = alumno.varios && datos.cambiarAlumno
        ? boton('', 'chip-alumno', () => (dialogo.close(), datos.cambiarAlumno?.()))
        : el('span', 'alumno-actual');
      quien.append(avatar(alumno.perfil), el('span', 'perfil-nombre', nombreVisible(alumno.perfil)));
      if (alumno.varios) {
        quien.append(el('span', 'chip-alumno-cambiar', 'Cambiar'));
        quien.setAttribute('aria-label', `${nombreVisible(alumno.perfil)}. Cambiar de alumno`);
      }
      const lapiz = datos.editarPerfil ? boton('✎', 'boton-icono', () => (dialogo.close(), datos.editarPerfil?.())) : null;
      lapiz?.setAttribute('aria-label', 'Editar perfil');
      lapiz?.setAttribute('title', 'Editar perfil');
      let anadir: HTMLButtonElement | null = null;
      if (datos.anadirAlumno) {
        anadir = boton('', 'boton-anadir', () => (dialogo.close(), datos.anadirAlumno?.()));
        anadir.append(el('span', 'circulo-mas', '+'), el('span', 'texto-anadir', 'Añadir alumno'));
        anadir.setAttribute('aria-label', 'Añadir alumno');
      }
      bloqueAlumno = el(
        'section',
        'bloque-alumno',
        el('h3', 'dialogo-subtitulo', 'Tu perfil'),
        el('div', 'fila-perfil', el('div', 'fila-perfil-quien', quien, lapiz), anadir),
      );
    }
    const contenido = el(
      'div',
      'dialogo-contenido',
      el('h2', 'dialogo-titulo', 'Más'),
      bloqueAlumno,
      el('h3', 'dialogo-subtitulo', 'Ayuda'),
      ayuda,
      el('h3', 'dialogo-subtitulo', 'Tema'),
      selectorTema,
      el('p', 'ayuda', 'Automático sigue el modo claro u oscuro del dispositivo.'),
      el('h3', 'dialogo-subtitulo', 'Copia de seguridad'),
      el(
        'p',
        'ayuda',
        alumnoActual?.varios
          ? `Esta copia es solo de ${nombreAlumno ?? 'este alumno'}. La de todos los alumnos está en el panel de adultos (Ajustes → Alumnos).`
          : 'Tu progreso se guarda solo en este dispositivo. Descarga una copia de vez en cuando, o usa el código para pasarlo a otro dispositivo.',
      ),
      el('div', 'acciones', descargar, copiar),
      areaCodigo,
      el('div', 'acciones', importarCodigo, importarFichero, selectorFichero),
      mensaje,
    );
    if (datos.abrirPanelAdultos) {
      const abrirPanel = boton('Panel para adultos', 'boton-secundario', () => {
        dialogo.close();
        datos.abrirPanelAdultos?.();
      });
      const guiaAdultos = datos.abrirGuiaAdultos
        ? boton('Guía para madres y padres', 'boton-secundario', () => (dialogo.close(), datos.abrirGuiaAdultos?.()))
        : null;
      const accionesAdultos = el('div', 'acciones', abrirPanel);
      if (guiaAdultos) accionesAdultos.append(guiaAdultos);
      contenido.append(el('h3', 'dialogo-subtitulo', 'Adultos'), accionesAdultos);
    }
    contenido.append(el('div', 'acciones acciones-cerrar', boton('Cerrar', 'boton-secundario', () => dialogo.close())));
    dialogo.replaceChildren(contenido);
    dialogo.showModal();
  }

  disparador.addEventListener('click', abrir);
}

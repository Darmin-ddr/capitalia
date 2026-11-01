import { aplicarImportacion, exportarCodigo, exportarFichero, importar, nombreFichero } from '../logic/copia';
import type { EstadoProgreso } from '../logic/progreso';
import { boton, el } from './dom';
import { guardarTema, leerTema, type Tema } from './tema';

export interface DatosMas {
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

    const descargar = boton('Descargar copia', 'boton-principal', () => {
      const blob = new Blob([exportarFichero(datos.estado())], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = el('a');
      a.href = url;
      a.download = nombreFichero();
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
      const codigo = exportarCodigo(datos.estado());
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
      const ok = window.confirm('Se sustituirá el progreso de este dispositivo por el de la copia. ¿Seguir?');
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

    const ayuda = el('div', 'acciones');
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
    const contenido = el(
      'div',
      'dialogo-contenido',
      el('h2', 'dialogo-titulo', 'Más'),
      ayuda,
      el('h3', 'dialogo-subtitulo', 'Tema'),
      selectorTema,
      el('p', 'ayuda', 'Automático sigue el modo claro u oscuro del dispositivo.'),
      el('h3', 'dialogo-subtitulo', 'Copia de seguridad'),
      el(
        'p',
        'ayuda',
        'Tu progreso se guarda solo en este dispositivo. Descarga una copia de vez en cuando, o usa el código para pasarlo a otro dispositivo.',
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

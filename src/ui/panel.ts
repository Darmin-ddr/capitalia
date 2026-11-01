import {
  actividadReciente,
  comprobarPin,
  diasHastaExamen,
  dominioPorRegion,
  hashPin,
  paisesAtascados,
  pinValido,
} from '../logic/adultos';
import { estadoVacio, type EstadoProgreso } from '../logic/progreso';
import type { Pais, Region } from '../logic/types';
import { boton, el } from './dom';

export interface DatosPanel {
  estado(): EstadoProgreso;
  guardar(): void;
  regiones: readonly Region[];
  /** Países activos de una región. */
  paisesDe(regionId: string): readonly Pais[];
  /** Todos los países con datos (incluidos los opcionales desactivados). */
  todos: readonly Pais[];
  /** Aplica cambios que afectan a los datos (países opcionales, examen): reinicia la app. */
  recargar(): void;
}

type Seccion = 'resumen' | 'examen' | 'trucos' | 'ajustes';

const NOMBRES: Record<Seccion, string> = { resumen: 'Resumen', examen: 'Examen', trucos: 'Trucos', ajustes: 'Ajustes' };
const NIVELES = ['Sin empezar', 'Aprendiendo', 'En repaso', 'Dominados'];

/**
 * Panel de adultos (SPEC 8), protegido con PIN: progreso por región, países
 * que más se atascan, actividad reciente, lista y fecha de examen, países
 * opcionales, edición de trucos y reinicio del progreso.
 */
export function crearPanelAdultos(datos: DatosPanel): () => void {
  const dialogo = el('dialog', 'dialogo-regiones dialogo-panel');
  dialogo.setAttribute('aria-label', 'Panel para adultos');
  document.body.append(dialogo);
  let seccion: Seccion = 'resumen';
  let cambiosQueRecargan = false;

  dialogo.addEventListener('close', () => {
    if (cambiosQueRecargan) datos.recargar();
  });

  function cerrarBoton(): HTMLButtonElement {
    return boton('Cerrar', 'boton-secundario', () => dialogo.close());
  }

  /* ---------- PIN ---------- */

  function pantallaPin(): void {
    const estado = datos.estado();
    const mensaje = el('p', 'mensaje-copia');
    mensaje.setAttribute('role', 'status');
    const campo = (etiqueta: string) => {
      const i = el('input', 'campo-texto campo-pin');
      i.type = 'password';
      i.inputMode = 'numeric';
      i.autocomplete = 'off';
      i.maxLength = 6;
      i.setAttribute('aria-label', etiqueta);
      i.placeholder = etiqueta;
      return i;
    };

    if (!estado.ajustes.pinHash) {
      const pin1 = campo('Nuevo PIN (4 a 6 cifras)');
      const pin2 = campo('Repite el PIN');
      const form = el('form', 'respuesta-form', pin1, pin2, el('div', 'acciones', enviar('Crear PIN'), cerrarBoton()));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!pinValido(pin1.value)) return void (mensaje.textContent = 'El PIN debe tener de 4 a 6 cifras.');
        if (pin1.value !== pin2.value) return void (mensaje.textContent = 'Los dos PIN no coinciden.');
        estado.ajustes.pinHash = await hashPin(pin1.value);
        datos.guardar();
        pantallaPanel();
      });
      contenido(
        el('h2', 'dialogo-titulo', 'Panel para adultos'),
        el('p', 'ayuda', 'Crea un PIN para que el panel no se abra por accidente. Es una cerradura sencilla: los datos están solo en este dispositivo.'),
        form,
        mensaje,
      );
      pin1.focus();
      return;
    }

    const pin = campo('PIN');
    const olvidado = boton('¿Lo has olvidado?', 'boton-enlace', () => {
      const ok = window.confirm(
        'Se borrará el PIN y se volverá a los ajustes iniciales (sin lista de examen, trucos sin editar). El progreso del alumno se conserva. ¿Seguir?',
      );
      if (!ok) return;
      estado.ajustes = estadoVacio().ajustes;
      datos.guardar();
      cambiosQueRecargan = true;
      pantallaPin();
    });
    const form = el('form', 'respuesta-form', pin, el('div', 'acciones', enviar('Entrar'), cerrarBoton()));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (await comprobarPin(pin.value, estado.ajustes.pinHash)) pantallaPanel();
      else {
        mensaje.textContent = 'PIN incorrecto.';
        pin.select();
      }
    });
    contenido(el('h2', 'dialogo-titulo', 'Panel para adultos'), form, mensaje, olvidado);
    pin.focus();
  }

  function enviar(texto: string): HTMLButtonElement {
    const b = el('button', 'boton-principal', texto);
    b.type = 'submit';
    return b;
  }

  function contenido(...hijos: Node[]): HTMLElement {
    const c = el('div', 'dialogo-contenido');
    c.append(...hijos);
    dialogo.replaceChildren(c);
    return c;
  }

  /* ---------- Panel ---------- */

  function pantallaPanel(): void {
    const pestanas = el('div', 'selector-practica selector-panel');
    for (const s of Object.keys(NOMBRES) as Seccion[]) {
      const b = boton(NOMBRES[s], 'selector-opcion', () => {
        seccion = s;
        pantallaPanel();
      });
      b.setAttribute('aria-pressed', String(s === seccion));
      pestanas.append(b);
    }
    const cuerpo = el('div', 'panel-cuerpo');
    contenido(el('h2', 'dialogo-titulo', 'Panel para adultos'), pestanas, cuerpo, el('div', 'acciones acciones-cerrar', cerrarBoton()));
    ({ resumen: pintarResumen, examen: pintarExamen, trucos: pintarTrucos, ajustes: pintarAjustes })[seccion](cuerpo);
  }

  function pintarResumen(cuerpo: HTMLElement): void {
    const estado = datos.estado();
    const ahora = new Date();
    const regiones = dominioPorRegion(estado, datos.regiones, datos.paisesDe);
    const tabla = el('div', 'tabla-dominio');
    for (const d of regiones) {
      const barra = el('div', 'barra-dominio');
      barra.setAttribute('role', 'img');
      barra.setAttribute('aria-label', d.porNivel.map((n, i) => `${NIVELES[i]}: ${n}`).join(', '));
      d.porNivel.forEach((n, i) => {
        if (!n) return;
        const tramo = el('span', `tramo nivel-tramo-${i}`);
        tramo.style.flexGrow = String(n);
        tramo.style.setProperty('--color-pais', d.region.color);
        barra.append(tramo);
      });
      tabla.append(
        el('div', 'fila-dominio', el('span', 'fila-nombre', d.region.nombre), barra, el('span', 'fila-cifra', `${d.porNivel[3]}/${d.total}`)),
      );
    }
    const leyenda = el(
      'p',
      'leyenda',
      ...NIVELES.flatMap((n, i) => [el('span', `muestra nivel-tramo-${i}`), ` ${n}  `]),
    );

    const atascados = paisesAtascados(estado, datos.regiones.flatMap((r) => datos.paisesDe(r.id)).filter(unicos()), ahora);
    const listaAtascados = atascados.length
      ? el('ul', 'lista-simple', ...atascados.map((a) => el('li', '', el('strong', '', a.pais.nombre), ` (${a.pais.capital}): ${plural(a.fallos, 'fallo', 'fallos')} de ${plural(a.intentos, 'intento', 'intentos')}`)))
      : el('p', 'ayuda', 'Ningún fallo en los últimos 30 días.');

    const act = actividadReciente(estado, ahora, 14);
    const max = Math.max(1, ...act.map((d) => d.respuestas));
    const graf = el('div', 'grafico-actividad');
    graf.setAttribute('role', 'img');
    graf.setAttribute('aria-label', `Respuestas en los últimos 14 días: ${act.reduce((s, d) => s + d.respuestas, 0)}`);
    for (const d of act) {
      const col = el('div', 'columna-actividad');
      const alto = el('span', 'barra-actividad');
      alto.style.height = `${(d.respuestas / max) * 100}%`;
      alto.title = `${d.dia}: ${d.respuestas} respuestas, ${d.aciertos} bien`;
      col.append(alto, el('span', 'dia-actividad', d.dia.slice(8)));
      graf.append(col);
    }
    const total = act.reduce((s, d) => s + d.respuestas, 0);
    const diasActivos = act.filter((d) => d.respuestas > 0).length;

    cuerpo.append(
      el('h3', 'dialogo-subtitulo', 'Dominio por región'),
      tabla,
      leyenda,
      el('h3', 'dialogo-subtitulo', 'Los que más se atascan'),
      listaAtascados,
      el('h3', 'dialogo-subtitulo', 'Actividad (14 días)'),
      graf,
      el('p', 'ayuda', `${plural(total, 'respuesta', 'respuestas')} en ${plural(diasActivos, 'día', 'días')}.`),
    );
  }

  function pintarExamen(cuerpo: HTMLElement): void {
    const estado = datos.estado();
    const seleccion = new Set(estado.ajustes.listaExamen ?? []);
    const fecha = el('input', 'campo-texto campo-fecha');
    fecha.type = 'date';
    fecha.value = estado.ajustes.fechaExamen ?? '';
    fecha.setAttribute('aria-label', 'Fecha del examen');
    const contador = el('p', 'ayuda');
    const actualizarContador = () => {
      const dias = diasHastaExamen(fecha.value || null, new Date());
      contador.textContent = `${seleccion.size} países en el examen` + (dias !== null ? ` · ${textoDias(dias)}` : '');
    };

    const grupos = el('div', 'grupos-examen');
    for (const r of [...datos.regiones].sort((a, b) => (a.continente === b.continente ? a.orden - b.orden : a.continente === 'europa' ? -1 : 1))) {
      const paises = datos.paisesDe(r.id).filter((p) => p.region === r.id); // cada país en su región principal
      if (!paises.length) continue;
      const todos = el('input');
      todos.type = 'checkbox';
      const casillas: HTMLInputElement[] = [];
      const lista = el('div', 'casillas');
      for (const p of paises) {
        const c = el('input');
        c.type = 'checkbox';
        c.checked = seleccion.has(p.id);
        c.addEventListener('change', () => {
          if (c.checked) seleccion.add(p.id);
          else seleccion.delete(p.id);
          sincronizar();
          actualizarContador();
        });
        casillas.push(c);
        lista.append(el('label', 'casilla', c, ` ${p.nombre}`));
      }
      const sincronizar = () => {
        const marcadas = casillas.filter((c) => c.checked).length;
        todos.checked = marcadas === casillas.length;
        todos.indeterminate = marcadas > 0 && marcadas < casillas.length;
      };
      todos.addEventListener('change', () => {
        casillas.forEach((c, i) => {
          c.checked = todos.checked;
          if (todos.checked) seleccion.add(paises[i].id);
          else seleccion.delete(paises[i].id);
        });
        actualizarContador();
      });
      sincronizar();
      const detalles = el('details', 'grupo-examen', el('summary', '', el('label', 'casilla', todos, ` ${r.nombre}`)), lista);
      grupos.append(detalles);
    }
    fecha.addEventListener('change', actualizarContador);
    actualizarContador();

    const guardar = boton('Guardar examen', 'boton-principal', () => {
      estado.ajustes.listaExamen = seleccion.size ? [...seleccion] : null;
      estado.ajustes.fechaExamen = fecha.value || null;
      datos.guardar();
      cambiosQueRecargan = true;
      aviso.textContent = 'Guardado. El alumno verá "Preparar examen" en Repaso.';
    });
    const quitar = boton('Quitar examen', 'boton-secundario', () => {
      estado.ajustes.listaExamen = null;
      estado.ajustes.fechaExamen = null;
      datos.guardar();
      cambiosQueRecargan = true;
      pantallaPanel();
    });
    const aviso = el('p', 'mensaje-copia');
    aviso.setAttribute('role', 'status');
    cuerpo.append(
      el(
        'p',
        'ayuda',
        'Marca los países que entran en el examen y su fecha. En Repaso aparecerá "Preparar examen", que pregunta primero lo más flojo. Los fallos en modo examen no alteran la planificación normal.',
      ),
      el('label', 'etiqueta-campo', 'Fecha del examen', fecha),
      contador,
      grupos,
      el('div', 'acciones', guardar, quitar),
      aviso,
    );
  }

  function pintarTrucos(cuerpo: HTMLElement): void {
    const estado = datos.estado();
    const selector = el('select', 'campo-texto');
    selector.setAttribute('aria-label', 'Región');
    for (const r of datos.regiones) {
      const o = el('option', '', r.nombre);
      o.value = r.id;
      selector.append(o);
    }
    const lista = el('div', 'lista-trucos');
    const pintar = () => {
      lista.replaceChildren();
      for (const p of datos.paisesDe(selector.value).filter((x) => x.region === selector.value)) {
        const original = p.trucos[0]?.texto ?? '';
        const area = el('textarea', 'campo-truco');
        area.rows = 2;
        area.value = estado.ajustes.trucosEditados[p.id] ?? original;
        area.placeholder = 'Sin truco';
        area.setAttribute('aria-label', `Truco de ${p.nombre}`);
        area.addEventListener('change', () => {
          const texto = area.value.trim();
          if (texto === original || (!texto && !original)) delete estado.ajustes.trucosEditados[p.id];
          else estado.ajustes.trucosEditados[p.id] = texto;
          datos.guardar();
        });
        const desactivar = el('input');
        desactivar.type = 'checkbox';
        desactivar.checked = estado.ajustes.trucosDesactivados.includes(p.id);
        desactivar.addEventListener('change', () => {
          const lista = new Set(estado.ajustes.trucosDesactivados);
          if (desactivar.checked) lista.add(p.id);
          else lista.delete(p.id);
          estado.ajustes.trucosDesactivados = [...lista];
          datos.guardar();
        });
        const propio = estado.trucosPropios[p.id];
        lista.append(
          el(
            'div',
            'fila-truco',
            el('p', 'fila-truco-titulo', el('strong', '', p.nombre), ` · ${p.capital}`),
            area,
            el('label', 'casilla', desactivar, ' No mostrar este truco'),
            propio && el('p', 'nota', `Truco propio del alumno (tiene prioridad): «${propio}»`),
          ),
        );
      }
    };
    selector.addEventListener('change', pintar);
    pintar();
    cuerpo.append(
      el('p', 'ayuda', 'Los cambios se guardan al salir de cada cuadro. Si el alumno ha inventado su propio truco, se le muestra el suyo.'),
      selector,
      lista,
    );
  }

  function pintarAjustes(cuerpo: HTMLElement): void {
    const estado = datos.estado();
    const opcionales = datos.todos.filter((p) => p.opcional);
    const casillas = opcionales.map((p) => {
      const c = el('input');
      c.type = 'checkbox';
      c.checked = estado.ajustes.opcionalesActivados.includes(p.id);
      c.addEventListener('change', () => {
        const s = new Set(estado.ajustes.opcionalesActivados);
        if (c.checked) s.add(p.id);
        else s.delete(p.id);
        estado.ajustes.opcionalesActivados = [...s];
        datos.guardar();
        cambiosQueRecargan = true;
      });
      return el('label', 'casilla', c, ` ${p.nombre} (${p.capital})`);
    });

    const todas = el('input');
    todas.type = 'checkbox';
    todas.checked = estado.ajustes.todasDesbloqueadas;
    todas.addEventListener('change', () => {
      estado.ajustes.todasDesbloqueadas = todas.checked;
      datos.guardar();
      cambiosQueRecargan = true;
    });

    const mensaje = el('p', 'mensaje-copia');
    mensaje.setAttribute('role', 'status');
    const pin1 = el('input', 'campo-texto campo-pin');
    pin1.type = 'password';
    pin1.inputMode = 'numeric';
    pin1.maxLength = 6;
    pin1.placeholder = 'Nuevo PIN';
    pin1.setAttribute('aria-label', 'Nuevo PIN');
    const cambiarPin = boton('Cambiar PIN', 'boton-secundario', async () => {
      if (!pinValido(pin1.value)) return void (mensaje.textContent = 'El PIN debe tener de 4 a 6 cifras.');
      estado.ajustes.pinHash = await hashPin(pin1.value);
      datos.guardar();
      pin1.value = '';
      mensaje.textContent = 'PIN cambiado.';
    });

    const reiniciar = boton('Reiniciar progreso', 'boton-secundario boton-peligro', () => {
      if (!window.confirm('Se borrará todo el progreso del alumno (repasos e historial). Los ajustes y los trucos propios se conservan. ¿Seguir?')) return;
      if (!window.confirm('¿Seguro? No se puede deshacer (salvo que tengas una copia de seguridad).')) return;
      const limpio = estadoVacio();
      estado.tarjetas = limpio.tarjetas;
      estado.historial = limpio.historial;
      estado.regionesCelebradas = limpio.regionesCelebradas;
      estado.ultimaRegion = null;
      datos.guardar();
      cambiosQueRecargan = true;
      mensaje.textContent = 'Progreso reiniciado.';
    });

    cuerpo.append(
      el('h3', 'dialogo-subtitulo', 'Regiones'),
      el('label', 'casilla', todas, ' Desbloquear todas las regiones'),
      el('p', 'ayuda', 'Normalmente se abren de una en una según el progreso. Útil si el examen o el curso van por otro orden.'),
      el('h3', 'dialogo-subtitulo', 'Países opcionales'),
      el('p', 'ayuda', 'No están en los listados de clase. Desactivados por defecto.'),
      ...casillas,
      el('h3', 'dialogo-subtitulo', 'PIN'),
      el('div', 'acciones', pin1, cambiarPin),
      el('h3', 'dialogo-subtitulo', 'Progreso'),
      el('p', 'ayuda', 'Antes de reiniciar, conviene descargar una copia de seguridad (botón ⋯).'),
      el('div', 'acciones', reiniciar),
      mensaje,
    );
  }

  return () => {
    seccion = 'resumen';
    cambiosQueRecargan = false;
    pantallaPin();
    dialogo.showModal();
  };
}

function unicos<T extends { id: string }>(): (x: T, i: number, a: T[]) => boolean {
  return (x, i, a) => a.findIndex((y) => y.id === x.id) === i;
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

export function textoDias(dias: number): string {
  if (dias > 1) return `faltan ${dias} días`;
  if (dias === 1) return 'es mañana';
  if (dias === 0) return 'es hoy';
  return 'ya pasó';
}

/**
 * Tema de la interfaz: Automático (el del sistema), Claro u Oscuro. Es una
 * preferencia de este dispositivo: se guarda aparte del progreso y no viaja
 * con la copia de seguridad. Si el almacenamiento falla, queda en Automático.
 */
export type Tema = 'auto' | 'claro' | 'oscuro';

const CLAVE = 'capitalia-tema';
const COLOR_BARRA = { claro: '#f6f4ef', oscuro: '#161b22' };

export function leerTema(): Tema {
  try {
    const t = localStorage.getItem(CLAVE);
    return t === 'claro' || t === 'oscuro' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement;
  if (tema === 'auto') raiz.removeAttribute('data-theme');
  else raiz.dataset.theme = tema === 'claro' ? 'light' : 'dark';
  // Color de la barra del navegador (móvil): el del tema elegido, o el del sistema.
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m, i) => {
    const sistema = i === 0 ? COLOR_BARRA.claro : COLOR_BARRA.oscuro;
    m.content = tema === 'auto' ? sistema : COLOR_BARRA[tema];
  });
}

export function guardarTema(tema: Tema): void {
  try {
    if (tema === 'auto') localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, tema);
  } catch {
    // Sin almacenamiento: el tema dura hasta cerrar.
  }
  aplicarTema(tema);
}

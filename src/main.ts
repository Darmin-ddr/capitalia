import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './ui/estilos.css';
import { iniciarApp } from './ui/app';

iniciarApp();

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

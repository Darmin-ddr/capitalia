import datos from './countries.json';
import regionesJson from './regions.json';
import type { Pais, Region } from '../logic/types';

// El JSON no conserva tipos como [lon, lat]; los tests de datos validan la forma.
export const paises = datos.paises as unknown as Pais[];
export const regiones = regionesJson as unknown as Region[];

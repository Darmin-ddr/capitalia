# Capitalia

Herramienta para aprender las capitales de Europa y Asia sobre un mapa (3º de ESO).
La especificación del producto está en [`SPEC.md`](SPEC.md) y las normas de trabajo en [`CLAUDE.md`](CLAUDE.md).

Estado: **hito 1** (prototipo con la región de los Balcanes, modos Explorar y Practicar).

## Uso en local

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # tests de la lógica y de los datos
npm run build    # compilación para publicar (carpeta dist/)
```

## Publicación

Cada push a `main` (y, durante el hito 1, a la rama de trabajo) compila, pasa los tests y publica en GitHub Pages mediante `.github/workflows/pages.yml`.

## Datos y licencias

- Mapa: [Natural Earth](https://www.naturalearthdata.com/) (dominio público), vía el paquete `world-atlas`.
- Coordenadas de capitales: [GeoNames](https://www.geonames.org/) (CC BY 4.0).
- Países y capitales: listados de clase en `docs/listas/`, fuente de verdad del proyecto.
- Tipografía: Nunito (SIL Open Font License), vía `@fontsource/nunito`.

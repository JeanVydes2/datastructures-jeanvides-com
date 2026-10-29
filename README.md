# Estructuras de datos

Visualizador interactivo de estructuras de datos con Next.js. Cada estructura
tiene su propia página, seleccionable desde la barra lateral.

## Páginas

- **Inicio** (`/`): índice con accesos a las estructuras.
- **Árbol binario de búsqueda** (`/bst`):
  - Insertar un valor recorriendo el árbol: se resalta el camino de comparación
    hasta llegar a un hueco `null`, explicando cada decisión (izquierda/derecha).
  - Buscar un nodo marcando el camino recorrido hasta encontrarlo.
  - Recorridos **inorden**, **preorden** y **postorden**, animando el orden.
  - Métricas de **altura**, **hojas** y número de nodos.
  - El árbol se dibuja como SVG, posicionando los nodos por índice inorden para
    que ningún subárbol se solape.
- **Montículo** (`/heap`): **min-heap** y **max-heap** (conmutables), con
  inserción (burbujeo hacia arriba), extracción de la raíz, arreglo subyacente,
  altura, hojas y orden por extracción.

Las animaciones usan transiciones de color y alturas con fundido suave
(`fade-in`), y se desactivan solas con `prefers-reduced-motion`.

## Desarrollo

Requiere Node.js 20 o superior. Node está instalado en `~/.local/node` y su
`bin` está en el `PATH` de los rc del shell.

```bash
npm install
npm run dev     # http://localhost:3000
```

Otros comandos: `npm run build` (build de producción), `npm start` (servir el
build) y `npm run lint` (ESLint).

> No ejecutes `npm run build` mientras el servidor de desarrollo está en marcha:
> ambos escriben en `.next` y el servidor falla con `Cannot find module`. Para
> comprobar el build, detén `npm run dev` y vuelve a levantarlo después.

## Estructura

```
app/            páginas (App Router): /, /bst, /heap y el layout con sidebar
components/     ui (tarjetas, botones), Sidebar y TreeCanvas (SVG)
lib/            lógica pura: árbol binario de búsqueda, montículo y layout
```

La lógica de las estructuras vive en `lib/` sin dependencias de React, de modo
que es fácil de probar y reutilizar.

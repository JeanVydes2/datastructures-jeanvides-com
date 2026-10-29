# Estructuras de datos

Visualizador interactivo de estructuras de datos con Next.js. Cada estructura
tiene su propia página, seleccionable desde la barra lateral.

## Páginas

- **Inicio** (`/`): índice con accesos a las estructuras.
- **Árbol binario de búsqueda** (`/bst`):
  - **Insertar** un valor recorriendo el árbol: se resalta el camino de
    comparación hasta llegar a un hueco nulo, que se dibuja como un nodo
    efímero `null` un instante y desaparece para dar a entender que se visitó.
  - Un **duplicado** solo se descubre al llegar a su nodo, así que también se
    recorre antes de rechazarlo.
  - Se admiten valores sueltos o una **lista** (`800, 1200, 1500, …`) que entra
    de uno en uno.
  - **Buscar** un nodo marcando el camino recorrido hasta encontrarlo (o hasta
    el hueco nulo donde se agota).
  - Recorridos **inorden**, **preorden** y **postorden**: la animación baja
    desde la raíz llamando a la izquierda y comprobando cada hijo antes de
    imprimir, de modo que se ve por qué el primer valor impreso no es la raíz.
  - Métricas de **altura**, **hojas** y número de nodos.
  - El árbol se dibuja como SVG, posicionando los nodos por índice inorden para
    que ningún subárbol se solape.
  - Control de **velocidad** de la animación (lento, normal, rápido).
- **Montículo** (`/heap`): **min-heap** y **max-heap** (conmutables), con inserción (burbujeo hacia arriba), extracción de la raíz, arreglo subyacente, altura, hojas y orden por extracción. Comparte con el árbol la entrada por listas, el control de velocidad, el recorrido de un duplicado hasta su nodo y los hijos nulos dibujados un instante al comprobarlos.

La interfaz es monocroma: estados por relleno y grosor, sin color ni
gradientes. Las animaciones usan transiciones cortas y se desactivan solas con
`prefers-reduced-motion`.

## Desarrollo

Requiere Node.js 20 o superior.

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
que es fácil de probar y reutilizar. `traversalTrace` produce el recorrido paso
a paso (descenso, comprobaciones de hijos nulos y momento de impresión) y
`insert` devuelve la traza del descenso junto al árbol nuevo.

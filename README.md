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
  - **Eliminar** un nodo mostrando cómo se reemplaza: sin hijos (su hueco queda
    nulo), con un solo hijo (ese hijo sube a su lugar) o con dos (lo reemplaza
    el sucesor inorden, el menor del subárbol derecho).
  - Recorridos **inorden**, **preorden** y **postorden**: la animación baja
    desde la raíz llamando a la izquierda y comprobando cada hijo antes de
    imprimir, de modo que se ve por qué el primer valor impreso no es la raíz.
  - Métricas de **altura**, **hojas** y número de nodos.
  - El árbol se dibuja como SVG, posicionando los nodos por índice inorden para
    que ningún subárbol se solape.
  - Control de **velocidad** de la animación (lento, normal, rápido).
- **Grafos** (`/graph`): dirigido o no dirigido, ponderado o no, con bucles.
  - **Operaciones**: añadir y quitar vértices y aristas (inmutables).
  - **Recorridos** BFS y DFS animados, con la cola o la pila a la vista.
  - **Algoritmos**: Dijkstra con relajación paso a paso, camino más corto
    entre dos vértices, orden topológico, componentes conexas y comprobación
    de bipartito.
  - **Métricas**: orden, tamaño, densidad, grados, suma de grados (2·|E|),
    peso total, conexo, conexión fuerte, componentes, ciclos, árbol, simple,
    completo, regular y orden topológico.
  - **Matriz y lista de adyacencia** en tablas, y dibujo con flechas, pesos y
    bucles sobre una disposición de fuerzas determinista.
- **Tabla hash** (`/hash`): pares clave-valor con **direccionamiento abierto**
  (sondeo lineal, cuadrático y doble hash) o **encadenamiento**. Cada
  operación se anima casilla a casilla: la función hash, la colisión, el
  sondeo, la colocación y el hallazgo. Al borrar en abierto queda una
  **lápida** para no romper las cadenas de sondeo, y la tabla se
  **redimensiona** (a un tamaño primo) cuando el factor de carga pasa de
  0.75. Métricas: factor de carga, ocupadas, lápidas, colisiones, sondeos
  medidos frente a los teóricos, y racimos.
- **Conjuntos y diccionarios** (`/sets`): ambos sobre una tabla hash. Un
  **conjunto** es la tabla cuyas claves son los elementos (el valor no
  importa), así que no admite repetidos y la pertenencia es una búsqueda;
  se operan unión, intersección, diferencia, diferencia simétrica,
  subconjunto, superconjunto, disjunción e igualdad. Un **diccionario** es
  la tabla guardando un valor por clave, con insertar, buscar, actualizar
  y eliminar.
- **Montículo** (`/heap`): **min-heap** y **max-heap** (conmutables), con
  inserción (burbujeo hacia arriba), **extracción** de la raíz y **eliminación
  de un valor cualquiera** (su hueco lo ocupa el último elemento, que sube o
  baja hasta reubicarse), arreglo subyacente, altura, hojas y orden por
  extracción. Comparte con el árbol la entrada por listas, el control de
  velocidad, el recorrido de un duplicado hasta su nodo y los hijos nulos
  dibujados un instante al comprobarlos.

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
app/            páginas: /, /bst, /heap, /graph, /hash, /sets y el layout
components/     ui (tarjetas, botones), Sidebar, TreeCanvas y GraphCanvas
lib/            lógica pura: árbol, montículo, grafo, tabla hash, conjuntos
tests/          pruebas de la lógica con el runner de Node
```

La lógica de las estructuras vive en `lib/` sin dependencias de React, de modo
que es fácil de probar y reutilizar. `traversalTrace` produce el recorrido paso
a paso (descenso, comprobaciones de hijos nulos y momento de impresión),
`insert` devuelve la traza del descenso junto al árbol nuevo, `remove` (igual
que `heapRemove`) describe cómo se reemplaza el nodo eliminado, y `walk`,
`dijkstra` y el resto de `graph.ts` devuelven su traza para animarlas.

### Pruebas

```bash
npm test     # node --test sobre tests/*.test.ts
```

Cubren la lógica de las tres estructuras de tabla: el grafo (grados,
densidad, ciclos, bipartito, topológico, Dijkstra, disposición
determinista), la tabla hash (las tres funciones, los cuatro métodos,
colisiones, lápidas, redimensionado, racimos) y los conjuntos (leyes de
De Morgan, conmutatividad, subconjuntos) con el diccionario.

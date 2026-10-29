/**
 * Grafo, con toda la casuística de la teoría: dirigido o no dirigido,
 * ponderado o no, con sus operaciones, métricas y algoritmos.
 *
 * Es inmutable: cada operación devuelve un grafo nuevo. Los vértices se
 * identifican por su etiqueta (un texto), y las aristas se guardan como una
 * lista de pares, de modo que se admiten bucles y múltiples aristas mientras
 * no sean idénticas.
 */

/** Una arista entre dos vértices. */
export interface GraphEdge {
  /** Etiqueta del vértice de origen. */
  from: string;
  /** Etiqueta del vértice de destino (igual a `from` en un bucle). */
  to: string;
  /** Peso de la arista. */
  weight: number;
}

/** Un grafo con sus vértices, aristas y propiedades. */
export interface Graph {
  /** Etiquetas de los vértices, en orden de inserción. */
  nodes: string[];
  /** Aristas. En un grafo no dirigido, cada arista se cuenta una vez. */
  edges: GraphEdge[];
  /** Si las aristas tienen dirección. */
  directed: boolean;
  /** Si las aristas llevan peso. */
  weighted: boolean;
}

/** Crea un grafo vacío. */
export const emptyGraph = (
  directed = false,
  weighted = false,
): Graph => ({ nodes: [], edges: [], directed, weighted });

/** Clave canónica de una arista, para comparar y deduplicar. */
export function edgeKey(g: Graph, e: GraphEdge): string {
  return g.directed
    ? `${e.from}\u0000${e.to}`
    : [e.from, e.to].sort().join("\u0000");
}

/** ¿Existe ya una arista entre `a` y `b`? */
export function hasEdge(g: Graph, a: string, b: string): boolean {
  const target = g.directed
    ? `${a}\u0000${b}`
    : [a, b].sort().join("\u0000");
  return g.edges.some((e) => edgeKey(g, e) === target);
}

/** Devuelve la arista entre `a` y `b`, si existe. */
export function getEdge(g: Graph, a: string, b: string): GraphEdge | undefined {
  const target = g.directed
    ? `${a}\u0000${b}`
    : [a, b].sort().join("\u0000");
  return g.edges.find((e) => edgeKey(g, e) === target);
}

/** Añade un vértice. Si ya existe, devuelve el mismo grafo. */
export function addNode(g: Graph, label: string): Graph {
  if (g.nodes.includes(label)) return g;
  return { ...g, nodes: [...g.nodes, label] };
}

/** Elimina un vértice y todas las aristas que lo tocan. */
export function removeNode(g: Graph, label: string): Graph {
  if (!g.nodes.includes(label)) return g;
  return {
    ...g,
    nodes: g.nodes.filter((n) => n !== label),
    edges: g.edges.filter((e) => e.from !== label && e.to !== label),
  };
}

/**
 * Añade una arista entre dos vértices que deben existir. Se admite un bucle
 * (el grafo deja de ser simple); una arista ya existente no se duplica.
 */
export function addEdge(
  g: Graph,
  from: string,
  to: string,
  weight = 1,
): Graph {
  if (!g.nodes.includes(from) || !g.nodes.includes(to)) return g;
  if (hasEdge(g, from, to)) return g;
  const e: GraphEdge = { from, to, weight: g.weighted ? weight : 1 };
  return { ...g, edges: [...g.edges, e] };
}

/** Elimina la arista entre dos vértices, si existe. */
export function removeEdge(g: Graph, a: string, b: string): Graph {
  const target = g.directed
    ? `${a}\u0000${b}`
    : [a, b].sort().join("\u0000");
  return { ...g, edges: g.edges.filter((e) => edgeKey(g, e) !== target) };
}

/** Cambia el peso de la arista entre dos vértices. */
export function setEdgeWeight(g: Graph, a: string, b: string, weight: number): Graph {
  const target = g.directed
    ? `${a}\u0000${b}`
    : [a, b].sort().join("\u0000");
  return {
    ...g,
    edges: g.edges.map((e) =>
      edgeKey(g, e) === target ? { ...e, weight } : e,
    ),
  };
}

/** Cambia dirigido/no dirigido. Al pasar a no dirigido, deduplica simétricas. */
export function setDirected(g: Graph, directed: boolean): Graph {
  if (directed === g.directed) return g;
  if (directed) return { ...g, directed: true };
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const e of g.edges) {
    const key = [e.from, e.to].sort().join("\u0000");
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push(e);
  }
  return { ...g, directed: false, edges };
}

/** Cambia ponderado/no ponderado. Al quitar el peso, todos valen 1. */
export function setWeighted(g: Graph, weighted: boolean): Graph {
  if (weighted === g.weighted) return g;
  return {
    ...g,
    weighted,
    edges: g.edges.map((e) => ({ ...e, weight: weighted ? e.weight : 1 })),
  };
}

/** Vértices adyacentes a `label`, con el peso de la arista. */
export function neighbors(
  g: Graph,
  label: string,
): { to: string; weight: number }[] {
  const out: { to: string; weight: number }[] = [];
  for (const e of g.edges) {
    if (g.directed) {
      if (e.from === label) out.push({ to: e.to, weight: e.weight });
    } else {
      if (e.from === label) out.push({ to: e.to, weight: e.weight });
      else if (e.to === label) out.push({ to: e.from, weight: e.weight });
    }
  }
  return out;
}

/** Suma de los pesos de las aristas. */
export function totalWeight(g: Graph): number {
  return g.edges.reduce((s, e) => s + e.weight, 0);
}

/** Grado de un vértice. En dirigido, `mode` distingue entrada, salida o total. */
export function degree(
  g: Graph,
  label: string,
  mode: "in" | "out" | "total" = "total",
): number {
  if (!g.directed) {
    return g.edges.filter(
      (e) =>
        (e.from === label && e.to !== label) ||
        (e.to === label && e.from !== label),
    ).length + 2 * g.edges.filter((e) => e.from === label && e.to === label).length;
  }
  const out = g.edges.filter((e) => e.from === label).length;
  const inc = g.edges.filter((e) => e.to === label).length;
  if (mode === "out") return out;
  if (mode === "in") return inc;
  return out + inc;
}

/** Grado de todos los vértices, indexado por etiqueta. */
export function degrees(g: Graph): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of g.nodes) out[n] = degree(g, n, g.directed ? "out" : "total");
  return out;
}

/**
 * Suma de los grados. Es 2·|E| si el grafo es no dirigido (sin bucles), que es
 * el lema del apretón de manos.
 */
export function degreeSum(g: Graph): number {
  return g.nodes.reduce((s, n) => s + degree(g, n, "total"), 0);
}

/** Densidad: proporción de aristas presentes sobre las posibles. */
export function density(g: Graph): number {
  const n = g.nodes.length;
  if (n < 2) return 0;
  const max = g.directed ? n * (n - 1) : (n * (n - 1)) / 2;
  // Los bucles no cuentan para la densidad de un grafo simple.
  const m = g.edges.filter((e) => e.from !== e.to).length;
  return max === 0 ? 0 : m / max;
}

/** ¿Es un grafo simple? (sin bucles ni aristas repetidas). */
export function isSimple(g: Graph): boolean {
  const seen = new Set<string>();
  for (const e of g.edges) {
    if (e.from === e.to) return false;
    const k = edgeKey(g, e);
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

/** Recorrido en anchura o en profundidad desde `start`, con su traza. */
export type WalkKind = "bfs" | "dfs";

/** Un paso de un recorrido de grafo. */
export interface WalkStep {
  /** Vértice tratado en este paso. */
  node: string;
  /** Vértices ya visitados, en orden. */
  visited: string[];
  /** Aristas usadas para llegar (clave canónica), para resaltarlas. */
  usedEdges: string[];
  /** Frontera o pila actual, para mostrarla. */
  frontier: string[];
  /** Explicación legible. */
  message: string;
}

/** Recorrido BFS o DFS con la traza completa, desde `start`. */
export function walk(g: Graph, start: string, kind: WalkKind): WalkStep[] {
  const steps: WalkStep[] = [];
  if (!g.nodes.includes(start)) {
    steps.push({
      node: start,
      visited: [],
      usedEdges: [],
      frontier: [],
      message: `${start} no está en el grafo.`,
    });
    return steps;
  }

  const visited: string[] = [];
  const usedEdges: string[] = [];
  const seen = new Set<string>();
  const structure: string[] = [start];
  seen.add(start);

  steps.push({
    node: start,
    visited: [],
    usedEdges: [],
    frontier: [...structure],
    message:
      kind === "bfs"
        ? `BFS: partimos de ${start} y lo ponemos en la cola.`
        : `DFS: partimos de ${start} y lo apilamos.`,
  });

  while (structure.length > 0) {
    const current = kind === "bfs" ? structure.shift()! : structure.pop()!;
    if (visited.includes(current)) continue;
    visited.push(current);

    // En DFS se apilan al revés para que el primer vecino en orden salga antes.
    const nbs = neighbors(g, current);
    const queue = kind === "dfs" ? [...nbs].reverse() : nbs;
    for (const nb of queue) {
      if (visited.includes(nb.to) || seen.has(nb.to)) continue;
      seen.add(nb.to);
      structure.push(nb.to);
      const k = g.directed
        ? `${current}\u0000${nb.to}`
        : [current, nb.to].sort().join("\u0000");
      usedEdges.push(k);
    }

    steps.push({
      node: current,
      visited: [...visited],
      usedEdges: [...usedEdges],
      frontier: [...structure],
      message:
        kind === "bfs"
          ? `Sacamos ${current} de la cola y visitamos sus vecinos sin visitar.`
          : `Sacamos ${current} de la pila y visitamos sus vecinos sin visitar.`,
    });
  }

  steps.push({
    node: visited[visited.length - 1] ?? start,
    visited: [...visited],
    usedEdges: [...usedEdges],
    frontier: [],
    message: `${kind === "bfs" ? "BFS" : "DFS"} terminado: ${visited.join(" → ")}.`,
  });
  return steps;
}

/**
 * Componentes conexas. En un grafo dirigido son las componentes débilmente
 * conexas (agrupando por las aristas sin atender a su dirección), que es lo
 * que se puede ver de un vistazo. Para las fuertemente conexas, compárese
 * cada vértice con `reachable`.
 */
export function components(g: Graph): string[][] {
  const result: string[][] = [];
  const remaining = new Set(g.nodes);
  while (remaining.size > 0) {
    const start = [...remaining][0];
    const comp: string[] = [];
    const stack = [start];
    remaining.delete(start);
    while (stack.length > 0) {
      const n = stack.pop()!;
      comp.push(n);
      const pool = [...neighbors(g, n), ...incoming(g, n)];
      for (const nb of pool) {
        if (remaining.has(nb.to)) {
          remaining.delete(nb.to);
          stack.push(nb.to);
        }
      }
    }
    result.push(comp.sort());
  }
  return result;
}

/** Vecinos que llegan a `label` (predecesores), en un grafo dirigido. */
function incoming(g: Graph, label: string): { to: string; weight: number }[] {
  return g.edges
    .filter((e) => e.to === label)
    .map((e) => ({ to: e.from, weight: e.weight }));
}

/** ¿Es conexo? (débilmente conexo si es dirigido). */
export function isConnected(g: Graph): boolean {
  if (g.nodes.length === 0) return true;
  return components(g).length === 1;
}

/** ¿Es fuertemente conexo? (cada par se alcanza en ambos sentidos). */
export function isStronglyConnected(g: Graph): boolean {
  if (!g.directed) return isConnected(g);
  for (const n of g.nodes) {
    if (reachable(g, n).size !== g.nodes.length) return false;
  }
  return true;
}

/** Vértices alcanzables desde `start` siguiendo las aristas dirigidas. */
export function reachable(g: Graph, start: string): Set<string> {
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length > 0) {
    const n = stack.pop()!;
    for (const nb of neighbors(g, n)) {
      if (!seen.has(nb.to)) {
        seen.add(nb.to);
        stack.push(nb.to);
      }
    }
  }
  return seen;
}

/** ¿Tiene ciclos? En dirigido, busca un ciclo dirigido. */
export function hasCycle(g: Graph): boolean {
  if (g.directed) {
    const WHITE = 0,
      GRAY = 1,
      BLACK = 2;
    const color: Record<string, number> = {};
    for (const n of g.nodes) color[n] = WHITE;
    const visit = (n: string): boolean => {
      color[n] = GRAY;
      for (const nb of neighbors(g, n)) {
        if (color[nb.to] === GRAY) return true;
        if (color[nb.to] === WHITE && visit(nb.to)) return true;
      }
      color[n] = BLACK;
      return false;
    };
    for (const n of g.nodes) if (color[n] === WHITE && visit(n)) return true;
    return false;
  }
  // No dirigido: se busca una arista que vuelva a un vértice ya visto que no
  // sea el padre inmediato.
  const seen = new Set<string>();
  const visit = (n: string, parent: string | null): boolean => {
    seen.add(n);
    for (const nb of neighbors(g, n)) {
      if (nb.to === parent) continue;
      if (seen.has(nb.to)) return true;
      if (visit(nb.to, n)) return true;
    }
    return false;
  };
  for (const n of g.nodes) if (!seen.has(n) && visit(n, null)) return true;
  return false;
}

/** ¿Es un árbol? Conexo y sin ciclos. */
export function isTree(g: Graph): boolean {
  if (g.nodes.length === 0) return true;
  return isConnected(g) && !hasCycle(g);
}

/** ¿Es bipartito? (2-coloreable). */
export function isBipartite(g: Graph): {
  bipartite: boolean;
  parts: [string[], string[]] | null;
} {
  const color: Record<string, number> = {};
  for (const start of g.nodes) {
    if (color[start] !== undefined) continue;
    color[start] = 0;
    const stack = [start];
    while (stack.length > 0) {
      const n = stack.pop()!;
      for (const nb of neighbors(g, n)) {
        if (color[nb.to] === undefined) {
          color[nb.to] = 1 - color[n];
          stack.push(nb.to);
        } else if (color[nb.to] === color[n]) {
          return { bipartite: false, parts: null };
        }
      }
    }
  }
  const parts: [string[], string[]] = [[], []];
  for (const n of g.nodes) parts[color[n] ?? 0].push(n);
  return { bipartite: true, parts };
}

/** ¿Es completo? Todas las parejas están unidas. */
export function isComplete(g: Graph): boolean {
  const n = g.nodes.length;
  if (n < 2) return true;
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      if (!g.directed && j < i) continue;
      if (!hasEdge(g, g.nodes[i], g.nodes[j])) return false;
    }
  }
  return true;
}

/** ¿Es regular? Todos los vértices tienen el mismo grado. */
export function isRegular(g: Graph): { regular: boolean; k: number } {
  if (g.nodes.length === 0) return { regular: true, k: 0 };
  const ds = g.nodes.map((n) => degree(g, n, "total"));
  return { regular: ds.every((d) => d === ds[0]), k: ds[0] };
}

/** Un paso del camino más corto (Dijkstra). */
export interface DijkstraStep {
  /** Vértice extraído del conjunto de pendientes. */
  node: string;
  /** Distancias conocidas hasta ahora, indexadas por etiqueta. */
  dist: Record<string, number>;
  /** Vértices ya finalizados. */
  settled: string[];
  /** Arista relajada en este paso, si la hubo. */
  relaxed?: { from: string; to: string; key: string };
  message: string;
}

/** Dijkstra desde `start`: distancias y caminos más cortos. */
export function dijkstra(
  g: Graph,
  start: string,
): { dist: Record<string, number>; prev: Record<string, string | null>; steps: DijkstraStep[] } {
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const settled: string[] = [];
  const steps: DijkstraStep[] = [];
  for (const n of g.nodes) {
    dist[n] = Infinity;
    prev[n] = null;
  }
  if (!g.nodes.includes(start)) {
    return { dist, prev, steps };
  }
  dist[start] = 0;
  const pending = new Set(g.nodes);

  steps.push({
    node: start,
    dist: { ...dist },
    settled: [],
    message: `Dijkstra: ${start} empieza a distancia 0 y el resto en infinito.`,
  });

  while (pending.size > 0) {
    // Extremo con menor distancia conocida.
    let current: string | null = null;
    for (const n of pending) {
      if (current === null || dist[n] < dist[current]) current = n;
    }
    if (current === null || dist[current === null ? start : current] === Infinity) {
      break;
    }
    pending.delete(current);
    settled.push(current);

    for (const nb of neighbors(g, current)) {
      if (!pending.has(nb.to)) continue;
      const alt = dist[current] + (g.weighted ? nb.weight : 1);
      if (alt < dist[nb.to]) {
        dist[nb.to] = alt;
        prev[nb.to] = current;
        steps.push({
          node: current,
          dist: { ...dist },
          settled: [...settled],
          relaxed: {
            from: current,
            to: nb.to,
            key: g.directed
              ? `${current}\u0000${nb.to}`
              : [current, nb.to].sort().join("\u0000"),
          },
          message: `Relajamos ${current} → ${nb.to}: nueva distancia ${alt}.`,
        });
      }
    }
    steps.push({
      node: current,
      dist: { ...dist },
      settled: [...settled],
      message: `${current} queda fijo con distancia ${dist[current]}.`,
    });
  }

  return { dist, prev, steps };
}

/** Reconstruye el camino hasta `target` a partir de los predecesores. */
export function shortestPath(
  prev: Record<string, string | null>,
  target: string,
): string[] {
  const path: string[] = [];
  let cur: string | null = target;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur] ?? null;
  }
  return path;
}

/** Orden topológico (solo en un grafo dirigido sin ciclos). */
export function topologicalOrder(g: Graph): string[] | null {
  if (!g.directed || hasCycle(g)) return null;
  const indeg: Record<string, number> = {};
  for (const n of g.nodes) indeg[n] = 0;
  for (const e of g.edges) indeg[e.to] += 1;
  const queue = g.nodes.filter((n) => indeg[n] === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const n = queue.shift()!;
    order.push(n);
    for (const nb of neighbors(g, n)) {
      indeg[nb.to] -= 1;
      if (indeg[nb.to] === 0) queue.push(nb.to);
    }
  }
  return order.length === g.nodes.length ? order : null;
}

/** Matriz de adyacencia (n×n). */
export function adjacencyMatrix(g: Graph): number[][] {
  const idx = new Map(g.nodes.map((n, i) => [n, i]));
  const m = g.nodes.map(() => g.nodes.map(() => 0));
  for (const e of g.edges) {
    const i = idx.get(e.from)!;
    const j = idx.get(e.to)!;
    m[i][j] = g.weighted ? e.weight : 1;
    if (!g.directed && i !== j) m[j][i] = g.weighted ? e.weight : 1;
  }
  return m;
}

/** Lista de adyacencia, en texto, para mostrar. */
export function adjacencyList(g: Graph): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const n of g.nodes) {
    out[n] = neighbors(g, n).map((nb) =>
      g.weighted ? `${nb.to}(${nb.weight})` : nb.to,
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// Disposición (layout) determinista por fuerzas, para dibujar el grafo.
// ---------------------------------------------------------------------------

const LAYOUT_W = 640;
const LAYOUT_H = 460;

/**
 * Coloca los vértices con un modelo de fuerzas (Fruchterman-Reingold)
 * sembrado de forma determinista a partir de las etiquetas: así el dibujo es
 * estable entre renders y reproducible.
 */
export function graphLayout(g: Graph): Record<string, { x: number; y: number }> {
  const n = g.nodes.length;
  const pos: Record<string, { x: number; y: number }> = {};
  if (n === 0) return pos;
  if (n === 1) {
    pos[g.nodes[0]] = { x: LAYOUT_W / 2, y: LAYOUT_H / 2 };
    return pos;
  }

  // Círculo inicial: siembra determinista y sin solapes.
  g.nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const r = Math.min(LAYOUT_W, LAYOUT_H) * 0.4;
    pos[node] = {
      x: LAYOUT_W / 2 + r * Math.cos(angle),
      y: LAYOUT_H / 2 + r * Math.sin(angle),
    };
  });

  const k = Math.sqrt((LAYOUT_W * LAYOUT_H) / n);
  const iterations = 300;
  let temp = LAYOUT_W / 10;
  const cool = temp / (iterations + 1);

  for (let it = 0; it < iterations; it += 1) {
    const disp: Record<string, { x: number; y: number }> = {};
    for (const a of g.nodes) disp[a] = { x: 0, y: 0 };

    // Repulsión entre todos los pares.
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const a = g.nodes[i];
        const b = g.nodes[j];
        let dx = pos[a].x - pos[b].x;
        let dy = pos[a].y - pos[b].y;
        let d = Math.hypot(dx, dy);
        if (d < 0.01) {
          // Separación determinista si coinciden.
          dx = (i - j) * 0.01;
          dy = 0.01;
          d = Math.hypot(dx, dy);
        }
        const f = (k * k) / d;
        const ux = dx / d;
        const uy = dy / d;
        disp[a].x += ux * f;
        disp[a].y += uy * f;
        disp[b].x -= ux * f;
        disp[b].y -= uy * f;
      }
    }

    // Atracción en las aristas.
    for (const e of g.edges) {
      if (e.from === e.to) continue;
      const dx = pos[e.from].x - pos[e.to].x;
      const dy = pos[e.from].y - pos[e.to].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const f = (d * d) / k;
      const ux = dx / d;
      const uy = dy / d;
      disp[e.from].x -= ux * f;
      disp[e.from].y -= uy * f;
      disp[e.to].x += ux * f;
      disp[e.to].y += uy * f;
    }

    for (const a of g.nodes) {
      const d = Math.hypot(disp[a].x, disp[a].y) || 0.01;
      const lim = Math.min(d, temp);
      pos[a].x += (disp[a].x / d) * lim;
      pos[a].y += (disp[a].y / d) * lim;
      // Mantener dentro del lienzo, con margen para el radio del nodo.
      pos[a].x = Math.max(50, Math.min(LAYOUT_W - 50, pos[a].x));
      pos[a].y = Math.max(50, Math.min(LAYOUT_H - 50, pos[a].y));
    }
    temp -= cool;
  }

  return pos;
}

/** Dimensiones del lienzo del layout. */
export const LAYOUT_SIZE = { width: LAYOUT_W, height: LAYOUT_H };

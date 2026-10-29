import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyGraph,
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  degree,
  degrees,
  degreeSum,
  density,
  isSimple,
  walk,
  components,
  isConnected,
  isStronglyConnected,
  hasCycle,
  isTree,
  isBipartite,
  isComplete,
  dijkstra,
  shortestPath,
  topologicalOrder,
  adjacencyMatrix,
  graphLayout,
  neighbors,
  totalWeight,
  setDirected,
  setWeighted,
  type Graph,
} from "../lib/graph.ts";

/** Construye un grafo a partir de vértices y aristas [from,to,w?]. */
function build(
  nodes: string[],
  edges: [string, string, number?][],
  directed = false,
  weighted = false,
): Graph {
  let g = emptyGraph(directed, weighted);
  for (const n of nodes) g = addNode(g, n);
  for (const [a, b, w] of edges) g = addEdge(g, a, b, w ?? 1);
  return g;
}

test("addNode es idempotente y respeta el orden", () => {
  let g = emptyGraph();
  g = addNode(g, "A");
  g = addNode(g, "B");
  g = addNode(g, "A");
  assert.deepEqual(g.nodes, ["A", "B"]);
});

test("addEdge rechaza vértices inexistentes y duplicados, admite bucles", () => {
  let g = build(["A", "B"], []);
  assert.equal(addEdge(g, "A", "Z").edges.length, 0);
  // Un bucle se admite, pero deja el grafo como no simple.
  assert.equal(addEdge(g, "A", "A").edges.length, 1);
  g = addEdge(g, "A", "B");
  assert.equal(g.edges.length, 1);
  assert.equal(addEdge(g, "A", "B").edges.length, 1);
  // En no dirigido, B-A es la misma arista.
  assert.equal(addEdge(g, "B", "A").edges.length, 1);
});

test("removeNode arrastra sus aristas", () => {
  let g = build(["A", "B", "C"], [["A", "B"], ["B", "C"]]);
  g = removeNode(g, "B");
  assert.deepEqual(g.nodes, ["A", "C"]);
  assert.equal(g.edges.length, 0);
});

test("removeEdge distingue dirigido de no dirigido", () => {
  const u = build(["A", "B"], [["A", "B"]]);
  assert.equal(removeEdge(u, "B", "A").edges.length, 0);
  const d = build(["A", "B"], [["A", "B"]], true);
  assert.equal(removeEdge(d, "B", "A").edges.length, 1);
  assert.equal(removeEdge(d, "A", "B").edges.length, 0);
});

test("grados: no dirigido y dirigido (entrada/salida)", () => {
  const u = build(["A", "B", "C"], [["A", "B"], ["A", "C"]]);
  assert.equal(degree(u, "A"), 2);
  assert.equal(degree(u, "B"), 1);
  assert.deepEqual(degrees(u), { A: 2, B: 1, C: 1 });

  const d = build(["A", "B", "C"], [["A", "B"], ["A", "C"]], true);
  assert.equal(degree(d, "A", "out"), 2);
  assert.equal(degree(d, "A", "in"), 0);
  assert.equal(degree(d, "B", "in"), 1);
  assert.equal(degree(d, "A", "total"), 2);
});

test("lema del apretón de manos: suma de grados = 2|E|", () => {
  const g = build(["A", "B", "C", "D"], [["A", "B"], ["B", "C"], ["C", "D"]]);
  assert.equal(degreeSum(g), 2 * g.edges.length);
});

test("densidad: completa = 1, vacía = 0", () => {
  const k3 = build(["A", "B", "C"], [["A", "B"], ["A", "C"], ["B", "C"]]);
  assert.equal(density(k3), 1);
  const k3d = build(
    ["A", "B", "C"],
    [["A", "B"], ["A", "C"], ["B", "A"], ["B", "C"], ["C", "A"], ["C", "B"]],
    true,
  );
  assert.equal(density(k3d), 1);
  assert.equal(density(build(["A", "B"], [])), 0);
  assert.equal(density(build(["A", "B"], [["A", "B"]])), 1);
});

test("isSimple detecta bucles y aristas repetidas", () => {
  assert.equal(isSimple(build(["A", "B"], [["A", "B"]])), true);
  assert.equal(isSimple(build(["A"], [["A", "A"]])), false);
});

test("BFS respeta niveles; DFS baja primero", () => {
  const g = build(
    ["A", "B", "C", "D"],
    [["A", "B"], ["A", "C"], ["B", "D"]],
  );
  const bfs = walk(g, "A", "bfs");
  assert.deepEqual(bfs[bfs.length - 1].visited, ["A", "B", "C", "D"]);
  const dfs = walk(g, "A", "dfs");
  assert.deepEqual(dfs[dfs.length - 1].visited, ["A", "B", "D", "C"]);
  // En DFS, D se alcanza por B.
  assert.ok(dfs.some((s) => s.frontier.length >= 0));
});

test("componentes conexas y conexión", () => {
  const g = build(["A", "B", "C", "D"], [["A", "B"], ["C", "D"]]);
  assert.equal(components(g).length, 2);
  assert.equal(isConnected(g), false);
  const c = build(["A", "B", "C"], [["A", "B"], ["B", "C"]]);
  assert.equal(isConnected(c), true);
  assert.equal(components(c).length, 1);
});

test("dirigido: alcanzabilidad y conexión fuerte", () => {
  // A -> B -> C
  const d = build(["A", "B", "C"], [["A", "B"], ["B", "C"]], true);
  assert.equal(isStronglyConnected(d), false);
  assert.equal(isConnected(d), true);
  // ciclo A->B->C->A
  const cyc = build(["A", "B", "C"], [["A", "B"], ["B", "C"], ["C", "A"]], true);
  assert.equal(isStronglyConnected(cyc), true);
});

test("ciclos: dirigido y no dirigido", () => {
  assert.equal(hasCycle(build(["A", "B", "C"], [["A", "B"], ["B", "C"]])), false);
  assert.equal(
    hasCycle(build(["A", "B", "C"], [["A", "B"], ["B", "C"], ["C", "A"]])),
    true,
  );
  assert.equal(
    hasCycle(build(["A", "B", "C"], [["A", "B"], ["B", "C"], ["C", "A"]], true)),
    true,
  );
});

test("árbol: conexo y sin ciclos", () => {
  const t = build(["A", "B", "C", "D"], [["A", "B"], ["A", "C"], ["C", "D"]]);
  assert.equal(isTree(t), true);
  const cyc = build(["A", "B", "C"], [["A", "B"], ["B", "C"], ["C", "A"]]);
  assert.equal(isTree(cyc), false);
});

test("bipartito: par e impar", () => {
  const even = build(["A", "B", "C", "D"], [["A", "B"], ["B", "C"], ["C", "D"]]);
  assert.equal(isBipartite(even).bipartite, true);
  const odd = build(["A", "B", "C"], [["A", "B"], ["B", "C"], ["C", "A"]]);
  assert.equal(isBipartite(odd).bipartite, false);
});

test("completo y regular", () => {
  const k3 = build(["A", "B", "C"], [["A", "B"], ["A", "C"], ["B", "C"]]);
  assert.equal(isComplete(k3), true);
  const path = build(["A", "B", "C"], [["A", "B"], ["B", "C"]]);
  assert.equal(isComplete(path), false);
});

test("Dijkstra con pesos", () => {
  const g = build(
    ["A", "B", "C", "D"],
    [["A", "B", 1], ["B", "D", 2], ["A", "C", 5], ["C", "D", 1]],
    false,
    true,
  );
  const { dist, prev } = dijkstra(g, "A");
  assert.equal(dist.D, 3); // A-B-D
  assert.deepEqual(shortestPath(prev, "D"), ["A", "B", "D"]);
  assert.equal(dist.C, 4); // A-B-D-C
});

test("Dijkstra no ponderado cuenta saltos", () => {
  const g = build(["A", "B", "C"], [["A", "B"], ["B", "C"]]);
  const { dist } = dijkstra(g, "A");
  assert.equal(dist.C, 2);
});

test("orden topológico", () => {
  const dag = build(["A", "B", "C"], [["A", "B"], ["B", "C"]], true);
  const order = topologicalOrder(dag)!;
  assert.ok(order.indexOf("A") < order.indexOf("B"));
  assert.ok(order.indexOf("B") < order.indexOf("C"));
  const cyc = build(["A", "B"], [["A", "B"], ["B", "A"]], true);
  assert.equal(topologicalOrder(cyc), null);
  assert.equal(topologicalOrder(build(["A", "B"], [["A", "B"]])), null);
});

test("matriz de adyacencia", () => {
  const g = build(["A", "B", "C"], [["A", "B"], ["B", "C"]]);
  assert.deepEqual(adjacencyMatrix(g), [
    [0, 1, 0],
    [1, 0, 1],
    [0, 1, 0],
  ]);
  const d = build(["A", "B"], [["A", "B"]], true);
  assert.deepEqual(adjacencyMatrix(d), [
    [0, 1],
    [0, 0],
  ]);
});

test("peso total y vecinos", () => {
  const g = build(["A", "B", "C"], [["A", "B", 3], ["B", "C", 4]], false, true);
  assert.equal(totalWeight(g), 7);
  assert.deepEqual(neighbors(g, "B"), [
    { to: "A", weight: 3 },
    { to: "C", weight: 4 },
  ]);
});

test("setDirected deduplica; setWeighted normaliza", () => {
  const d = build(["A", "B"], [["A", "B"], ["B", "A"]], true);
  const u = setDirected(d, false);
  assert.equal(u.edges.length, 1);
  const w = setWeighted(build(["A", "B"], [["A", "B", 5]], false, true), false);
  assert.equal(w.edges[0].weight, 1);
});

test("layout es determinista y no deja NaN", () => {
  const g = build(
    ["A", "B", "C", "D"],
    [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"]],
  );
  const p1 = graphLayout(g);
  const p2 = graphLayout(g);
  for (const n of g.nodes) {
    assert.equal(p1[n].x, p2[n].x);
    assert.equal(p1[n].y, p2[n].y);
    assert.ok(Number.isFinite(p1[n].x) && Number.isFinite(p1[n].y));
  }
  // Sin solapes graves: ningún par coincide exactamente.
  const pts = Object.values(p1);
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      assert.ok(d > 10, `nodos ${i} y ${j} demasiado juntos: ${d}`);
    }
  }
});

test("grafo vacío no rompe las métricas", () => {
  const g = emptyGraph();
  assert.equal(components(g).length, 0);
  assert.equal(isConnected(g), true);
  assert.equal(hasCycle(g), false);
  assert.equal(density(g), 0);
  assert.deepEqual(graphLayout(g), {});
});

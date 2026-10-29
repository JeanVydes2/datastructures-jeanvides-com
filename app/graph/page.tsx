"use client";

import { useEffect, useMemo, useState } from "react";
import GraphCanvas, {
  type EdgeStatus,
  type VertexStatus,
} from "@/components/GraphCanvas";
import {
  Button,
  Card,
  CardTitle,
  MetricRow,
  PageHeader,
  SPEED_MS,
  SpeedControl,
  type Speed,
  StatusBar,
  Swatch,
  TextInput,
} from "@/components/ui";
import {
  type Graph,
  type WalkKind,
  adjacencyList,
  adjacencyMatrix,
  addEdge,
  addNode,
  components,
  degree,
  degreeSum,
  degrees,
  density,
  dijkstra,
  edgeKey,
  emptyGraph,
  graphLayout,
  hasCycle,
  isBipartite,
  isComplete,
  isConnected,
  isRegular,
  isSimple,
  isStronglyConnected,
  isTree,
  removeEdge,
  removeNode,
  setDirected,
  setWeighted,
  shortestPath,
  topologicalOrder,
  totalWeight,
  walk,
} from "@/lib/graph";

/** Estado estático del grafo (lo que se dibuja y se calcula). */
type Frame = {
  vertex: Record<string, VertexStatus>;
  edge: Record<string, EdgeStatus>;
  sublabels: Record<string, string>;
  message: string;
  tone: "info" | "success" | "error";
  output?: string;
};

const EMPTY_FRAME: Frame = {
  vertex: {},
  edge: {},
  sublabels: {},
  message: "",
  tone: "info",
};

/** Grafo de ejemplo: ponderado y no dirigido con dos componentes. */
function demoGraph(): Graph {
  let g = emptyGraph(false, true);
  const nodes = ["A", "B", "C", "D", "E", "F"];
  for (const n of nodes) g = addNode(g, n);
  const edges: [string, string, number][] = [
    ["A", "B", 4],
    ["A", "C", 2],
    ["B", "C", 5],
    ["B", "D", 10],
    ["C", "E", 3],
    ["D", "E", 4],
    ["E", "F", 7],
  ];
  for (const [a, b, w] of edges) g = addEdge(g, a, b, w);
  return g;
}

export default function GraphPage() {
  const [graph, setGraph] = useState<Graph>(() => demoGraph());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [weight, setWeight] = useState("");
  const [newNode, setNewNode] = useState("");
  const [startNode, setStartNode] = useState("");
  const [endNode, setEndNode] = useState("");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [frame, setFrame] = useState<Frame>(EMPTY_FRAME);
  const [anim, setAnim] = useState<Frame[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const running = anim !== null;
  const stepMs = SPEED_MS[speed];
  const pos = useMemo(() => graphLayout(graph), [graph]);

  const shown = anim && stepIdx < anim.length ? anim[stepIdx] : frame;

  // Reproduce la animación paso a paso.
  useEffect(() => {
    if (!anim) return;
    if (stepIdx >= anim.length) {
      const last = anim[anim.length - 1];
      setFrame(last);
      setAnim(null);
      setStepIdx(0);
      return;
    }
    setFrame(anim[stepIdx]);
    const t = setTimeout(() => setStepIdx((i) => i + 1), stepMs);
    return () => clearTimeout(t);
  }, [anim, stepIdx, stepMs]);

  const say = (
    message: string,
    tone: "info" | "success" | "error" = "info",
  ) => {
    if (running) return;
    setAnim(null);
    setFrame({ ...EMPTY_FRAME, message, tone });
  };

  // --- Operaciones estructurales ---

  const doAddNode = () => {
    const label = newNode.trim();
    if (running) return;
    if (label === "") {
      say("Escribe la etiqueta del vértice.", "error");
      return;
    }
    if (graph.nodes.includes(label)) {
      say(`El vértice ${label} ya existe.`, "error");
      return;
    }
    setGraph(addNode(graph, label));
    setNewNode("");
    say(`Añadido el vértice ${label}.`, "success");
  };

  const doAddEdge = () => {
    if (running) return;
    const a = from.trim();
    const b = to.trim();
    if (!a || !b) {
      say("Indica origen y destino de la arista.", "error");
      return;
    }
    if (!graph.nodes.includes(a) || !graph.nodes.includes(b)) {
      say(`Ambos vértices deben existir (${graph.nodes.join(", ") || "ninguno"}).`, "error");
      return;
    }
    if (a !== b && graph.edges.some((e) => edgeKey(graph, e) === edgeKey(graph, { from: a, to: b, weight: 1 }))) {
      say(`La arista ${a}–${b} ya existe.`, "error");
      return;
    }
    // El peso solo importa (y se valida) en un grafo ponderado; en uno sin
    // peso cualquier resto del campo no debe bloquear la arista.
    let w = 1;
    if (graph.weighted) {
      w = weight.trim() === "" ? 1 : Number(weight);
      if (!Number.isFinite(w)) {
        say("El peso debe ser un número.", "error");
        return;
      }
    }
    setGraph(addEdge(graph, a, b, w));
    setFrom("");
    setTo("");
    setWeight("");
    say(`Añadida la arista ${a} → ${b}${graph.weighted ? ` (peso ${w})` : ""}.`, "success");
  };

  const doRemoveEdge = () => {
    if (running) return;
    const a = from.trim();
    const b = to.trim();
    if (!a || !b) {
      say("Indica origen y destino de la arista a eliminar.", "error");
      return;
    }
    setGraph(removeEdge(graph, a, b));
    setFrom("");
    setTo("");
    say(`Eliminada la arista ${a} – ${b} si existía.`, "success");
  };

  const doRemoveNode = () => {
    if (running) return;
    const label = newNode.trim();
    if (!label) {
      say("Escribe la etiqueta del vértice a eliminar.", "error");
      return;
    }
    if (!graph.nodes.includes(label)) {
      say(`${label} no está en el grafo.`, "error");
      return;
    }
    setGraph(removeNode(graph, label));
    setNewNode("");
    say(`Eliminado el vértice ${label} y sus aristas.`, "success");
  };

  // --- Recorridos y algoritmos (animados) ---

  const doWalk = (kind: WalkKind) => {
    if (running) return;
    const start = startNode.trim() || graph.nodes[0];
    if (!start || !graph.nodes.includes(start)) {
      say(`Elige un vértice de inicio (${graph.nodes.join(", ") || "el grafo está vacío"}).`, "error");
      return;
    }
    const steps = walk(graph, start, kind);
    setAnim(
      steps.map((s) => {
        const vertex: Record<string, VertexStatus> = {};
        for (const v of s.visited) vertex[v] = "visited";
        for (const v of s.frontier) if (!vertex[v]) vertex[v] = "frontier";
        if (s.visited.length > 0) vertex[s.node] = "active";
        const edge: Record<string, EdgeStatus> = {};
        for (const k of s.usedEdges) edge[k] = "used";
        return {
          vertex,
          edge,
          sublabels: {},
          message: s.message,
          tone: "info" as const,
          output: `visitados: ${s.visited.join(" → ") || "—"}${
            s.frontier.length ? ` · ${kind === "bfs" ? "cola" : "pila"}: ${s.frontier.join(", ")}` : ""
          }`,
        };
      }),
    );
    setStepIdx(0);
  };

  const doDijkstra = () => {
    if (running) return;
    const start = startNode.trim() || graph.nodes[0];
    if (!start || !graph.nodes.includes(start)) {
      say(`Elige un vértice de inicio (${graph.nodes.join(", ") || "el grafo está vacío"}).`, "error");
      return;
    }
    const { steps } = dijkstra(graph, start);
    setAnim(
      steps.map((s) => {
        const vertex: Record<string, VertexStatus> = {};
        for (const v of s.settled) vertex[v] = "settled";
        vertex[s.node] = "active";
        const edge: Record<string, EdgeStatus> = {};
        if (s.relaxed) edge[s.relaxed.key] = "relaxed";
        const sublabels: Record<string, string> = {};
        for (const n of graph.nodes) {
          sublabels[n] = s.dist[n] === Infinity ? "∞" : String(s.dist[n]);
        }
        return {
          vertex,
          edge,
          sublabels,
          message: s.message,
          tone: "info" as const,
          output: `distancias desde ${start}: ${graph.nodes
            .map((n) => `${n}=${s.dist[n] === Infinity ? "∞" : s.dist[n]}`)
            .join(", ")}`,
        };
      }),
    );
    setStepIdx(0);
  };

  const doTopological = () => {
    if (running) return;
    const order = topologicalOrder(graph);
    if (order === null) {
      say(
        graph.directed
          ? "No hay orden topológico: el grafo dirigido tiene un ciclo."
          : "El orden topológico solo tiene sentido en un grafo dirigido sin ciclos.",
        "error",
      );
      return;
    }
    const vertex: Record<string, VertexStatus> = {};
    order.forEach((n, i) => {
      vertex[n] = i === 0 ? "active" : "settled";
    });
    setFrame({
      vertex,
      edge: {},
      sublabels: {},
      message: "Orden topológico: los vértices van de las fuentes a los sumideros.",
      tone: "success",
      output: order.join(" → "),
    });
  };

  const doComponents = () => {
    if (running) return;
    const comps = components(graph);
    const vertex: Record<string, VertexStatus> = {};
    const shades: VertexStatus[] = ["active", "settled", "visited", "path", "frontier"];
    comps.forEach((comp, i) => {
      for (const n of comp) vertex[n] = shades[i % shades.length];
    });
    setFrame({
      vertex,
      edge: {},
      sublabels: {},
      message: `Componentes conexas: ${comps.length}.`,
      tone: "success",
      output: comps.map((c) => `{${c.join(",")}}`).join("  "),
    });
  };

  const doShortestPath = () => {
    if (running) return;
    const start = startNode.trim() || graph.nodes[0];
    const target = endNode.trim();
    if (!start || !graph.nodes.includes(start)) {
      say("Elige un vértice de inicio.", "error");
      return;
    }
    if (!target || !graph.nodes.includes(target)) {
      say(`Escribe el vértice final en el campo «Fin» (${graph.nodes.join(", ") || "el grafo está vacío"}).`, "error");
      return;
    }
    const { dist, prev } = dijkstra(graph, start);
    if (dist[target] === Infinity) {
      say(`No hay camino de ${start} a ${target}.`, "error");
      return;
    }
    const path = shortestPath(prev, target);
    const vertex: Record<string, VertexStatus> = {};
    for (const n of path) vertex[n] = "path";
    vertex[start] = "active";
    const edge: Record<string, EdgeStatus> = {};
    for (let i = 1; i < path.length; i += 1) {
      const k = graph.directed
        ? `${path[i - 1]}\u0000${path[i]}`
        : [path[i - 1], path[i]].sort().join("\u0000");
      edge[k] = "path";
    }
    setFrame({
      vertex,
      edge,
      sublabels: {},
      message: `Camino más corto de ${start} a ${target}: coste ${dist[target]}.`,
      tone: "success",
      output: path.join(" → "),
    });
  };

  const doBipartite = () => {
    if (running) return;
    const { bipartite, parts } = isBipartite(graph);
    if (!bipartite || !parts) {
      setFrame({
        vertex: {},
        edge: {},
        sublabels: {},
        message: "No es bipartito: hay un ciclo de longitud impar.",
        tone: "error",
        output: "",
      });
      return;
    }
    const vertex: Record<string, VertexStatus> = {};
    for (const n of parts[0]) vertex[n] = "active";
    for (const n of parts[1]) vertex[n] = "visited";
    setFrame({
      vertex,
      edge: {},
      sublabels: {},
      message: "Es bipartito: se puede 2-colorear.",
      tone: "success",
      output: `X = {${parts[0].join(",")}}   Y = {${parts[1].join(",")}}`,
    });
  };

  // --- Cambios de tipo y reinicio ---

  const toggleDirected = () => {
    setGraph(setDirected(graph, !graph.directed));
    say(graph.directed ? "Ahora es un grafo no dirigido." : "Ahora es un grafo dirigido.");
  };

  const toggleWeighted = () => {
    setGraph(setWeighted(graph, !graph.weighted));
    say(graph.weighted ? "Ahora es un grafo no ponderado." : "Ahora es un grafo ponderado.");
  };

  const reset = () => {
    if (running) return;
    setGraph(emptyGraph(graph.directed, graph.weighted));
    say("Grafo vacío.", "info");
  };

  const demo = () => {
    if (running) return;
    setGraph(demoGraph());
    say("Grafo de ejemplo cargado.", "info");
  };

  // --- Métricas y matrices ---

  const order = graph.nodes.length;
  const size = graph.edges.length;
  const deg = degrees(graph);
  const bip = isBipartite(graph);
  const reg = isRegular(graph);

  const matrix = useMemo(() => adjacencyMatrix(graph), [graph]);
  const list = useMemo(() => adjacencyList(graph), [graph]);

  const metrics: { label: string; value: string }[] = [
    { label: "Orden (|V|)", value: String(order) },
    { label: "Tamaño (|E|)", value: String(size) },
    { label: "Densidad", value: density(graph).toFixed(3) },
    { label: "Dirigido", value: graph.directed ? "sí" : "no" },
    { label: "Ponderado", value: graph.weighted ? "sí" : "no" },
    { label: "Simple", value: isSimple(graph) ? "sí" : "no" },
    { label: "Suma de grados", value: String(degreeSum(graph)) },
    { label: "Peso total", value: String(totalWeight(graph)) },
    {
      label: graph.directed ? "Conexo (débil)" : "Conexo",
      value: isConnected(graph) ? "sí" : "no",
    },
    ...(graph.directed
      ? [{ label: "Fuerte", value: isStronglyConnected(graph) ? "sí" : "no" }]
      : []),
    { label: "Componentes", value: String(components(graph).length) },
    { label: "Ciclos", value: hasCycle(graph) ? "sí" : "no" },
    { label: "Árbol", value: isTree(graph) ? "sí" : "no" },
    { label: "Bipartito", value: bip.bipartite ? "sí" : "no" },
    { label: "Completo", value: isComplete(graph) ? "sí" : "no" },
    { label: "Regular", value: reg.regular ? `sí (k=${reg.k})` : "no" },
    ...(graph.directed
      ? [
          {
            label: "Orden topológico",
            value: topologicalOrder(graph) ? "sí" : "no (ciclo)",
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Grafos"
        description="Dirigido o no, ponderado o no, con bucles y múltiples aristas. Añade y quita vértices y aristas, recórrelo en anchura y profundidad, calcula caminos más cortos con Dijkstra, orden topológico, componentes y comprobación de bipartito. Debajo, la matriz y la lista de adyacencia y todas las métricas."
      />

      <Card className="mb-6">
        {/* Tipos */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold tracking-[0.2em] uppercase">
            Tipo
          </span>
          <div className="inline-flex border-2 border-black">
            <button
              onClick={toggleDirected}
              disabled={running}
              className="px-3 py-1.5 text-xs font-bold tracking-wider uppercase hover:bg-neutral-200 disabled:opacity-40"
            >
              {graph.directed ? "Dirigido" : "No dirigido"}
            </button>
            <button
              onClick={toggleWeighted}
              disabled={running}
              className="border-l-2 border-black px-3 py-1.5 text-xs font-bold tracking-wider uppercase hover:bg-neutral-200 disabled:opacity-40"
            >
              {graph.weighted ? "Ponderado" : "Sin peso"}
            </button>
          </div>
          <div className="mx-1 hidden h-9 w-px bg-black sm:block" />
          <Button onClick={demo} disabled={running} variant="secondary">
            Ejemplo
          </Button>
          <Button onClick={reset} disabled={running} variant="danger">
            Vaciar
          </Button>
        </div>

        {/* Vértices */}
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-black pt-4">
          <TextInput
            label="Vértice"
            value={newNode}
            onChange={setNewNode}
            onEnter={doAddNode}
            placeholder="G"
            className="w-28"
          />
          <Button onClick={doAddNode} disabled={running}>
            Añadir vértice
          </Button>
          <Button onClick={doRemoveNode} disabled={running} variant="danger">
            Quitar vértice
          </Button>
        </div>

        {/* Aristas */}
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-black pt-4">
          <TextInput
            label="Origen"
            value={from}
            onChange={setFrom}
            placeholder={graph.nodes[0] ?? "A"}
            className="w-24"
          />
          <TextInput
            label="Destino"
            value={to}
            onChange={setTo}
            onEnter={doAddEdge}
            placeholder={graph.nodes[1] ?? "B"}
            className="w-24"
          />
          {graph.weighted ? (
            <TextInput
              label="Peso"
              value={weight}
              onChange={setWeight}
              onEnter={doAddEdge}
              placeholder="1"
              className="w-20"
            />
          ) : null}
          <Button onClick={doAddEdge} disabled={running}>
            Añadir arista
          </Button>
          <Button onClick={doRemoveEdge} disabled={running} variant="danger">
            Quitar arista
          </Button>
        </div>

        {/* Recorridos y algoritmos */}
        <div className="mt-4 border-t border-black pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <TextInput
              label="Inicio"
              value={startNode}
              onChange={setStartNode}
              placeholder={graph.nodes[0] ?? "A"}
              className="w-24"
            />
            <TextInput
              label="Fin"
              value={endNode}
              onChange={setEndNode}
              onEnter={doShortestPath}
              placeholder={graph.nodes[graph.nodes.length - 1] ?? "F"}
              className="w-24"
            />
            <SpeedControl value={speed} onChange={setSpeed} />
            <Button
              onClick={doShortestPath}
              disabled={running}
              variant="secondary"
            >
              Camino más corto
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Button onClick={() => doWalk("bfs")} disabled={running} variant="secondary">
              BFS
            </Button>
            <Button onClick={() => doWalk("dfs")} disabled={running} variant="secondary">
              DFS
            </Button>
            <Button onClick={doDijkstra} disabled={running} variant="secondary">
              Dijkstra
            </Button>
            <Button onClick={doTopological} disabled={running} variant="secondary">
              Topológico
            </Button>
            <Button onClick={doComponents} disabled={running} variant="secondary">
              Componentes
            </Button>
            <Button onClick={doBipartite} disabled={running} variant="secondary">
              Bipartito
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <StatusBar tone={shown.tone}>{shown.message || "…"}</StatusBar>
          <div className="flex min-w-72 flex-col justify-center border-2 border-black bg-white px-4 py-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-black/60 uppercase">
              Resultado
            </span>
            <span className="font-mono text-sm font-bold break-words text-black">
              {shown.output || "—"}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <GraphCanvas
          graph={graph}
          pos={pos}
          vertexStatus={shown.vertex}
          edgeStatus={shown.edge}
          sublabels={shown.sublabels}
        />

        <div className="space-y-6">
          <Card>
            <CardTitle>Métricas</CardTitle>
            <dl className="mt-3 space-y-1.5">
              {metrics.map((m) => (
                <MetricRow key={m.label} label={m.label} value={m.value} />
              ))}
            </dl>
          </Card>

          <Card>
            <CardTitle>Grados</CardTitle>
            <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-xs">
              {graph.nodes.length === 0 ? (
                <span className="text-black/50">sin vértices</span>
              ) : (
                graph.nodes.map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center gap-1 border-2 border-black px-2 py-1"
                  >
                    <span className="font-bold">{n}</span>
                    <span className="text-black/60">
                      {graph.directed ? "↦" : "·"}{deg[n]}
                    </span>
                  </span>
                ))
              )}
            </div>
            {graph.directed && graph.nodes.length > 0 ? (
              <p className="mt-2 text-xs text-black/60">
                En dirigido se muestra el grado de salida; el total de {""}
                {graph.nodes[0]} es {degree(graph, graph.nodes[0], "total")}.
              </p>
            ) : null}
          </Card>

          <Card>
            <CardTitle>Leyenda</CardTitle>
            <ul className="mt-3 space-y-2 text-xs text-black">
              <li>
                <Swatch fill="#ffffff" /> Normal
              </li>
              <li>
                <Swatch fill="#d4d4d4" /> Visitado
              </li>
              <li>
                <Swatch fill="#f5f5f5" /> En la frontera (cola/pila)
              </li>
              <li>
                <Swatch fill="#000000" /> Activo
              </li>
              <li>
                <Swatch fill="#525252" /> En el camino
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Matrices y listas */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Matriz de adyacencia</CardTitle>
          {order === 0 ? (
            <p className="mt-3 text-xs text-black/60">Sin vértices.</p>
          ) : (
            <div className="mt-3 overflow-auto">
              <table className="border-collapse font-mono text-xs">
                <thead>
                  <tr>
                    <th className="border border-black px-2 py-1"></th>
                    {graph.nodes.map((n) => (
                      <th key={n} className="border border-black px-2 py-1">
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={i}>
                      <th className="border border-black px-2 py-1">
                        {graph.nodes[i]}
                      </th>
                      {row.map((v, j) => (
                        <td
                          key={j}
                          className={`border border-black px-2 py-1 text-center ${
                            v !== 0 ? "bg-black font-bold text-white" : ""
                          }`}
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Lista de adyacencia</CardTitle>
          {order === 0 ? (
            <p className="mt-3 text-xs text-black/60">Sin vértices.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 font-mono text-xs">
              {graph.nodes.map((n) => (
                <li key={n} className="border-b border-dotted border-neutral-400 pb-1">
                  <span className="font-bold">{n}</span>
                  <span className="text-black/60">
                    {" "}
                    → {list[n].length ? list[n].join(", ") : "∅"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle>Tipos de grafo y qué se puede comprobar</CardTitle>
        <div className="mt-3 grid gap-3 text-xs leading-relaxed sm:grid-cols-2">
          <p>
            <strong>Dirigido / no dirigido:</strong> una arista tiene sentido
            (o no) según su dirección; el grado se cuenta por entrada, salida o
            total.
          </p>
          <p>
            <strong>Ponderado:</strong> cada arista lleva un peso que usan
            Dijkstra y el camino más corto.
          </p>
          <p>
            <strong>Simple / pseudografo:</strong> admite bucles; se avisa
            cuando el grafo deja de ser simple.
          </p>
          <p>
            <strong>Conexo, componentes:</strong> cuántos grupos hay y si todos
            se alcanzan. En dirigido, la conexión fuerte exige ida y vuelta.
          </p>
          <p>
            <strong>Árbol y ciclos:</strong> un árbol es conexo y sin ciclos.
          </p>
          <p>
            <strong>Bipartito, completo, regular:</strong> 2-coloreable, todas
            las parejas unidas, y todos los grados iguales.
          </p>
        </div>
        <p className="mt-3 text-xs text-black/60">
          Suma de grados = 2·|E| en un grafo no dirigido sin bucles (lema del
          apretón de manos).
        </p>
      </Card>
    </div>
  );
}

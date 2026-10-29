"use client";

import {
  type Graph,
  edgeKey,
  LAYOUT_SIZE,
} from "@/lib/graph";

/** Estado visual de un vértice. */
export type VertexStatus =
  | "default"
  | "visited"
  | "active"
  | "frontier"
  | "settled"
  | "path";

/** Estado visual de una arista. */
export type EdgeStatus = "default" | "used" | "path" | "relaxed";

const V_STYLE: Record<
  VertexStatus,
  { fill: string; stroke: string; text: string; w: number }
> = {
  default: { fill: "#ffffff", stroke: "#000000", text: "#000000", w: 2 },
  visited: { fill: "#d4d4d4", stroke: "#000000", text: "#000000", w: 2 },
  active: { fill: "#000000", stroke: "#000000", text: "#ffffff", w: 3 },
  frontier: { fill: "#f5f5f5", stroke: "#000000", text: "#000000", w: 2.5 },
  settled: { fill: "#a3a3a3", stroke: "#000000", text: "#000000", w: 2.5 },
  path: { fill: "#525252", stroke: "#000000", text: "#ffffff", w: 3 },
};

const E_WIDTH: Record<EdgeStatus, number> = {
  default: 1.5,
  used: 3.5,
  path: 4,
  relaxed: 3,
};

const RADIUS = 20;

interface Props {
  graph: Graph;
  /** Posición de cada vértice. */
  pos: Record<string, { x: number; y: number }>;
  /** Estado de cada vértice. Ausente = "default". */
  vertexStatus?: Record<string, VertexStatus>;
  /** Estado de cada arista, por clave canónica (`edgeKey`). */
  edgeStatus?: Record<string, EdgeStatus>;
  /** Etiqueta extra bajo el vértice (por ejemplo, su distancia). */
  sublabels?: Record<string, string>;
}

/** Dibuja un grafo dirigido o no, ponderado o no, en blanco y negro. */
export default function GraphCanvas({
  graph,
  pos,
  vertexStatus = {},
  edgeStatus = {},
  sublabels = {},
}: Props) {
  const { width, height } = LAYOUT_SIZE;
  const hasSelfLoop = graph.edges.some((e) => e.from === e.to);

  return (
    <div className="overflow-auto border-2 border-black bg-white p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="mx-auto block"
        role="img"
        aria-label={`Grafo ${graph.directed ? "dirigido" : "no dirigido"}, ${
          graph.nodes.length
        } vértices y ${graph.edges.length} aristas${
          hasSelfLoop ? ", con bucles" : ""
        }`}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#000000" />
          </marker>
        </defs>

        {graph.edges.map((e, i) => {
          const key = edgeKey(graph, e);
          const st = edgeStatus[key] ?? "default";
          const a = pos[e.from];
          const b = pos[e.to];
          if (!a || !b) return null;

          // Bucle: un pequeño círculo sobre el vértice.
          if (e.from === e.to) {
            return (
              <g key={`${key}-${i}`}>
                <circle
                  cx={a.x}
                  cy={a.y - RADIUS - 12}
                  r={12}
                  fill="none"
                  stroke="#000000"
                  strokeWidth={E_WIDTH[st]}
                  style={{ transition: "stroke-width 0.3s ease" }}
                />
                <text
                  x={a.x + 18}
                  y={a.y - RADIUS - 18}
                  fontSize={11}
                  fill="#000000"
                >
                  {graph.weighted ? e.weight : ""}
                </text>
              </g>
            );
          }

          // Acortamos la línea para que no pise los nodos (y deje sitio a la flecha).
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const pad = RADIUS + (graph.directed ? 6 : 2);
          const x1 = a.x + ux * pad;
          const y1 = a.y + uy * pad;
          const x2 = b.x - ux * pad;
          const y2 = b.y - uy * pad;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;

          return (
            <g key={`${key}-${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#000000"
                strokeWidth={E_WIDTH[st]}
                strokeLinecap="square"
                markerEnd={graph.directed ? "url(#arrow)" : undefined}
                style={{ transition: "stroke-width 0.3s ease" }}
              />
              {graph.weighted ? (
                <text
                  x={mx + uy * -12}
                  y={my + ux * -12}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="#000000"
                  stroke="#ffffff"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {e.weight}
                </text>
              ) : null}
            </g>
          );
        })}

        {graph.nodes.map((n) => {
          const p = pos[n];
          if (!p) return null;
          const s = V_STYLE[vertexStatus[n] ?? "default"];
          const sub = sublabels[n];
          return (
            <g key={n}>
              <circle
                cx={p.x}
                cy={p.y}
                r={RADIUS}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={s.w}
                style={{
                  transition: "fill 0.3s ease, stroke-width 0.3s ease",
                }}
              />
              <text
                x={p.x}
                y={p.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={13}
                fontWeight={700}
                fill={s.text}
                style={{ transition: "fill 0.3s ease" }}
              >
                {n}
              </text>
              {sub ? (
                <text
                  x={p.x}
                  y={p.y + RADIUS + 13}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="#000000"
                >
                  {sub}
                </text>
              ) : null}
            </g>
          );
        })}

        {graph.nodes.length === 0 ? (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            fontSize={14}
            fill="#000000"
          >
            GRAFO VACÍO
          </text>
        ) : null}
      </svg>
    </div>
  );
}

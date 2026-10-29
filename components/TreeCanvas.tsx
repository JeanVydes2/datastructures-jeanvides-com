"use client";

import type { VisualTree } from "@/lib/types";

/** Estado visual de un nodo dentro del dibujo. */
export type NodeStatus =
  | "default"
  | "visited"
  | "current"
  | "found"
  | "new"
  | "missing"
  | "output"
  | "null";

/** Monocromo: cada estado se distingue por relleno y grosor, no por color. */
const STYLE: Record<
  NodeStatus,
  { fill: string; stroke: string; text: string; w: number }
> = {
  default: { fill: "#ffffff", stroke: "#000000", text: "#000000", w: 2 },
  visited: { fill: "#d4d4d4", stroke: "#000000", text: "#000000", w: 2.5 },
  current: { fill: "#000000", stroke: "#000000", text: "#ffffff", w: 3 },
  found: { fill: "#a3a3a3", stroke: "#000000", text: "#000000", w: 3 },
  new: { fill: "#f5f5f5", stroke: "#000000", text: "#000000", w: 3 },
  missing: { fill: "#525252", stroke: "#000000", text: "#ffffff", w: 3 },
  output: { fill: "#000000", stroke: "#000000", text: "#ffffff", w: 2.5 },
  null: { fill: "#ffffff", stroke: "#000000", text: "#000000", w: 3 },
};

/**
 * Nodo efímero "null": se dibuja en una posición dada, colgando de un padre,
 * mientras se comprueba un hueco, y desaparece cuando el recorrido lo abandona.
 */
export interface GhostNode {
  x: number;
  y: number;
  /** Vértice del que cuelga (para la línea discontinua). */
  from?: { x: number; y: number };
  label?: string;
}

interface Props {
  tree: VisualTree;
  /** Estado de cada nodo, por identificador. Ausente = "default". */
  status?: Record<string, NodeStatus>;
  /** Aristas resaltadas, por clave "from->to". */
  edgeStatus?: Record<string, "default" | "visited">;
  /** Radio de los nodos. */
  radius?: number;
  /** Etiqueta opcional bajo cada nodo (por identificador). */
  sublabels?: Record<string, string>;
  /** Nodos `null` efímeros que se dibujan sólo en el fotograma actual. */
  ghosts?: GhostNode[];
}

/** Dibuja un árbol genérico como SVG, en blanco y negro. */
export default function TreeCanvas({
  tree,
  status = {},
  edgeStatus = {},
  radius = 24,
  sublabels = {},
  ghosts = [],
}: Props) {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));

  // El lienzo debe abarcar los nodos efímeros si sobresalen por los bordes.
  const xs = [
    ...tree.nodes.map((n) => n.x),
    ...ghosts.map((g) => g.x + radius),
  ];
  const ys = [...tree.nodes.map((n) => n.y), ...ghosts.map((g) => g.y + radius)];
  const minX = Math.min(0, ...xs.map((x) => x - radius * 2));
  const shift = minX < 0 ? -minX : 0;
  const width = Math.max(tree.width, ...xs.map((x) => x + radius + shift), 80);
  const height = Math.max(
    tree.height,
    ...ys.map((y) => y + radius + 10),
    80,
  );

  return (
    <div className="overflow-auto border-2 border-black bg-white p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="mx-auto block"
        role="img"
        aria-label={`Árbol con ${tree.nodes.length} nodo(s)`}
      >
        <g transform={shift ? `translate(${shift}, 0)` : undefined}>
          {tree.edges.map((e) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const key = `${e.from}->${e.to}`;
            const hot = edgeStatus[key] === "visited";
            return (
              <line
                key={key}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#000000"
                strokeWidth={hot ? 4 : 1.5}
                strokeLinecap="square"
                style={{ transition: "stroke-width 0.35s ease" }}
              />
            );
          })}

          {/* Nodos efímeros "null": aparecen al comprobar un hueco. */}
          {ghosts.map((g, idx) => (
            <g key={`ghost-${idx}`} className="animate-fade-in">
              {g.from ? (
                <line
                  x1={g.from.x}
                  y1={g.from.y}
                  x2={g.x}
                  y2={g.y}
                  stroke="#000000"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              ) : null}
              <circle
                cx={g.x}
                cy={g.y}
                r={radius * 0.72}
                fill="#ffffff"
                stroke="#000000"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <text
                x={g.x}
                y={g.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={radius * 0.5}
                fontWeight={700}
                fill="#000000"
              >
                {g.label ?? "null"}
              </text>
            </g>
          ))}

          {tree.nodes.map((n) => {
            const s = STYLE[status[n.id] ?? "default"];
            const sub = sublabels[n.id];
            return (
              <g key={n.id}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={radius}
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={s.w}
                  style={{
                    transition: "fill 0.35s ease, stroke-width 0.35s ease",
                  }}
                />
                <text
                  x={n.x}
                  y={n.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={radius * 0.72}
                  fontWeight={700}
                  fill={s.text}
                  style={{ transition: "fill 0.35s ease" }}
                >
                  {n.label}
                </text>
                {sub ? (
                  <text
                    x={n.x}
                    y={n.y + radius + 14}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#000000"
                  >
                    {sub}
                  </text>
                ) : null}
              </g>
            );
          })}

          {tree.nodes.length === 0 && ghosts.length === 0 ? (
            <text
              x={width / 2}
              y={height / 2}
              textAnchor="middle"
              fontSize={14}
              fill="#000000"
            >
              ÁRBOL VACÍO
            </text>
          ) : null}
        </g>
      </svg>
    </div>
  );
}

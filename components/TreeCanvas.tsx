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
  missing: { fill: "#ffffff", stroke: "#000000", text: "#000000", w: 2 },
  output: { fill: "#000000", stroke: "#000000", text: "#ffffff", w: 2.5 },
  null: { fill: "#ffffff", stroke: "#000000", text: "#000000", w: 3 },
};

/** Hueco nulo efímero: cuelga del padre indicado. */
export interface NullHole {
  parentId: string;
  side: "left" | "right";
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
  /**
   * Hueco nulo efímero: se dibuja un nodo "null" colgando del padre indicado
   * mientras se comprueba, y desaparece cuando el recorrido lo abandona.
   */
  nullHole?: NullHole | null;
}

/** Dibuja un árbol genérico como SVG, en blanco y negro. */
export default function TreeCanvas({
  tree,
  status = {},
  edgeStatus = {},
  radius = 24,
  sublabels = {},
  nullHole = null,
}: Props) {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));

  // Posición del nodo "null" efímero, si procede.
  const V_GAP = 92;
  const holeParent = nullHole ? byId.get(nullHole.parentId) : undefined;
  const holePos =
    nullHole && holeParent
      ? {
          x: holeParent.x + (nullHole.side === "left" ? -46 : 46),
          y: holeParent.y + V_GAP,
        }
      : null;

  // El lienzo debe abarcar el nodo efímero si cuelga por debajo.
  const minX = holePos ? Math.min(0, holePos.x - radius) : 0;
  const shift = minX < 0 ? -minX + 10 : 0;
  const width = tree.width + shift + (holePos ? radius : 0);
  const height = holePos
    ? Math.max(tree.height, holePos.y + radius + 20)
    : tree.height;

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

          {/* Nodo efímero "null": aparece al comprobar un hueco y desaparece. */}
          {holePos && nullHole ? (
            <g className="animate-fade-in">
              <line
                x1={holeParent!.x}
                y1={holeParent!.y}
                x2={holePos.x}
                y2={holePos.y}
                stroke="#000000"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <circle
                cx={holePos.x}
                cy={holePos.y}
                r={radius * 0.72}
                fill="#ffffff"
                stroke="#000000"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <text
                x={holePos.x}
                y={holePos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={radius * 0.5}
                fontWeight={700}
                fill="#000000"
              >
                null
              </text>
            </g>
          ) : null}

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

          {tree.nodes.length === 0 && !holePos ? (
            <text
              x={tree.width / 2}
              y={tree.height / 2}
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

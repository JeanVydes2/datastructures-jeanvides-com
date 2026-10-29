import type { BstNode } from "./bst";
import type { VisualEdge, VisualNode, VisualTree } from "./types";

/** Radio de cada nodo en unidades de dibujo. */
export const NODE_RADIUS = 24;
const H_GAP = 68;
const V_GAP = 92;

/**
 * Calcula las coordenadas de cada nodo. La X sigue el índice inorden, de
 * modo que ningún subárbol se solapa con otro; la Y sigue la profundidad.
 * El identificador de cada nodo es el camino desde la raíz: "R", "RL", "RLR".
 */
export function layout(root: BstNode | null): VisualTree {
  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];
  let index = 0;
  let maxDepth = 0;

  const compute = (n: BstNode | null, depth: number, path: string) => {
    if (!n) return;
    compute(n.left, depth + 1, `${path}L`);
    const x = index * H_GAP + H_GAP;
    const y = depth * V_GAP + NODE_RADIUS + 20;
    index += 1;
    maxDepth = Math.max(maxDepth, depth);
    nodes.push({ id: path, label: String(n.value), x, y });
    compute(n.right, depth + 1, `${path}R`);
  };

  compute(root, 0, "R");

  // Aristas por prefijo de id: R -> RL, RLR, RLL, ...
  for (const n of nodes) {
    if (n.id === "R") continue;
    edges.push({ from: n.id.slice(0, -1), to: n.id });
  }

  return {
    nodes,
    edges,
    width: Math.max(index * H_GAP + H_GAP, H_GAP * 2),
    height: (maxDepth + 1) * V_GAP + NODE_RADIUS + 30,
  };
}

/** Identificador del nodo que contiene `value`, o null si no está. */
export function idOf(root: BstNode | null, value: number): string | null {
  let current = root;
  let path = "R";
  while (current) {
    if (value === current.value) return path;
    if (value < current.value) {
      current = current.left;
      path += "L";
    } else {
      current = current.right;
      path += "R";
    }
  }
  return null;
}

/**
 * Identificadores del camino desde la raíz hasta `value`, en orden. Si el
 * valor no existe, devuelve el camino recorrido hasta el hueco nulo.
 */
export function pathIds(root: BstNode | null, value: number): string[] {
  const ids: string[] = [];
  let current = root;
  let path = "R";
  while (current) {
    ids.push(path);
    if (value === current.value) return ids;
    if (value < current.value) {
      current = current.left;
      path += "L";
    } else {
      current = current.right;
      path += "R";
    }
  }
  return ids;
}

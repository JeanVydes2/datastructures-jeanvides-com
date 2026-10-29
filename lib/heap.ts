import type { VisualEdge, VisualNode, VisualTree } from "./types";

/** Una dirección de montículo: el menor o el mayor en la raíz. */
export type HeapKind = "min" | "max";

/** Un montículo binario representado como arreglo, como en la teoría:
 * el hijo izquierdo de i está en 2i+1 y el derecho en 2i+2. */
export interface Heap {
  /** Los valores, en orden de nivel. */
  data: number[];
  /** Si el menor o el mayor queda en la raíz. */
  kind: HeapKind;
}

/** Un fotograma del proceso de inserción o extracción. */
export interface HeapStep {
  /** Estado del arreglo en este instante, para dibujarlo tal cual. */
  snapshot: number[];
  /** Índices resaltados como parte de la ruta. */
  route: number[];
  /** Índices que se están comparando o intercambiando ahora. */
  hot: number[];
  action: "push" | "compare" | "swap" | "done";
  message: string;
}

export interface HeapInsertResult {
  heap: Heap;
  steps: HeapStep[];
}

/** Crea un montículo vacío de la dirección indicada. */
export const emptyHeap = (kind: HeapKind = "min"): Heap => ({ data: [], kind });

/** Compara dos valores según la dirección: negativo si `a` va antes que `b`. */
export function outranks(a: number, b: number, kind: HeapKind): boolean {
  return kind === "min" ? a < b : a > b;
}

/** Índice del padre, o -1 si es la raíz. */
export const parentIndex = (i: number) =>
  i <= 0 ? -1 : Math.floor((i - 1) / 2);
/** Índice del hijo izquierdo. */
export const leftIndex = (i: number) => 2 * i + 1;
/** Índice del hijo derecho. */
export const rightIndex = (i: number) => 2 * i + 2;

/** Índices desde la raíz hasta `i`, en orden. */
function route(i: number): number[] {
  const out: number[] = [];
  let k = i;
  while (k >= 0) {
    out.push(k);
    k = parentIndex(k);
  }
  return out.reverse();
}

/**
 * Inserta un valor al final del arreglo y lo burbujea hacia arriba mientras
 * supere a su padre (menor que él en un min-heap, mayor en un max-heap).
 */
export function heapInsert(heap: Heap, value: number): HeapInsertResult {
  const { kind } = heap;
  const data = [...heap.data];
  const steps: HeapStep[] = [];
  data.push(value);
  let i = data.length - 1;

  steps.push({
    snapshot: [...data],
    route: route(i),
    hot: [i],
    action: "push",
    message: `${value} se coloca al final del arreglo (índice ${i}).`,
  });

  while (i > 0) {
    const p = parentIndex(i);
    steps.push({
      snapshot: [...data],
      route: route(i),
      hot: [i, p],
      action: "compare",
      message: `Comparamos ${data[i]} con su padre ${data[p]} (índice ${p}).`,
    });
    if (!outranks(data[i], data[p], kind)) {
      const rel = kind === "min" ? "≥" : "≤";
      steps.push({
        snapshot: [...data],
        route: route(i),
        hot: [i, p],
        action: "done",
        message: `${data[i]} ${rel} ${data[p]}: se cumple la propiedad de ${kind}-heap, terminamos.`,
      });
      return { heap: { data, kind }, steps };
    }
    [data[p], data[i]] = [data[i], data[p]];
    steps.push({
      snapshot: [...data],
      route: route(p),
      hot: [i, p],
      action: "swap",
      message: `${value} sube: intercambia con ${data[i]} (índice ${i}).`,
    });
    i = p;
  }

  steps.push({
    snapshot: [...data],
    route: [0],
    hot: [0],
    action: "done",
    message: `${data[0]} llegó a la raíz: es el ${kind === "min" ? "mínimo" : "máximo"} del montículo.`,
  });
  return { heap: { data, kind }, steps };
}

/** Extrae la raíz (mínimo o máximo) y hunde el último valor que la ocupa. */
export function heapExtract(heap: Heap): {
  heap: Heap;
  steps: HeapStep[];
  top: number | null;
} {
  const { kind } = heap;
  const data = [...heap.data];
  const steps: HeapStep[] = [];
  if (data.length === 0) {
    steps.push({
      snapshot: [],
      route: [],
      hot: [],
      action: "done",
      message: "El montículo está vacío.",
    });
    return { heap, steps, top: null };
  }

  const top = data[0];
  const last = data.pop()!;
  steps.push({
    snapshot: [...data],
    route: [],
    hot: [],
    action: "done",
    message: `La raíz es el ${kind === "min" ? "mínimo" : "máximo"}: ${top}. La retiramos.`,
  });
  if (data.length === 0) {
    return { heap: { data, kind }, steps, top };
  }

  data[0] = last;
  steps.push({
    snapshot: [...data],
    route: [0],
    hot: [0],
    action: "push",
    message: `El último (${last}) ocupa la raíz y ahora se hunde.`,
  });

  let i = 0;
  for (;;) {
    const l = leftIndex(i);
    const r = rightIndex(i);
    let best = i;
    if (l < data.length && outranks(data[l], data[best], kind)) best = l;
    if (r < data.length && outranks(data[r], data[best], kind)) best = r;
    if (best === i) {
      steps.push({
        snapshot: [...data],
        route: route(i),
        hot: [i],
        action: "done",
        message: `En el índice ${i} ya supera a sus hijos (o no tiene): terminamos.`,
      });
      break;
    }
    steps.push({
      snapshot: [...data],
      route: route(i),
      hot: [i, best],
      action: "compare",
      message: `El ${kind === "min" ? "menor" : "mayor"} de los hijos está en el índice ${best}.`,
    });
    [data[i], data[best]] = [data[best], data[i]];
    steps.push({
      snapshot: [...data],
      route: route(best),
      hot: [i, best],
      action: "swap",
      message: `Intercambiamos para hundir el valor que ya no corresponde.`,
    });
    i = best;
  }

  return { heap: { data, kind }, steps, top };
}

/** Altura del montículo (aristas desde la raíz; vacío = -1). */
export function heapHeight(heap: Heap): number {
  const n = heap.data.length;
  return n === 0 ? -1 : Math.floor(Math.log2(n));
}

/** Hojas: los índices sin hijos. */
export function heapLeaves(heap: Heap): number[] {
  const out: number[] = [];
  for (let i = 0; i < heap.data.length; i += 1) {
    if (leftIndex(i) >= heap.data.length) out.push(i);
  }
  return out;
}

/** Coloca el arreglo por niveles, como un árbol binario completo. */
export function heapLayout(heap: Heap): VisualTree {
  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];
  const hGap = 68;
  const vGap = 92;
  const radius = 24;
  const n = heap.data.length;
  if (n === 0) return { nodes, edges, width: hGap * 2, height: vGap };

  const depthMax = Math.floor(Math.log2(n));
  const span = Math.pow(2, depthMax);
  const width = span * hGap + hGap;

  for (let i = 0; i < n; i += 1) {
    const depth = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, depth) - 1);
    const countAtLevel = Math.pow(2, depth);
    const cell = width / countAtLevel;
    const x = cell * posInLevel + cell / 2;
    const y = depth * vGap + radius + 20;
    nodes.push({ id: String(i), label: String(heap.data[i]), x, y });
    const l = leftIndex(i);
    const r = rightIndex(i);
    if (l < n) edges.push({ from: String(i), to: String(l) });
    if (r < n) edges.push({ from: String(i), to: String(r) });
  }

  return {
    nodes,
    edges,
    width,
    height: (depthMax + 1) * vGap + radius + 30,
  };
}

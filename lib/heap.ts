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

/** Un hijo que no existe (índice fuera del arreglo) que se dibuja como "null". */
export interface HeapHole {
  /** Índice del padre cuyo hijo falta. */
  parentIndex: number;
  /** Lado donde falta el hijo. */
  side: "left" | "right";
}

/** Un fotograma del proceso de inserción o extracción. */
export interface HeapStep {
  /** Estado del arreglo en este instante, para dibujarlo tal cual. */
  snapshot: number[];
  /** Índices resaltados como parte de la ruta. */
  route: number[];
  /** Índices que se están comparando o intercambiando ahora. */
  hot: number[];
  /** Hijos inexistentes que se comprueban en este paso. */
  holes: HeapHole[];
  action:
    | "push"
    | "compare"
    | "swap"
    | "done"
    | "duplicate"
    | "found"
    | "missing";
  message: string;
}

export interface HeapInsertResult {
  heap: Heap;
  steps: HeapStep[];
  inserted: boolean;
}

/** Crea un montículo vacío de la dirección indicada. */
export const emptyHeap = (kind: HeapKind = "min"): Heap => ({ data: [], kind });

/** Compara dos valores según la dirección. */
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

/** Hijos que faltan (índice ≥ longitud) para los nodos indicados. */
function missingChildren(data: number[], indices: number[]): HeapHole[] {
  const out: HeapHole[] = [];
  for (const i of indices) {
    if (i < 0) continue;
    if (leftIndex(i) >= data.length) out.push({ parentIndex: i, side: "left" });
    if (rightIndex(i) >= data.length)
      out.push({ parentIndex: i, side: "right" });
  }
  return out;
}

/**
 * Inserta un valor. Si ya existe, lo recorre comparando uno a uno hasta
 * llegar a su nodo y lo rechaza (un duplicado solo se descubre al llegar a
 * él). Si no existe, lo coloca al final y lo burbujea hacia arriba.
 */
export function heapInsert(heap: Heap, value: number): HeapInsertResult {
  const { kind } = heap;
  const data = [...heap.data];
  const steps: HeapStep[] = [];

  // ¿Ya está? Solo se sabe recorriendo hasta el nodo con ese valor.
  const dupAt = data.indexOf(value);
  if (dupAt !== -1) {
    for (let i = 0; i <= dupAt; i += 1) {
      if (i < dupAt) {
        steps.push({
          snapshot: [...data],
          route: [],
          hot: [i],
          holes: missingChildren(data, [i]),
          action: "compare",
          message: `Comparamos ${value} con el índice ${i} (${data[i]}): no coincide, seguimos.`,
        });
      }
    }
    steps.push({
      snapshot: [...data],
      route: route(dupAt),
      hot: [dupAt],
      holes: missingChildren(data, [dupAt]),
      action: "duplicate",
      message: `El índice ${dupAt} ya vale ${value}: existe, no se inserta un duplicado.`,
    });
    return { heap, steps, inserted: false };
  }

  data.push(value);
  let i = data.length - 1;

  steps.push({
    snapshot: [...data],
    route: route(i),
    hot: [i],
    holes: missingChildren(data, [i]),
    action: "push",
    message: `${value} se coloca al final del arreglo (índice ${i}); es una hoja, sus hijos son null.`,
  });

  while (i > 0) {
    const p = parentIndex(i);
    steps.push({
      snapshot: [...data],
      route: route(i),
      hot: [i, p],
      holes: missingChildren(data, [i]),
      action: "compare",
      message: `Comparamos ${data[i]} con su padre ${data[p]} (índice ${p}).`,
    });
    if (!outranks(data[i], data[p], kind)) {
      const rel = kind === "min" ? "≥" : "≤";
      steps.push({
        snapshot: [...data],
        route: route(i),
        hot: [i, p],
        holes: missingChildren(data, [i]),
        action: "done",
        message: `${data[i]} ${rel} ${data[p]}: se cumple la propiedad de ${kind}-heap, terminamos.`,
      });
      return { heap: { data, kind }, steps, inserted: true };
    }
    [data[p], data[i]] = [data[i], data[p]];
    steps.push({
      snapshot: [...data],
      route: route(p),
      hot: [i, p],
      holes: missingChildren(data, [i]),
      action: "swap",
      message: `${value} sube: intercambia con ${data[i]} (índice ${i}).`,
    });
    i = p;
  }

  steps.push({
    snapshot: [...data],
    route: [0],
    hot: [0],
    holes: missingChildren(data, [0]),
    action: "done",
    message: `${data[0]} llegó a la raíz: es el ${kind === "min" ? "mínimo" : "máximo"} del montículo.`,
  });
  return { heap: { data, kind }, steps, inserted: true };
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
      holes: [],
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
    holes: missingChildren(data, [0]),
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
    holes: missingChildren(data, [0]),
    action: "push",
    message: `El último (${last}) ocupa la raíz y ahora se hunde.`,
  });
  siftDown(data, 0, kind, steps);

  return { heap: { data, kind }, steps, top };
}

/**
 * Hunde el valor del índice `start` mientras supere al mejor de sus hijos.
 * Comparte con `heapRemove` el burbujeo hacia abajo; registra cada paso.
 */
function siftDown(
  data: number[],
  start: number,
  kind: HeapKind,
  steps: HeapStep[],
): void {
  let i = start;
  for (;;) {
    const l = leftIndex(i);
    const r = rightIndex(i);
    let best = i;
    if (l < data.length && outranks(data[l], data[best], kind)) best = l;
    if (r < data.length && outranks(data[r], data[best], kind)) best = r;
    if (best === i) {
      const holes = missingChildren(data, [i]);
      steps.push({
        snapshot: [...data],
        route: route(i),
        hot: [i],
        holes,
        action: "done",
        message: holes.length
          ? `El índice ${i} no tiene ${
              holes.length === 2 ? "hijos" : "ese hijo"
            }: son null, así que terminamos.`
          : `En el índice ${i} ya supera a sus hijos: terminamos.`,
      });
      break;
    }
    steps.push({
      snapshot: [...data],
      route: route(i),
      hot: [i, best],
      holes: missingChildren(data, [i]),
      action: "compare",
      message: `El ${kind === "min" ? "menor" : "mayor"} de los hijos está en el índice ${best}.`,
    });
    [data[i], data[best]] = [data[best], data[i]];
    steps.push({
      snapshot: [...data],
      route: route(best),
      hot: [i, best],
      holes: missingChildren(data, [best]),
      action: "swap",
      message: `Intercambiamos para hundir el valor que ya no corresponde.`,
    });
    i = best;
  }
}

/** Sube el valor del índice `start` mientras supere a su padre. */
function siftUp(
  data: number[],
  start: number,
  kind: HeapKind,
  steps: HeapStep[],
): void {
  let i = start;
  while (i > 0) {
    const p = parentIndex(i);
    steps.push({
      snapshot: [...data],
      route: route(i),
      hot: [i, p],
      holes: missingChildren(data, [i]),
      action: "compare",
      message: `Comparamos ${data[i]} con su padre ${data[p]} (índice ${p}).`,
    });
    if (!outranks(data[i], data[p], kind)) {
      const rel = kind === "min" ? "≥" : "≤";
      steps.push({
        snapshot: [...data],
        route: route(i),
        hot: [i, p],
        holes: missingChildren(data, [i]),
        action: "done",
        message: `${data[i]} ${rel} ${data[p]}: se cumple la propiedad de ${kind}-heap, terminamos.`,
      });
      return;
    }
    [data[p], data[i]] = [data[i], data[p]];
    steps.push({
      snapshot: [...data],
      route: route(p),
      hot: [i, p],
      holes: missingChildren(data, [i]),
      action: "swap",
      message: `El valor sube: intercambia con ${data[i]} (índice ${i}).`,
    });
    i = p;
  }
  steps.push({
    snapshot: [...data],
    route: [0],
    hot: [0],
    holes: missingChildren(data, [0]),
    action: "done",
    message: `${data[0]} llegó a la raíz: el montículo se recompuso.`,
  });
}

/**
 * Elimina el valor `value` del montículo, donde esté. Se retira y su hueco lo
 * ocupa el último elemento, que luego sube o baja hasta reubicarse. Devuelve
 * la traza para verlo.
 */
export function heapRemove(heap: Heap, value: number): {
  heap: Heap;
  steps: HeapStep[];
  removed: boolean;
} {
  const { kind } = heap;
  const data = [...heap.data];
  const steps: HeapStep[] = [];

  const at = data.indexOf(value);
  if (at === -1) {
    steps.push({
      snapshot: [...data],
      route: [],
      hot: [],
      holes: [],
      action: "missing",
      message: `${value} no está en el montículo: no hay nada que eliminar.`,
    });
    return { heap, steps, removed: false };
  }

  if (at === 0) {
    // Es la raíz: equivale a extraer.
    const ex = heapExtract(heap);
    return { heap: ex.heap, steps: ex.steps, removed: true };
  }

  const lastIdx = data.length - 1;
  steps.push({
    snapshot: [...data],
    route: route(at),
    hot: [at],
    holes: missingChildren(data, [at]),
    action: "found",
    message: `${value} está en el índice ${at}: lo retiramos.`,
  });

  if (at === lastIdx) {
    data.pop();
    steps.push({
      snapshot: [...data],
      route: [],
      hot: [],
      holes: [] as HeapHole[],
      action: "done",
      message: `${value} era el último elemento: al quitarlo el arreglo encoge y la propiedad se mantiene.`,
    });
    return { heap: { data, kind }, steps, removed: true };
  }

  const last = data[lastIdx];
  data[at] = last;
  data.pop();
  steps.push({
    snapshot: [...data],
    route: route(at),
    hot: [at],
    holes: missingChildren(data, [at]),
    action: "push",
    message: `El último (${last}) ocupa el hueco del índice ${at} y se reacomoda.`,
  });

  // Se reacomoda subiendo o bajando según convenga.
  const parent = parentIndex(at);
  if (parent >= 0 && outranks(data[at], data[parent], kind)) {
    siftUp(data, at, kind, steps);
  } else {
    siftDown(data, at, kind, steps);
  }

  return { heap: { data, kind }, steps, removed: true };
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

const H_GAP = 68;
const V_GAP = 92;
const RADIUS = 24;

/** Geometría de un montículo completo con `n` nodos (posiciones por índice). */
export function heapGeometry(n: number): {
  width: number;
  height: number;
  radius: number;
  /** Posición del índice `i`, exista o no (sirve para los hijos nulos). */
  pos: (i: number) => { x: number; y: number };
} {
  const depthMax = n === 0 ? 0 : Math.floor(Math.log2(n));
  const span = Math.pow(2, depthMax);
  const width = span * H_GAP + H_GAP;
  const pos = (i: number) => {
    const depth = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, depth) - 1);
    const countAtLevel = Math.pow(2, depth);
    const cell = width / countAtLevel;
    return { x: cell * posInLevel + cell / 2, y: depth * V_GAP + RADIUS + 20 };
  };
  return {
    width,
    height: (depthMax + 1) * V_GAP + RADIUS + 30,
    radius: RADIUS,
    pos,
  };
}

/** Posición del hijo nulo de `parentIndex` en el lado indicado. */
export function heapHolePosition(
  n: number,
  parentIndex0: number,
  side: "left" | "right",
): { x: number; y: number } {
  const childIdx = side === "left" ? leftIndex(parentIndex0) : rightIndex(parentIndex0);
  return heapGeometry(n).pos(childIdx);
}

/** Coloca el arreglo por niveles, como un árbol binario completo. */
export function heapLayout(heap: Heap): VisualTree {
  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];
  const n = heap.data.length;
  const geo = heapGeometry(n);
  if (n === 0) {
    return { nodes, edges, width: H_GAP * 2, height: V_GAP };
  }

  for (let i = 0; i < n; i += 1) {
    const { x, y } = geo.pos(i);
    nodes.push({ id: String(i), label: String(heap.data[i]), x, y });
    const l = leftIndex(i);
    const r = rightIndex(i);
    if (l < n) edges.push({ from: String(i), to: String(l) });
    if (r < n) edges.push({ from: String(i), to: String(r) });
  }

  return { nodes, edges, width: geo.width, height: geo.height };
}

/** Un nodo del árbol binario de búsqueda. */
export interface BstNode {
  value: number;
  left: BstNode | null;
  right: BstNode | null;
}

/** Crea un nodo hoja. */
export function node(value: number): BstNode {
  return { value, left: null, right: null };
}

/**
 * Descripción de un hueco nulo: en qué nodo está y de qué lado. Sirve para
 * dibujar un nodo efímero "null" mientras se comprueba, y hacerlo desaparecer
 * cuando el recorrido sube.
 */
export interface NullHole {
  /** Identificador del nodo padre. */
  parentId: string;
  /** Lado del padre donde está el hueco. */
  side: "left" | "right";
}

/** Un paso del recorrido de inserción, para animar la búsqueda del hueco. */
export interface InsertStep {
  /** Valores de los nodos visitados hasta este punto, en orden. */
  visited: number[];
  /** Nodo que se está comparando ahora mismo (null al llegar a un hueco). */
  at: number | null;
  /** Decisión que se toma en este paso. */
  action: "compare" | "go-left" | "go-right" | "insert" | "duplicate";
  /** Explicación legible del paso. */
  message: string;
  /** Hueco nulo que se comprueba en este paso, si lo hay. */
  nullHole?: NullHole;
}

/** Resultado de insertar un valor. */
export interface InsertResult {
  root: BstNode;
  steps: InsertStep[];
  inserted: boolean;
}

/**
 * Inserta un valor devolviendo un árbol nuevo y la traza de pasos que
 * llevaron hasta el hueco. Un valor repetido no se inserta.
 */
export function insert(root: BstNode | null, value: number): InsertResult {
  const steps: InsertStep[] = [];

  if (root === null) {
    steps.push({
      visited: [],
      at: null,
      action: "insert",
      message: `El árbol está vacío: la raíz es null y ${value} se coloca aquí.`,
    });
    return { root: node(value), steps, inserted: true };
  }

  const visited: number[] = [];
  let current: BstNode = root;
  let currentId = "R";
  // Camino raíz→hueco, para copiar solo esa rama y no mutar el árbol.
  const sides: ("left" | "right")[] = [];

  for (;;) {
    visited.push(current.value);    if (value === current.value) {
      steps.push({
        visited: [...visited],
        at: current.value,
        action: "duplicate",
        message: `${value} ya existe: no se inserta un duplicado.`,
      });
      return { root, steps, inserted: false };
    }
    if (value < current.value) {
      steps.push({
        visited: [...visited],
        at: current.value,
        action: "go-left",
        message: `${value} < ${current.value}: bajamos por la izquierda.`,
      });
      if (current.left === null) {
        steps.push({
          visited: [...visited],
          at: null,
          action: "insert",
          message: `La izquierda de ${current.value} es null: ${value} se coloca en ese hueco.`,
          nullHole: { parentId: currentId, side: "left" },
        });
        sides.push("left");
        break;
      }
      sides.push("left");
      current = current.left;
      currentId += "L";
    } else {
      steps.push({
        visited: [...visited],
        at: current.value,
        action: "go-right",
        message: `${value} > ${current.value}: bajamos por la derecha.`,
      });
      if (current.right === null) {
        steps.push({
          visited: [...visited],
          at: null,
          action: "insert",
          message: `La derecha de ${current.value} es null: ${value} se coloca en ese hueco.`,
          nullHole: { parentId: currentId, side: "right" },
        });
        sides.push("right");
        break;
      }
      sides.push("right");
      current = current.right;
      currentId += "R";
    }
  }

  return {
    root: cloneWithLeaf(root, sides, node(value)),
    steps,
    inserted: true,
  };
}

/** Clona los nodos del camino y coloca `leaf` en el último hueco. */
function cloneWithLeaf(
  root: BstNode,
  sides: ("left" | "right")[],
  leaf: BstNode,
): BstNode {
  const clone = (n: BstNode, depth: number): BstNode => {
    if (depth === sides.length) return n;
    const side = sides[depth];
    const copy: BstNode = { value: n.value, left: n.left, right: n.right };
    if (depth === sides.length - 1) {
      copy[side] = leaf;
    } else {
      const child = n[side];
      if (child) copy[side] = clone(child, depth + 1);
    }
    return copy;
  };
  return clone(root, 0);
}

/** Resultado de buscar un valor. */
export interface SearchResult {
  found: boolean;
  /** Camino recorrido, en valores, desde la raíz hasta donde se detuvo. */
  path: number[];
  /** Mensajes del recorrido, uno por nodo visitado. */
  messages: string[];
  /** Valores por cuyas ramas se bajó y se encontró un hueco nulo. */
  nullAt: { value: number; side: "left" | "right" } | null;
}

/** Busca un valor y devuelve el camino recorrido hasta encontrarlo o agotarlo. */
export function search(root: BstNode | null, value: number): SearchResult {
  const path: number[] = [];
  const messages: string[] = [];
  let current = root;
  let nullAt: SearchResult["nullAt"] = null;
  while (current !== null) {
    path.push(current.value);
    if (value === current.value) {
      messages.push(`${value} == ${current.value}: ¡encontrado!`);
      return { found: true, path, messages, nullAt: null };
    }
    if (value < current.value) {
      messages.push(`${value} < ${current.value}: seguimos por la izquierda.`);
      if (current.left === null) nullAt = { value: current.value, side: "left" };
      current = current.left;
    } else {
      messages.push(`${value} > ${current.value}: seguimos por la derecha.`);
      if (current.right === null)
        nullAt = { value: current.value, side: "right" };
      current = current.right;
    }
  }
  messages.push("Se alcanzó un null: el valor no está en el árbol.");
  return { found: false, path, messages, nullAt };
}

/** Los tres recorridos en profundidad. */
export type TraversalKind = "inorder" | "preorder" | "postorder";

/**
 * Un paso de un recorrido. El recorrido no empieza en el primer nodo que se
 * imprime: baja desde la raíz llamando a la izquierda, comprobando en cada
 * nodo si ese hijo es null, y solo cuando ya no puede bajar más, imprime.
 */
export interface TraversalStep {
  /** Camino desde la raíz hasta el nodo activo (ids "R", "RL", "RLL"...). */
  pathIds: string[];
  /** Valor del nodo activo, o null si el paso comprueba un hueco. */
  value: number | null;
  /** Lo que se ha impreso hasta este paso, en orden. */
  output: number[];
  /** Si este paso imprime `value`. */
  emit: boolean;
  /** Explicación legible del paso. */
  message: string;
  /** Hueco nulo que se comprueba en este paso, si lo hay. */
  nullHole?: NullHole;
}

/** Los valores que produce un recorrido, sin animación. */
export function inorder(root: BstNode | null): number[] {
  const out: number[] = [];
  const walk = (n: BstNode | null) => {
    if (!n) return;
    walk(n.left);
    out.push(n.value);
    walk(n.right);
  };
  walk(root);
  return out;
}

/** Recorrido preorden: raíz, izquierda, derecha. */
export function preorder(root: BstNode | null): number[] {
  const out: number[] = [];
  const walk = (n: BstNode | null) => {
    if (!n) return;
    out.push(n.value);
    walk(n.left);
    walk(n.right);
  };
  walk(root);
  return out;
}

/** Recorrido postorden: izquierda, derecha, raíz. */
export function postorder(root: BstNode | null): number[] {
  const out: number[] = [];
  const walk = (n: BstNode | null) => {
    if (!n) return;
    walk(n.left);
    walk(n.right);
    out.push(n.value);
  };
  walk(root);
  return out;
}

/**
 * Traza un recorrido paso a paso, mostrando el descenso desde la raíz, las
 * comprobaciones de hijos nulos y el momento exacto en que se imprime cada
 * valor. `pathIds` identifica el nodo activo en el dibujo.
 */
export function traversalTrace(
  root: BstNode | null,
  kind: TraversalKind,
): TraversalStep[] {
  const steps: TraversalStep[] = [];
  const out: number[] = [];
  const name =
    kind === "inorder"
      ? "Inorden"
      : kind === "preorder"
        ? "Preorden"
        : "Postorden";

  const push = (
    pathIds: string[],
    value: number | null,
    emit: boolean,
    message: string,
    nullHole?: NullHole,
  ) => {
    steps.push({ pathIds, value, output: [...out], emit, message, nullHole });
  };

  if (root === null) {
    push([], null, false, "El árbol está vacío: no hay nada que recorrer.");
    return steps;
  }

  const walk = (
    n: BstNode | null,
    pathIds: string[],
    from: "root" | "left" | "right",
  ) => {
    if (n === null) {
      const id = pathIds[pathIds.length - 1];
      push(pathIds, null, false, "Se alcanzó un null: esta rama se detiene aquí.", {
        parentId: id,
        side: from === "right" ? "right" : "left",
      });
      return;
    }

    const id = pathIds[pathIds.length - 1];
    push(
      pathIds,
      n.value,
      false,
      from === "root"
        ? `${name}: empezamos en la raíz (${id}), ${n.value}.`
        : `${name}: llegamos a ${n.value} (${id}) llamando a la ${
            from === "left" ? "izquierda" : "derecha"
          }.`,
    );

    if (kind === "preorder") {
      out.push(n.value);
      push(pathIds, n.value, true, `${name}: imprimimos ${n.value} antes de bajar.`);
    }

    // Baja por la izquierda comprobando si el hijo es null.
    if (n.left === null) {
      push(
        pathIds,
        n.value,
        false,
        `${n.value}.izquierda es null: no hay subárbol izquierdo.`,
        { parentId: id, side: "left" },
      );
    } else {
      push(
        pathIds,
        n.value,
        false,
        `${n.value}.izquierda = ${n.left.value}: bajamos por la izquierda.`,
      );
      walk(n.left, [...pathIds, `${id}L`], "left");
    }

    if (kind === "inorder") {
      out.push(n.value);
      push(
        pathIds,
        n.value,
        true,
        `${name}: ya no queda nada a la izquierda, imprimimos ${n.value}.`,
      );
    }

    // Baja por la derecha comprobando si el hijo es null.
    if (n.right === null) {
      push(
        pathIds,
        n.value,
        false,
        `${n.value}.derecha es null: no hay subárbol derecho.`,
        { parentId: id, side: "right" },
      );
    } else {
      push(
        pathIds,
        n.value,
        false,
        `${n.value}.derecha = ${n.right.value}: bajamos por la derecha.`,
      );
      walk(n.right, [...pathIds, `${id}R`], "right");
    }

    if (kind === "postorder") {
      out.push(n.value);
      push(
        pathIds,
        n.value,
        true,
        `${name}: tras recorrer los dos hijos, imprimimos ${n.value}.`,
      );
    }
  };

  walk(root, ["R"], "root");
  return steps;
}

/** Altura: aristas del camino más largo desde la raíz (árbol vacío = -1). */
export function height(root: BstNode | null): number {
  if (!root) return -1;
  return 1 + Math.max(height(root.left), height(root.right));
}

/** Cuenta las hojas: nodos sin hijos. */
export function countLeaves(root: BstNode | null): number {
  if (!root) return 0;
  if (!root.left && !root.right) return 1;
  return countLeaves(root.left) + countLeaves(root.right);
}

/** Cuenta el total de nodos. */
export function countNodes(root: BstNode | null): number {
  if (!root) return 0;
  return 1 + countNodes(root.left) + countNodes(root.right);
}

/** Valores de las hojas, en inorden. */
export function leafValues(root: BstNode | null): number[] {
  const out: number[] = [];
  const walk = (n: BstNode | null) => {
    if (!n) return;
    if (!n.left && !n.right) out.push(n.value);
    walk(n.left);
    walk(n.right);
  };
  walk(root);
  return out;
}

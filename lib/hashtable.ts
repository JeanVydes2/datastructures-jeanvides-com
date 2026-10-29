/**
 * Tabla hash: almacena pares clave-valor, resuelve las colisiones y sabe
 * cuándo crecer. Cubre la casuística de la teoría.
 *
 * Dos formas de resolver una colisión:
 * - **Abierto (open addressing)**: la clave ocupa otra casilla de la misma
 *   tabla, buscando según una secuencia de sondeo (lineal, cuadrático o
 *   doble hash). Todo cabe en un arreglo.
 * - **Cerrado (encadenamiento)**: cada casilla es una lista de entradas.
 *
 * La tabla es inmutable: cada operación devuelve un estado nuevo (o el
 * mismo, si no había nada que cambiar) acompañado de la traza que la anima.
 */

/** Claves y valores: siempre texto, para no depender de un tipo concreto. */
export type HashKey = string;
export type HashValue = string;

/** Una entrada guardada en la tabla. */
export interface Entry {
  key: HashKey;
  value: HashValue;
}

/** Cómo se resuelven las colisiones. */
export type HashMethod = "lineal" | "cuadratico" | "doble" | "encadenamiento";

/** Cómo se calcula la posición inicial. */
export type HashFn = "simple" | "polinomial" | "djb2";

/** El interior de la tabla hash. */
export interface HashTable {
  /** Tamaño del arreglo de casillas (el número de buckets). */
  size: number;
  /** Método de resolución de colisiones. */
  method: HashMethod;
  /** Función hash. */
  hashFn: HashFn;
  /**
   * Casillas. Con encadenamiento, cada posición es una lista; en abierto,
   * cada posición guarda una entrada o nada. Se usa un arreglo de listas en
   * ambos casos para que un mismo tipo sirva a los dos.
   */
  buckets: Entry[][];
  /** Número de entradas guardadas. */
  count: number;
  /** Colisiones acumuladas (cuántas veces una posición ya estaba ocupada). */
  collisions: number;
  /** Sondeos acumulados (cuántas casillas se han mirado de más al insertar). */
  probes: number;
}

/** Crea una tabla vacía. */
export function emptyHashTable(
  size = 7,
  method: HashMethod = "lineal",
  hashFn: HashFn = "simple",
): HashTable {
  return {
    size,
    method,
    hashFn,
    buckets: Array.from({ length: size }, () => [] as Entry[]),
    count: 0,
    collisions: 0,
    probes: 0,
  };
}

/** Aplica la función hash a una clave y devuelve el índice en [0, size). */
export function hash(key: HashKey, size: number, fn: HashFn): number {
  let h = 0;
  if (fn === "simple") {
    // Suma de códigos de carácter (la de los apuntes).
    for (let i = 0; i < key.length; i += 1) h += key.charCodeAt(i);
  } else if (fn === "polinomial") {
    // s[0]·31^(n-1) + … + s[n-1], la clásica de Java.
    for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  } else {
    // djb2: h = h·33 + c.
    h = 5381;
    for (let i = 0; i < key.length; i += 1) h = (h * 33 + key.charCodeAt(i)) | 0;
  }
  return ((h % size) + size) % size;
}

/** Paso del doble hash: un primo menor que el tamaño, para no quedar en 0. */
function secondHash(key: HashKey, size: number): number {
  const h = hash(key, 1000003, "djb2");
  return 1 + (h % Math.max(1, size - 1));
}

/**
 * Secuencia de posiciones a probar, dado el índice inicial.
 *
 * El sondeo cuadrático no garantiza visitar todas las casillas (con tamaño 7,
 * i·i solo da 0, 1, 2 y 4): podría no encontrar un hueco libre aunque lo
 * hubiera. Por eso, tras la secuencia propia del método, se añaden las
 * casillas que falten en orden lineal. Así la secuencia siempre cubre la
 * tabla entera y la inserción no falla donde hay sitio, sin dejar de mostrar
 * el patrón de cada método.
 */
export function probeSequence(
  table: HashTable,
  key: HashKey,
): number[] {
  const { size, method } = table;
  const h1 = hash(key, size, table.hashFn);
  const seq: number[] = [];
  if (method === "encadenamiento") return [h1];
  for (let i = 0; i < size; i += 1) {
    let idx: number;
    if (method === "lineal") {
      idx = (h1 + i) % size;
    } else if (method === "cuadratico") {
      idx = (h1 + i * i) % size;
    } else {
      idx = (h1 + i * secondHash(key, size)) % size;
    }
    if (!seq.includes(idx)) seq.push(idx);
  }
  // Relleno para garantizar que se visitan todas las casillas.
  for (let i = 0; i < size; i += 1) {
    const idx = (h1 + i) % size;
    if (!seq.includes(idx)) seq.push(idx);
  }
  return seq;
}

/** Un paso de una operación, para animarla. */
export interface HashStep {
  /** Clave de la operación. */
  key: HashKey;
  /** Casilla que se está mirando o tocando. */
  index: number;
  /** Índice del sondeo dentro de la secuencia. */
  probe: number;
  /** Estado de la tabla en este instante. */
  buckets: Entry[][];
  action:
    | "hash"
    | "probe"
    | "collision"
    | "place"
    | "found"
    | "missing"
    | "update"
    | "remove"
    | "tombstone"
    | "chain"
    | "done"
    | "rehash";
  /** Explicación legible. */
  message: string;
}

/** Resultado de insertar. */
export interface HashInsertResult {
  table: HashTable;
  steps: HashStep[];
  inserted: boolean;
  updated: boolean;
}

/** Clona las listas de la tabla, para que cada paso guarde una foto propia. */
function snapshot(table: HashTable): Entry[][] {
  return table.buckets.map((list) => list.map((e) => ({ ...e })));
}

/** Busca una entrada exacta en una lista. */
function findInList(list: Entry[], key: HashKey): Entry | undefined {
  return list.find((e) => e.key === key);
}

/**
 * Inserta o actualiza un par. Si la clave ya existe, se actualiza el valor y
 * no se toca el resto de la tabla. Si no, se coloca en la primera casilla
 * libre que indique la secuencia de sondeo.
 */
export function hashInsert(
  table: HashTable,
  key: HashKey,
  value: HashValue,
): HashInsertResult {
  const steps: HashStep[] = [];
  const buckets = table.buckets.map((list) => list.map((e) => ({ ...e })));
  const next: HashTable = { ...table, buckets };
  const h1 = hash(key, table.size, table.hashFn);

  steps.push({
    key,
    index: h1,
    probe: 0,
    buckets: snapshot(next),
    action: "hash",
    message: `h("${key}") = ${h1} con ${table.size} casillas y la función ${table.hashFn}.`,
  });

  // Actualización: la clave ya está.
  if (table.method === "encadenamiento") {
    const list = buckets[h1];
    const existing = findInList(list, key);
    if (existing) {
      existing.value = value;
      steps.push({
        key,
        index: h1,
        probe: 0,
        buckets: snapshot(next),
        action: "update",
        message: `"${key}" ya estaba en la lista de la casilla ${h1}: se actualiza su valor.`,
      });
      return { table: next, steps, inserted: false, updated: true };
    }
    if (list.length > 0) {
      next.collisions += 1;
      steps.push({
        key,
        index: h1,
        probe: 0,
        buckets: snapshot(next),
        action: "collision",
        message: `La casilla ${h1} ya tiene ${list.length} entrada(s): colisión, se añade a la lista.`,
      });
    }
    list.push({ key, value });
    next.count += 1;
    steps.push({
      key,
      index: h1,
      probe: 0,
      buckets: snapshot(next),
      action: "place",
      message: `"${key}" se inserta al final de la lista de la casilla ${h1}.`,
    });
    return { table: next, steps, inserted: true, updated: false };
  }

  // Abierto: se recorre la secuencia de sondeo.
  const seq = probeSequence(table, key);
  for (let i = 0; i < seq.length; i += 1) {
    const idx = seq[i];
    const list = buckets[idx];
    const existing = list.find((e) => e.key === key);
    if (existing) {
      existing.value = value;
      steps.push({
        key,
        index: idx,
        probe: i,
        buckets: snapshot(next),
        action: "update",
        message: `"${key}" estaba en la casilla ${idx}: se actualiza su valor.`,
      });
      return { table: next, steps, inserted: false, updated: true };
    }
    if (list.length === 0) {
      list.push({ key, value });
      next.count += 1;
      next.probes += i;
      steps.push({
        key,
        index: idx,
        probe: i,
        buckets: snapshot(next),
        action: i === 0 ? "place" : "done",
        message:
          i === 0
            ? `La casilla ${idx} está libre: "${key}" se coloca ahí sin colisión.`
            : `Tras ${i} sondeo(s), la casilla ${idx} está libre: "${key}" se coloca ahí.`,
      });
      return { table: next, steps, inserted: true, updated: false };
    }
    // Ocupada por otra clave.
    next.collisions += 1;
    steps.push({
      key,
      index: idx,
      probe: i,
      buckets: snapshot(next),
      action: "collision",
      message: `La casilla ${idx} está ocupada por "${list[0].key}": colisión, se sondea la siguiente.`,
    });
    steps.push({
      key,
      index: idx,
      probe: i,
      buckets: snapshot(next),
      action: "probe",
      message: `Sondeo ${i + 1} para "${key}".`,
    });
  }

  steps.push({
    key,
    index: h1,
    probe: seq.length,
    buckets: snapshot(next),
    action: "missing",
    message: `La tabla está llena: no hay casilla libre para "${key}". Conviene redimensionar.`,
  });
  return { table: next, steps, inserted: false, updated: false };
}

/** Resultado de buscar. */
export interface HashSearchResult {
  found: boolean;
  value: HashValue | null;
  /** Índice donde está (o donde debería estar). */
  index: number;
  steps: HashStep[];
}

/** Busca una clave y devuelve la traza del sondeo. */
export function hashSearch(
  table: HashTable,
  key: HashKey,
): HashSearchResult {
  const steps: HashStep[] = [];
  const h1 = hash(key, table.size, table.hashFn);
  steps.push({
    key,
    index: h1,
    probe: 0,
    buckets: snapshot(table),
    action: "hash",
    message: `h("${key}") = ${h1}.`,
  });

  if (table.method === "encadenamiento") {
    const list = table.buckets[h1];
    steps.push({
      key,
      index: h1,
      probe: 0,
      buckets: snapshot(table),
      action: "chain",
      message: `Se recorre la lista de la casilla ${h1} (${list.length} entrada(s)).`,
    });
    const hit = findInList(list, key);
    if (hit) {
      steps.push({
        key,
        index: h1,
        probe: 0,
        buckets: snapshot(table),
        action: "found",
        message: `"${key}" está en la lista de la casilla ${h1}: valor "${hit.value}".`,
      });
      return { found: true, value: hit.value, index: h1, steps };
    }
    steps.push({
      key,
      index: h1,
      probe: 0,
      buckets: snapshot(table),
      action: "missing",
      message: `"${key}" no está en la lista de la casilla ${h1}.`,
    });
    return { found: false, value: null, index: h1, steps };
  }

  const seq = probeSequence(table, key);
  for (let i = 0; i < seq.length; i += 1) {
    const idx = seq[i];
    const list = table.buckets[idx];
    if (list.length === 0) {
      steps.push({
        key,
        index: idx,
        probe: i,
        buckets: snapshot(table),
        action: "missing",
        message: `La casilla ${idx} está vacía: "${key}" no está en la tabla.`,
      });
      return { found: false, value: null, index: idx, steps };
    }
    if (list[0].key === key) {
      steps.push({
        key,
        index: idx,
        probe: i,
        buckets: snapshot(table),
        action: "found",
        message: `"${key}" está en la casilla ${idx}: valor "${list[0].value}".`,
      });
      return { found: true, value: list[0].value, index: idx, steps };
    }
    steps.push({
      key,
      index: idx,
      probe: i,
      buckets: snapshot(table),
      action: "collision",
      message: `La casilla ${idx} tiene "${list[0].key}", no "${key}": se sigue sondeando.`,
    });
  }

  steps.push({
    key,
    index: h1,
    probe: seq.length,
    buckets: snapshot(table),
    action: "missing",
    message: `Se agotó la secuencia de sondeo: "${key}" no está.`,
  });
  return { found: false, value: null, index: h1, steps };
}

/** Resultado de eliminar. */
export interface HashRemoveResult {
  table: HashTable;
  steps: HashStep[];
  removed: boolean;
}

/**
 * Elimina una clave. En abierto se deja una lápida (una entrada con clave
 * vacía) para no romper las cadenas de sondeo: si se dejara la casilla
 * realmente vacía, una búsqueda posterior se detendría antes de tiempo.
 */
export function hashRemove(table: HashTable, key: HashKey): HashRemoveResult {
  const steps: HashStep[] = [];
  const buckets = table.buckets.map((list) => list.map((e) => ({ ...e })));
  const next: HashTable = { ...table, buckets };
  const h1 = hash(key, table.size, table.hashFn);

  steps.push({
    key,
    index: h1,
    probe: 0,
    buckets: snapshot(next),
    action: "hash",
    message: `h("${key}") = ${h1}.`,
  });

  if (table.method === "encadenamiento") {
    const list = buckets[h1];
    const at = list.findIndex((e) => e.key === key);
    if (at === -1) {
      steps.push({
        key,
        index: h1,
        probe: 0,
        buckets: snapshot(next),
        action: "missing",
        message: `"${key}" no está en la lista de la casilla ${h1}.`,
      });
      return { table: next, steps, removed: false };
    }
    const [gone] = list.splice(at, 1);
    next.count -= 1;
    steps.push({
      key,
      index: h1,
      probe: 0,
      buckets: snapshot(next),
      action: "remove",
      message: `"${gone.key}" se quita de la lista de la casilla ${h1}.`,
    });
    return { table: next, steps, removed: true };
  }

  const seq = probeSequence(table, key);
  for (let i = 0; i < seq.length; i += 1) {
    const idx = seq[i];
    const list = buckets[idx];
    if (list.length === 0) break;
    if (list[0].key === key) {
      list[0] = { key: "", value: "⋈" }; // lápida
      next.count -= 1;
      steps.push({
        key,
        index: idx,
        probe: i,
        buckets: snapshot(next),
        action: "tombstone",
        message: `"${key}" en la casilla ${idx} pasa a lápida: queda libre para insertar, pero una búsqueda no se detiene aquí.`,
      });
      return { table: next, steps, removed: true };
    }
    steps.push({
      key,
      index: idx,
      probe: i,
      buckets: snapshot(next),
      action: "collision",
      message: `La casilla ${idx} tiene "${list[0].key}", no "${key}": se sigue sondeando.`,
    });
  }

  steps.push({
    key,
    index: h1,
    probe: seq.length,
    buckets: snapshot(next),
    action: "missing",
    message: `"${key}" no está en la tabla.`,
  });
  return { table: next, steps, removed: false };
}

/** ¿Está la casilla ocupada por una entrada de verdad (no una lápida)? */
function isLive(list: Entry[]): boolean {
  return list.length > 0 && list[0].key !== "";
}

/** ¿Es una lápida? */
export function isTombstone(list: Entry[]): boolean {
  return list.length > 0 && list[0].key === "";
}

/**
 * Inserta todas las entradas actuales en una tabla del doble de tamaño.
 * El índice depende del tamaño, así que cada clave se recoloca.
 */
export function hashResize(table: HashTable): {
  table: HashTable;
  steps: HashStep[];
} {
  const steps: HashStep[] = [];
  const live = table.buckets.flat().filter((e) => e.key !== "");
  const size = nextPrime(table.size * 2);
  let grown = emptyHashTable(size, table.method, table.hashFn);

  steps.push({
    key: "",
    index: 0,
    probe: 0,
    buckets: grown.buckets.map(() => []),
    action: "rehash",
    message: `La tabla crece de ${table.size} a ${size} casillas: hay que recolocar las ${live.length} entradas.`,
  });

  for (const e of live) {
    grown = hashInsert(grown, e.key, e.value).table;
  }

  steps.push({
    key: "",
    index: 0,
    probe: 0,
    buckets: grown.buckets.map((l) => l.map((x) => ({ ...x }))),
    action: "done",
    message: `Recolocación terminada: ${grown.count} entrada(s) en ${grown.size} casillas.`,
  });
  return { table: grown, steps };
}

/** Siguiente primo ≥ n (los tamaños primos reparten mejor las claves). */
export function nextPrime(n: number): number {
  let candidate = Math.max(2, Math.ceil(n));
  while (!isPrime(candidate)) candidate += 1;
  return candidate;
}

/** ¿Es primo? */
export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i += 1) if (n % i === 0) return false;
  return true;
}

/** Todas las entradas, sin lápidas, en orden de casilla. */
export function entries(table: HashTable): Entry[] {
  return table.buckets.flat().filter((e) => e.key !== "");
}

/** Factor de carga: entradas guardadas entre casillas. */
export function loadFactor(table: HashTable): number {
  return table.size === 0 ? 0 : table.count / table.size;
}

/** Longitud de la cadena más larga (en abierto, 1 si hay algo). */
export function maxChain(table: HashTable): number {
  return table.buckets.reduce((m, l) => Math.max(m, l.length), 0);
}

/** Cuántas casillas están ocupadas por una entrada de verdad. */
export function occupied(table: HashTable): number {
  return table.buckets.filter(isLive).length;
}

/** Cuántas lápidas quedan. */
export function tombstones(table: HashTable): number {
  return table.buckets.filter(isTombstone).length;
}

/**
 * Racimos (clusters) de casillas ocupadas consecutivas. El sondeo lineal los
 * forma y es lo que hace crecer el coste de búsqueda.
 */
export function clusters(table: HashTable): number[][] {
  const result: number[][] = [];
  let current: number[] = [];
  const occupiedAt = table.buckets.map(
    (l) => l.length > 0, // cuenta también lápidas: siguen interrumpiendo
  );
  for (let i = 0; i < table.size; i += 1) {
    if (occupiedAt[i]) {
      current.push(i);
    } else if (current.length > 0) {
      result.push(current);
      current = [];
    }
  }
  if (current.length > 0) result.push(current);
  // Un racimo puede dar la vuelta al final del arreglo.
  if (
    result.length > 1 &&
    occupiedAt[0] &&
    occupiedAt[table.size - 1]
  ) {
    const first = result.shift()!;
    const last = result.pop()!;
    result.unshift([...last, ...first]);
  }
  return result;
}

/**
 * Sondeos medios esperados para una búsqueda con éxito, según el método y el
 * factor de carga (Knuth). Es la predicción teórica de las métricas de arriba.
 */
export function expectedProbes(table: HashTable): number {
  const a = Math.min(0.99, loadFactor(table));
  if (table.method === "encadenamiento") {
    // Encadenamiento con listas sin ordenar.
    return 1 + a / 2;
  }
  if (table.method === "cuadratico" || table.method === "doble") {
    // Aproximación habitual para sondeo abierto no lineal.
    return -Math.log(1 - a) / a;
  }
  // Sondeo lineal.
  return (1 + 1 / (1 - a)) / 2;
}

/** Sondeos realmente medidos por inserción hasta ahora. */
export function measuredProbes(table: HashTable): number {
  return table.count === 0 ? 0 : table.probes / table.count;
}

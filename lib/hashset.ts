/**
 * Un **conjunto** implementado con una tabla hash, y el **diccionario**, que
 * es la misma tabla guardando un valor por clave.
 *
 * El conjunto no es más que una tabla donde el valor no se usa: la pertenencia
 * (`∈`) es una búsqueda, y como en una tabla hash la clave no se duplica,
 * meter dos veces el mismo elemento no lo cuenta dos veces. Eso da la
 * operación `add` en tiempo constante esperado, que es justo lo que un
 * conjunto necesita.
 */

import {
  type Entry,
  type HashStep,
  type HashTable,
  type HashValue,
  emptyHashTable,
  entries,
  hashInsert,
  hashRemove,
  hashSearch,
} from "./hashtable.ts";

/** Un conjunto: una tabla hash cuyas claves son los elementos. */
export interface HashSet {
  table: HashTable;
}

/** El valor que se guarda en cada elemento de un conjunto (no significa nada). */
export const SET_MARK: HashValue = "∈";

/** Crea un conjunto vacío. */
export function emptySet(
  size = 7,
  method: HashTable["method"] = "lineal",
  hashFn: HashTable["hashFn"] = "simple",
): HashSet {
  return { table: emptyHashTable(size, method, hashFn) };
}

/** Los elementos del conjunto, sin orden garantizado (el de las casillas). */
export function setValues(set: HashSet): string[] {
  return entries(set.table).map((e) => e.key);
}

/** ¿Pertenece el elemento al conjunto? */
export function setHas(set: HashSet, value: string): boolean {
  return hashSearch(set.table, value).found;
}

/** Añade un elemento. Si ya estaba, no cambia el cardinal. */
export function setAdd(set: HashSet, value: string): HashSet {
  return { table: hashInsert(set.table, value, SET_MARK).table };
}

/** Quita un elemento, si está. */
export function setRemove(set: HashSet, value: string): HashSet {
  return { table: hashRemove(set.table, value).table };
}

/** Cardinalidad: cuántos elementos hay. */
export function cardinality(set: HashSet): number {
  return set.table.count;
}

/** ¿Está vacío? */
export function isEmptySet(set: HashSet): boolean {
  return set.table.count === 0;
}

/** Construye un conjunto a partir de una lista de elementos. */
export function setFrom(
  values: string[],
  size = 7,
  method: HashTable["method"] = "lineal",
  hashFn: HashTable["hashFn"] = "simple",
): HashSet {
  let s = emptySet(size, method, hashFn);
  for (const v of values) s = setAdd(s, v);
  return s;
}

/**
 * Unión A ∪ B: todos los elementos de A y de B. Se anima insertando los de B
 * en una copia de A (los que ya estén, se actualizan y no cuentan doble).
 */
export function setUnion(
  a: HashSet,
  b: HashSet,
): { result: HashSet; steps: HashStep[] } {
  let table = a.table;
  const steps: HashStep[] = [];
  for (const value of setValues(b)) {
    const r = hashInsert(table, value, SET_MARK);
    table = r.table;
    steps.push(...r.steps);
  }
  return { result: { table }, steps };
}

/** Intersección A ∩ B: los elementos que están en los dos. */
export function setIntersection(a: HashSet, b: HashSet): HashSet {
  const result = emptySet(a.table.size, a.table.method, a.table.hashFn);
  let table = result.table;
  for (const value of setValues(a)) {
    if (setHas(b, value)) table = hashInsert(table, value, SET_MARK).table;
  }
  return { table };
}

/** Diferencia A − B: los de A que no están en B. */
export function setDifference(a: HashSet, b: HashSet): HashSet {
  let table = emptySet(a.table.size, a.table.method, a.table.hashFn).table;
  for (const value of setValues(a)) {
    if (!setHas(b, value)) table = hashInsert(table, value, SET_MARK).table;
  }
  return { table };
}

/** Diferencia simétrica A △ B: los que están en uno solo de los dos. */
export function setSymmetricDifference(a: HashSet, b: HashSet): HashSet {
  const ab = setValues(a).filter((v) => !setHas(b, v));
  const ba = setValues(b).filter((v) => !setHas(a, v));
  return setFrom([...ab, ...ba], a.table.size, a.table.method, a.table.hashFn);
}

/** ¿A ⊆ B? Todo elemento de A está en B. */
export function isSubset(a: HashSet, b: HashSet): boolean {
  return setValues(a).every((v) => setHas(b, v));
}

/** ¿A ⊇ B? */
export function isSuperset(a: HashSet, b: HashSet): boolean {
  return isSubset(b, a);
}

/** ¿No comparten ningún elemento? */
export function isDisjoint(a: HashSet, b: HashSet): boolean {
  return setValues(a).every((v) => !setHas(b, v));
}

/** ¿Tienen exactamente los mismos elementos? */
export function setEquals(a: HashSet, b: HashSet): boolean {
  return a.table.count === b.table.count && isSubset(a, b);
}

/** El conjunto potencia no se genera (crece como 2^n): se avisa y se para. */
export const POWERSET_LIMIT = 16;

/**
 * A partir de una lista de elementos en texto ("a, b, c") devuelve los
 * elementos, sin repetir y sin vacíos. Es lo que leen los campos del UI.
 */
export function parseElements(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const t = raw.trim();
    if (t === "" || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Un diccionario es una tabla hash clave→valor; se aliasa para leerlo claro. */
export type Dictionary = HashTable;

/** Crea un diccionario vacío. */
export function emptyDictionary(
  size = 7,
  method: HashTable["method"] = "lineal",
  hashFn: HashTable["hashFn"] = "simple",
): Dictionary {
  return emptyHashTable(size, method, hashFn);
}

/** Devuelve los pares clave-valor como lista de entradas. */
export function dictEntries(dict: Dictionary): Entry[] {
  return entries(dict);
}

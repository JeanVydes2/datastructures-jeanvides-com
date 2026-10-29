import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardinality,
  emptyDictionary,
  emptySet,
  isEmptySet,
  isDisjoint,
  isSubset,
  isSuperset,
  parseElements,
  setAdd,
  setDifference,
  setEquals,
  setFrom,
  setHas,
  setIntersection,
  setRemove,
  setSymmetricDifference,
  setUnion,
  setValues,
} from "../lib/hashset.ts";
import {
  hashInsert,
  hashRemove,
  hashSearch,
  entries,
  loadFactor,
} from "../lib/hashtable.ts";

test("el conjunto no guarda duplicados", () => {
  let s = emptySet();
  s = setAdd(s, "a");
  s = setAdd(s, "a");
  s = setAdd(s, "b");
  assert.equal(cardinality(s), 2);
  assert.deepEqual(setValues(s).sort(), ["a", "b"]);
});

test("pertenencia y eliminación", () => {
  let s = setFrom(["a", "b", "c"]);
  assert.equal(setHas(s, "a"), true);
  assert.equal(setHas(s, "z"), false);
  s = setRemove(s, "b");
  assert.equal(setHas(s, "b"), false);
  assert.equal(cardinality(s), 2);
  // Quitar lo que no está no cambia nada.
  const before = setValues(s).sort();
  s = setRemove(s, "z");
  assert.deepEqual(setValues(s).sort(), before);
});

test("conjunto vacío", () => {
  const s = emptySet();
  assert.equal(isEmptySet(s), true);
  assert.equal(cardinality(s), 0);
  assert.equal(setHas(s, "a"), false);
  assert.deepEqual(setValues(s), []);
});

test("unión: todos los elementos, sin repetir", () => {
  const a = setFrom(["a", "b"]);
  const b = setFrom(["b", "c", "d"]);
  const { result } = setUnion(a, b);
  assert.deepEqual(setValues(result).sort(), ["a", "b", "c", "d"]);
  assert.equal(cardinality(result), 4);
  // La unión con el vacío es el mismo.
  assert.deepEqual(setValues(setUnion(a, emptySet()).result).sort(), ["a", "b"]);
});

test("la unión es conmutativa y absorbe", () => {
  const a = setFrom(["x", "y"]);
  const b = setFrom(["y", "z"]);
  const ab = setValues(setUnion(a, b).result).sort();
  const ba = setValues(setUnion(b, a).result).sort();
  assert.deepEqual(ab, ba);
  // A ∪ A = A
  assert.deepEqual(setValues(setUnion(a, a).result).sort(), ["x", "y"]);
});

test("intersección", () => {
  const a = setFrom(["a", "b", "c"]);
  const b = setFrom(["b", "c", "d"]);
  assert.deepEqual(setValues(setIntersection(a, b)).sort(), ["b", "c"]);
  assert.equal(cardinality(setIntersection(a, setFrom(["z"]))), 0);
  // A ∩ A = A
  assert.deepEqual(setValues(setIntersection(a, a)).sort(), ["a", "b", "c"]);
});

test("diferencia y diferencia simétrica", () => {
  const a = setFrom(["a", "b", "c"]);
  const b = setFrom(["b", "c", "d"]);
  assert.deepEqual(setValues(setDifference(a, b)).sort(), ["a"]);
  assert.deepEqual(setValues(setSymmetricDifference(a, b)).sort(), ["a", "d"]);
  // A − A = ∅, A △ A = ∅
  assert.equal(cardinality(setDifference(a, a)), 0);
  assert.equal(cardinality(setSymmetricDifference(a, a)), 0);
});

test("subconjunto, superconjunto y disjuntos", () => {
  const a = setFrom(["a", "b"]);
  const b = setFrom(["a", "b", "c"]);
  assert.equal(isSubset(a, b), true);
  assert.equal(isSubset(b, a), false);
  assert.equal(isSuperset(b, a), true);
  assert.equal(isSubset(emptySet(), b), true, "el vacío es subconjunto de todo");
  assert.equal(isDisjoint(setFrom(["a"]), setFrom(["b"])), true);
  assert.equal(isDisjoint(setFrom(["a"]), setFrom(["a"])), false);
});

test("igualdad de conjuntos no depende del orden ni del camino", () => {
  const a = setFrom(["a", "b", "c"]);
  const b = setFrom(["c", "a", "b"]);
  assert.equal(setEquals(a, b), true);
  const c = setFrom(["a", "b"]);
  assert.equal(setEquals(a, c), false);
});

test("las leyes de De Morgan se cumplen", () => {
  // (A ∪ B)ᶜ = Aᶜ ∩ Bᶜ  — con un universo que ya conocemos.
  const a = setFrom(["1", "2", "3"]);
  const b = setFrom(["3", "4"]);
  const universe = setFrom(["1", "2", "3", "4", "5"]);
  const union = setUnion(a, b).result;
  const left = setDifference(universe, union);
  const right = setIntersection(
    setDifference(universe, a),
    setDifference(universe, b),
  );
  assert.equal(setEquals(left, right), true);
});

test("un conjunto grande con todos los métodos cuadra", () => {
  for (const method of ["lineal", "cuadratico", "doble", "encadenamiento"] as const) {
    let s = emptySet(11, method, "djb2");
    const model = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const v = `e${i % 25}`;
      if (i % 7 === 5 && model.size > 1) {
        const victim = [...model][0];
        s = setRemove(s, victim);
        model.delete(victim);
      } else {
        s = setAdd(s, v);
        model.add(v);
      }
      if (method !== "encadenamiento" && loadFactor(s.table) > 0.7) {
        // Crecer como haría la aplicación.
        const bigger = emptySet(
          s.table.size * 2 + 1,
          method,
          "djb2",
        );
        // Reinsertamos los elementos en la tabla mayor.
        let t = bigger.table;
        for (const v of setValues(s)) t = hashInsert(t, v, "∈").table;
        s = { table: t };
      }
    }
    assert.equal(cardinality(s), model.size, `${method}: cardinalidad`);
    for (const v of model) assert.equal(setHas(s, v), true, `${method}: falta ${v}`);
    assert.deepEqual(setValues(s).sort(), [...model].sort(), `${method}`);
  }
});

test("parseElements limpia, separa y quita repetidos", () => {
  assert.deepEqual(parseElements("a, b, c"), ["a", "b", "c"]);
  assert.deepEqual(parseElements("a a b"), ["a", "b"]);
  assert.deepEqual(parseElements(" a ; b ,, c "), ["a", "b", "c"]);
  assert.deepEqual(parseElements(""), []);
  assert.deepEqual(parseElements("   "), []);
});

test("diccionario: insertar, buscar, actualizar y borrar", () => {
  let d = emptyDictionary(7, "lineal", "simple");
  d = hashInsert(d, "nombre", "Ana").table;
  d = hashInsert(d, "edad", "34").table;
  assert.equal(hashSearch(d, "nombre").value, "Ana");
  assert.equal(hashSearch(d, "edad").value, "34");
  // Actualizar.
  d = hashInsert(d, "edad", "35").table;
  assert.equal(hashSearch(d, "edad").value, "35");
  assert.equal(d.count, 2);
  // Borrar.
  d = hashRemove(d, "nombre").table;
  assert.equal(hashSearch(d, "nombre").found, false);
  assert.equal(d.count, 1);
  assert.deepEqual(entries(d).map((e) => e.key), ["edad"]);
});

test("diccionario con claves que colisionan mantiene todos los pares", () => {
  let d = emptyDictionary(7, "lineal", "simple");
  // "ab" y "ba" colisionan con la función suma.
  d = hashInsert(d, "ab", "1").table;
  d = hashInsert(d, "ba", "2").table;
  d = hashInsert(d, "aa", "3").table;
  assert.equal(d.count, 3);
  assert.equal(hashSearch(d, "ab").value, "1");
  assert.equal(hashSearch(d, "ba").value, "2");
  assert.equal(hashSearch(d, "aa").value, "3");
});

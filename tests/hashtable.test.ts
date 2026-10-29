import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyHashTable,
  hash,
  hashInsert,
  hashSearch,
  hashRemove,
  hashResize,
  probeSequence,
  entries,
  loadFactor,
  occupied,
  tombstones,
  clusters,
  nextPrime,
  isPrime,
  expectedProbes,
  measuredProbes,
  type HashMethod,
  type HashFn,
} from "../lib/hashtable.ts";

const METHODS: HashMethod[] = ["lineal", "cuadratico", "doble", "encadenamiento"];
const FNS: HashFn[] = ["simple", "polinomial", "djb2"];

test("la función hash siempre cae dentro de la tabla", () => {
  for (const fn of FNS) {
    for (const key of ["", "a", "clave", "zzzzzzzzzz", "ñandú", "12345"]) {
      for (const size of [1, 2, 7, 13]) {
        const h = hash(key, size, fn);
        assert.ok(h >= 0 && h < size, `h(${key})=${h} fuera de [0,${size})`);
      }
    }
  }
});

test("la misma clave da siempre el mismo índice (determinista)", () => {
  for (const fn of FNS) {
    assert.equal(hash("hola", 11, fn), hash("hola", 11, fn));
  }
});

test("la función simple junta claves que la polinomial separa", () => {
  // "ab" y "ba" suman el mismo código con la función simple, así que chocan;
  // con la polinomial el orden de los caracteres importa y se separan.
  assert.equal(hash("ab", 97, "simple"), hash("ba", 97, "simple"));
  assert.notEqual(hash("ab", 97, "polinomial"), hash("ba", 97, "polinomial"));
  // La suma no distingue el orden; la polinomial sí.
  assert.equal(hash("ab", 11, "simple"), hash("ba", 11, "simple"));
});

test("insertar y buscar en los cuatro métodos", () => {
  for (const method of METHODS) {
    for (const fn of FNS) {
      let t = emptyHashTable(7, method, fn);
      t = hashInsert(t, "a", "1").table;
      t = hashInsert(t, "b", "2").table;
      t = hashInsert(t, "c", "3").table;
      assert.equal(t.count, 3, `${method}/${fn}`);
      assert.equal(hashSearch(t, "a").value, "1");
      assert.equal(hashSearch(t, "b").value, "2");
      assert.equal(hashSearch(t, "c").value, "3");
      assert.equal(hashSearch(t, "z").found, false);
    }
  }
});

test("actualizar una clave no aumenta el conteo", () => {
  for (const method of METHODS) {
    let t = emptyHashTable(7, method);
    const r1 = hashInsert(t, "a", "1");
    assert.equal(r1.inserted, true);
    assert.equal(r1.updated, false);
    t = r1.table;
    const r2 = hashInsert(t, "a", "9");
    assert.equal(r2.inserted, false);
    assert.equal(r2.updated, true);
    assert.equal(r2.table.count, 1);
    assert.equal(hashSearch(r2.table, "a").value, "9");
  }
});

test("encadenamiento guarda las colisiones en la misma casilla", () => {
  let t = emptyHashTable(1, "encadenamiento");
  t = hashInsert(t, "a", "1").table;
  t = hashInsert(t, "b", "2").table;
  t = hashInsert(t, "c", "3").table;
  assert.equal(t.buckets[0].length, 3);
  assert.equal(t.collisions, 2);
  assert.equal(hashSearch(t, "b").value, "2");
  assert.equal(hashSearch(t, "z").found, false);
});

test("abierto: el sondeo lineal coloca en la casilla siguiente", () => {
  // Con tamaño 3, "a" y "d" (misma suma 97+? no) -> forzamos colisión con claves
  // que la función simple junta: "ab" y "ba" suman lo mismo.
  let t = emptyHashTable(7, "lineal", "simple");
  const h = hash("ab", 7, "simple");
  assert.equal(hash("ba", 7, "simple"), h, "deben colisionar");
  t = hashInsert(t, "ab", "1").table;
  const r = hashInsert(t, "ba", "2");
  t = r.table;
  assert.equal(r.table.collisions >= 1, true);
  const idxA = t.buckets.findIndex((l) => l[0]?.key === "ab");
  const idxB = t.buckets.findIndex((l) => l[0]?.key === "ba");
  assert.equal(idxB, (idxA + 1) % 7, "la colisión va a la casilla siguiente");
});

test("la secuencia de sondeo cubre la tabla sin repetir", () => {
  for (const method of ["lineal", "cuadratico", "doble"] as HashMethod[]) {
    for (const size of [7, 11, 13, 16]) {
      const t = emptyHashTable(size, method);
      const seq = probeSequence(t, "clave");
      assert.equal(seq.length, size, `${method}/${size}: debería cubrir la tabla`);
      assert.equal(new Set(seq).size, size, `${method}/${size}: sin repetir`);
      assert.ok(seq.every((i) => i >= 0 && i < size));
      // La primera casilla es la del hash.
      assert.equal(seq[0], hash("clave", size, t.hashFn));
    }
  }
});

test("el sondeo cuadrático encuentra hueco aunque no cubra la tabla", () => {
  // Con tamaño 7, i·i solo alcanza 4 casillas; el relleno evita que la
  // inserción falle donde hay sitio.
  let t = emptyHashTable(7, "cuadratico", "simple");
  const keys = ["ab", "ba", "aa", "bb", "cc", "dd"];
  for (const k of keys) {
    const r = hashInsert(t, k, "x");
    t = r.table;
    assert.equal(r.inserted, true, `debería insertar ${k}`);
  }
  assert.equal(t.count, keys.length);
  for (const k of keys) assert.equal(hashSearch(t, k).found, true, k);
});

test("búsqueda: encuentra tras colisiones y falla tras un hueco", () => {
  let t = emptyHashTable(7, "lineal", "simple");
  t = hashInsert(t, "ab", "1").table;
  t = hashInsert(t, "ba", "2").table;
  assert.equal(hashSearch(t, "ba").value, "2");
  assert.equal(hashSearch(t, "zz").found, false);
});

test("eliminar deja lápida en abierto y no rompe la búsqueda", () => {
  let t = emptyHashTable(7, "lineal", "simple");
  const h = hash("ab", 7, "simple");
  t = hashInsert(t, "ab", "1").table;
  t = hashInsert(t, "ba", "2").table; // casilla h+1
  const r = hashRemove(t, "ab");
  t = r.table;
  assert.equal(r.removed, true);
  assert.equal(t.count, 1);
  assert.equal(tombstones(t), 1);
  // "ba" sigue siendo alcanzable: la lápida no corta el sondeo.
  assert.equal(hashSearch(t, "ba").value, "2");
  assert.equal(hashSearch(t, "ab").found, false);
  // y la lápida se puede reutilizar al insertar.
  const r2 = hashInsert(t, "ab", "3");
  assert.equal(hashSearch(r2.table, "ab").value, "3");
  // La casilla inicial sigue siendo la del hash.
  assert.equal(hash("ab", 7, "simple"), h);
});

test("eliminar algo que no está, no cambia nada", () => {
  for (const method of METHODS) {
    let t = emptyHashTable(7, method);
    t = hashInsert(t, "a", "1").table;
    const r = hashRemove(t, "z");
    assert.equal(r.removed, false, method);
    assert.equal(r.table.count, 1);
    assert.equal(hashSearch(r.table, "a").value, "1");
  }
});

test("eliminar en encadenamiento quita de la lista", () => {
  let t = emptyHashTable(7, "encadenamiento");
  t = hashInsert(t, "a", "1").table;
  t = hashInsert(t, "b", "2").table;
  const r = hashRemove(t, "a");
  assert.equal(r.removed, true);
  assert.equal(r.table.count, 1);
  assert.equal(hashSearch(r.table, "b").value, "2");
  assert.equal(hashSearch(r.table, "a").found, false);
});

test("resize recoloca todas las claves y crece a un primo", () => {
  let t = emptyHashTable(7, "lineal", "simple");
  for (let i = 0; i < 7; i += 1) t = hashInsert(t, `k${i}`, String(i)).table;
  assert.equal(t.count, 7);
  const { table: grown } = hashResize(t);
  assert.ok(grown.size > t.size, "debe crecer");
  assert.equal(isPrime(grown.size), true, "el nuevo tamaño es primo");
  assert.equal(grown.count, 7);
  // Ninguna entrada se pierde y todas se encuentran.
  for (let i = 0; i < 7; i += 1) {
    assert.equal(hashSearch(grown, `k${i}`).value, String(i));
  }
});

test("resize descarta las lápidas", () => {
  let t = emptyHashTable(7, "lineal", "simple");
  t = hashInsert(t, "a", "1").table;
  t = hashInsert(t, "b", "2").table;
  t = hashRemove(t, "a").table;
  assert.equal(tombstones(t), 1);
  const { table: grown } = hashResize(t);
  assert.equal(tombstones(grown), 0);
  assert.equal(grown.count, 1);
  assert.equal(hashSearch(grown, "b").value, "2");
});

test("métricas: factor de carga, ocupadas y clusters", () => {
  let t = emptyHashTable(8, "lineal", "simple");
  assert.equal(loadFactor(t), 0);
  assert.equal(occupied(t), 0);
  t = hashInsert(t, "a", "1").table;
  t = hashInsert(t, "b", "2").table;
  t = hashInsert(t, "c", "3").table;
  assert.equal(t.count, 3);
  assert.equal(loadFactor(t), 3 / 8);
  const occ = occupied(t);
  assert.equal(occ, 3);
  // Los racimos suman las casillas ocupadas.
  const cl = clusters(t);
  const total = cl.reduce((s, c) => s + c.length, 0);
  assert.equal(total, occ);
  for (const c of cl) {
    // Cada racimo es contiguo...
    for (let i = 1; i < c.length; i += 1) {
      assert.equal(c[i], (c[i - 1] + 1) % t.size);
    }
  }
});

test("el sondeo lineal forma racimos que el doble hash evita", () => {
  // Insertamos claves que la función simple junta a propósito.
  const keys = ["ab", "ba", "aa", "bb", "ac", "ca"];
  let lin = emptyHashTable(11, "lineal", "simple");
  let dbl = emptyHashTable(11, "doble", "simple");
  for (const k of keys) {
    lin = hashInsert(lin, k, "x").table;
    dbl = hashInsert(dbl, k, "x").table;
  }
  const maxLin = Math.max(...clusters(lin).map((c) => c.length));
  const maxDbl = Math.max(...clusters(dbl).map((c) => c.length));
  assert.ok(
    maxLin >= maxDbl,
    `lineal (${maxLin}) no debería ser mejor que doble (${maxDbl})`,
  );
  assert.equal(lin.count, keys.length);
  assert.equal(dbl.count, keys.length);
});

test("primos: nextPrime e isPrime", () => {
  assert.equal(isPrime(1), false);
  assert.equal(isPrime(2), true);
  assert.equal(isPrime(4), false);
  assert.equal(isPrime(13), true);
  assert.equal(nextPrime(14), 17);
  assert.equal(nextPrime(17), 17);
  assert.equal(nextPrime(2), 2);
});

test("todas las entradas son recuperables tras muchas operaciones", () => {
  for (const method of METHODS) {
    let t = emptyHashTable(11, method, "djb2");
    const model = new Map<string, string>();
    for (let i = 0; i < 40; i += 1) {
      const key = `k${i % 17}`;
      if (i % 5 === 3 && model.size > 0) {
        const victim = [...model.keys()][0];
        const r = hashRemove(t, victim);
        t = r.table;
        if (r.removed) model.delete(victim);
      } else {
        t = hashInsert(t, key, `v${i}`).table;
        model.set(key, `v${i}`);
      }
      // Si se llena en abierto, crecemos (como haría la aplicación).
      if (method !== "encadenamiento" && loadFactor(t) > 0.75) {
        t = hashResize(t).table;
      }
    }
    assert.equal(t.count, model.size, `${method}: el conteo cuadra`);
    for (const [k, v] of model) {
      assert.equal(hashSearch(t, k).value, v, `${method}: falta ${k}`);
    }
    assert.deepEqual(
      entries(t).map((e) => e.key).sort(),
      [...model.keys()].sort(),
      `${method}: las entradas coinciden`,
    );
  }
});

test("la predicción de sondeos crece con el factor de carga", () => {
  const low = emptyHashTable(100, "lineal");
  const high = { ...low, count: 90 };
  assert.ok(expectedProbes(high) > expectedProbes(low));
  // Y en el caso vacío, no hay sondeos medidos.
  assert.equal(measuredProbes(low), 0);
});

test("tabla de tamaño 1 y claves repetidas no rompen nada", () => {
  let t = emptyHashTable(1, "lineal", "simple");
  t = hashInsert(t, "a", "1").table;
  assert.equal(t.count, 1);
  assert.equal(hashSearch(t, "a").value, "1");
  // No cabe otra clave distinta.
  const full = hashInsert(t, "b", "2");
  assert.equal(full.inserted, false);
  assert.equal(full.table.count, 1);
});

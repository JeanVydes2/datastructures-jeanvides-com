"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardTitle,
  MetricRow,
  PageHeader,
  SPEED_MS,
  SpeedControl,
  type Speed,
  StatusBar,
  Swatch,
  TextInput,
} from "@/components/ui";
import {
  type HashFn,
  type HashMethod,
  type HashStep,
  type HashTable,
  emptyHashTable,
  hashInsert,
  hashRemove,
  hashSearch,
  isTombstone,
  probeSequence,
} from "@/lib/hashtable";
import {
  type HashSet,
  cardinality,
  emptySet,
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
  setSymmetricDifference,
  setUnion,
  setValues,
} from "@/lib/hashset";

const METHODS: { key: HashMethod; label: string }[] = [
  { key: "lineal", label: "Lineal" },
  { key: "cuadratico", label: "Cuadrático" },
  { key: "doble", label: "Doble hash" },
  { key: "encadenamiento", label: "Encadenamiento" },
];

const FNS: { key: HashFn; label: string }[] = [
  { key: "simple", label: "Suma" },
  { key: "polinomial", label: "Polinomial" },
  { key: "djb2", label: "djb2" },
];

type Tone = "info" | "success" | "error";

/** Una pestaña: conjuntos (A y B) o diccionario (clave→valor). */
type Tab = "sets" | "dict";

/** Fotograma para dibujar una tabla en un instante de la animación. */
interface Frame {
  buckets: { key: string; value: string }[][];
  size: number;
  hot: number;
  action: string;
  count: number;
}

/** Traduce un paso de la librería a un fotograma. */
function toFrame(step: HashStep, table: HashTable): Frame {
  return {
    buckets: step.buckets.map((l) => l.map((e) => ({ ...e }))),
    size: table.size,
    hot: step.index,
    action: step.action,
    count: step.buckets.flat().filter((e) => e.key !== "").length,
  };
}

export default function SetsPage() {
  const [tab, setTab] = useState<Tab>("sets");
  const [method, setMethod] = useState<HashMethod>("lineal");
  const [hashFn, setHashFn] = useState<HashFn>("simple");
  const [size, setSize] = useState(11);
  const [speed, setSpeed] = useState<Speed>("normal");

  const DEFAULT_A = "manzana, pera, uva";
  const DEFAULT_B = "pera, kiwi, uva, melon";

  // Conjuntos A y B, construidos ya desde su texto inicial.
  const [textA, setTextA] = useState(DEFAULT_A);
  const [textB, setTextB] = useState(DEFAULT_B);
  const [setA, setSetA] = useState<HashSet>(() =>
    setFrom(parseElements(DEFAULT_A), 11, "lineal", "simple"),
  );
  const [setB, setSetB] = useState<HashSet>(() =>
    setFrom(parseElements(DEFAULT_B), 11, "lineal", "simple"),
  );
  const [element, setElement] = useState("");

  // Diccionario.
  const [dict, setDict] = useState<HashTable>(() =>
    emptyHashTable(11, "lineal", "simple"),
  );
  const [dKey, setDKey] = useState("");
  const [dValue, setDValue] = useState("");

  const [message, setMessage] = useState(
    "Dos conjuntos y un diccionario, todos construidos sobre una tabla hash. Escribe los elementos y opera.",
  );
  const [tone, setTone] = useState<Tone>("info");
  const [output, setOutput] = useState("");

  const [anim, setAnim] = useState<Frame[] | null>(null);
  const [animTarget, setAnimTarget] = useState<"A" | "B" | "dict">("A");
  const [stepIdx, setStepIdx] = useState(0);

  const running = anim !== null;
  const stepMs = SPEED_MS[speed];
  const pendingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!anim) return;
    if (stepIdx >= anim.length) {
      setAnim(null);
      setStepIdx(0);
      pendingRef.current?.();
      pendingRef.current = null;
      return;
    }
    const t = setTimeout(() => setStepIdx((i) => i + 1), stepMs);
    return () => clearTimeout(t);
  }, [anim, stepIdx, stepMs]);

  const say = (msg: string, t: Tone = "info", out = "") => {
    if (running) return;
    setAnim(null);
    setMessage(msg);
    setTone(t);
    setOutput(out);
  };

  /** Lanza una animación de pasos sobre el conjunto o el diccionario elegido. */
  const play = (
    target: "A" | "B" | "dict",
    steps: HashStep[],
    apply: () => void,
    msg: string,
    t: Tone,
    out: string,
    tableForSize: HashTable,
  ) => {
    const frames = steps.map((s) => toFrame(s, tableForSize));
    pendingRef.current = apply;
    setAnimTarget(target);
    setAnim(frames);
    setStepIdx(0);
    setMessage(msg);
    setTone(t);
    setOutput(out);
  };

  // --- Conjuntos ---

  const rebuildSets = () => {
    if (running) return;
    const a = build(parseElements(textA));
    const b = build(parseElements(textB));
    setSetA(a);
    setSetB(b);
    say(
      `Conjuntos construidos: A con ${cardinality(a)} elemento(s), B con ${cardinality(b)}.`,
      "success",
    );
  };

  const build = (values: string[]): HashSet => {
    let s = emptySet(size, method, hashFn);
    for (const v of values) s = setAdd(s, v);
    return s;
  };

  const changeMethod = (m: HashMethod) => {
    if (running) return;
    setMethod(m);
    setSetA(build(parseElements(textA)));
    setSetB(build(parseElements(textB)));
    setDict(emptyHashTable(size, m, hashFn));
    say(`Método ${m}: se reconstruyen las estructuras.`);
  };

  const changeFn = (f: HashFn) => {
    if (running) return;
    setHashFn(f);
    setSetA(build(parseElements(textA)));
    setSetB(build(parseElements(textB)));
    setDict(emptyHashTable(size, method, f));
    say(`Función hash ${f}: se reconstruyen las estructuras.`);
  };

  const changeSize = (n: number) => {
    if (!Number.isFinite(n) || n < 1 || running) return;
    setSize(n);
    const rebuild = (values: string[]) => {
      let s = emptySet(n, method, hashFn);
      for (const v of values) s = setAdd(s, v);
      return s;
    };
    setSetA(rebuild(parseElements(textA)));
    setSetB(rebuild(parseElements(textB)));
    setDict(emptyHashTable(n, method, hashFn));
    say(`Tamaño ${n}.`);
  };

  const addElementTo = (which: "A" | "B") => {
    if (running) return;
    const v = element.trim();
    if (!v) {
      say("Escribe un elemento.", "error");
      return;
    }
    const set = which === "A" ? setA : setB;
    const steps = hashInsert(set.table, v, "∈").steps;
    const next = { table: hashInsert(set.table, v, "∈").table };
    play(
      which,
      steps,
      () => {
        setSetA((s) => (which === "A" ? next : s));
        setSetB((s) => (which === "B" ? next : s));
        setTextA((t) =>
          which === "A" ? [...parseElements(t), v].join(", ") : t,
        );
        setTextB((t) =>
          which === "B" ? [...parseElements(t), v].join(", ") : t,
        );
      },
      `Añadido «${v}» a ${which}.`,
      "success",
      `${v} ∈ ${which}`,
      set.table,
    );
    setElement("");
  };

  const searchElement = (which: "A" | "B") => {
    if (running) return;
    const v = element.trim();
    if (!v) {
      say("Escribe un elemento para comprobar pertenencia.", "error");
      return;
    }
    const set = which === "A" ? setA : setB;
    const r = hashSearch(set.table, v);
    play(
      which,
      r.steps,
      () => {},
      r.found ? `«${v}» ∈ ${which}` : `«${v}» ∉ ${which}`,
      r.found ? "success" : "error",
      r.found ? `pertenece a ${which}` : `no pertenece a ${which}`,
      set.table,
    );
  };

  const removeElement = (which: "A" | "B") => {
    if (running) return;
    const v = element.trim();
    if (!v) {
      say("Escribe un elemento para quitar.", "error");
      return;
    }
    const set = which === "A" ? setA : setB;
    const r = hashRemove(set.table, v);
    play(
      which,
      r.steps,
      () => {
        const cleaner = (t: string) =>
          parseElements(t)
            .filter((x) => x !== v)
            .join(", ");
        if (which === "A") {
          setSetA({ table: r.table });
          setTextA(cleaner);
        } else {
          setSetB({ table: r.table });
          setTextB(cleaner);
        }
      },
      r.removed ? `Quitado «${v}» de ${which}.` : `«${v}» no estaba en ${which}.`,
      r.removed ? "success" : "error",
      r.removed ? `quitar` : `nada que quitar`,
      set.table,
    );
    setElement("");
  };

  // Operaciones entre A y B (unión animada; el resto, resultado directo).
  const opUnion = () => {
    if (running) return;
    const { result, steps } = setUnion(setA, setB);
    play(
      "A",
      steps,
      () => setSetA(result),
      "A ∪ B: los elementos de B se insertan en A (los repetidos no cuentan dos veces).",
      "success",
      `A ∪ B = {${setValues(result).sort().join(", ")}}`,
      setA.table,
    );
  };

  const opBinary = (
    name: string,
    fn: (a: HashSet, b: HashSet) => HashSet,
    symbol: string,
  ) => {
    if (running) return;
    const r = fn(setA, setB);
    const vals = setValues(r).sort();
    say(
      `${symbol}: ${vals.length} elemento(s).`,
      "success",
      `${name} = {${vals.join(", ")}}`,
    );
  };

  const opPredicate = (name: string, ok: boolean) => {
    if (running) return;
    say(`${name}: ${ok ? "sí" : "no"}.`, ok ? "success" : "error", ok ? "verdadero" : "falso");
  };

  // --- Diccionario ---

  const dictInsert = () => {
    if (running) return;
    const k = dKey.trim();
    if (!k) {
      say("Escribe una clave.", "error");
      return;
    }
    const v = dValue.trim() || "—";
    const r = hashInsert(dict, k, v);
    play(
      "dict",
      r.steps,
      () => setDict(r.table),
      r.updated
        ? `Actualizado: "${k}" → "${v}".`
        : `Insertado: "${k}" → "${v}".`,
      "success",
      `${k} → ${v}`,
      dict,
    );
    setDKey("");
    setDValue("");
  };

  const dictSearch = () => {
    if (running) return;
    const k = dKey.trim();
    if (!k) {
      say("Escribe una clave para buscar.", "error");
      return;
    }
    const r = hashSearch(dict, k);
    play(
      "dict",
      r.steps,
      () => {},
      r.found
        ? `"${k}" → "${r.value}" (casilla ${r.index}).`
        : `"${k}" no está en el diccionario.`,
      r.found ? "success" : "error",
      r.found ? `${k} → ${r.value}` : `no está`,
      dict,
    );
  };

  const dictRemove = () => {
    if (running) return;
    const k = dKey.trim();
    if (!k) {
      say("Escribe una clave para eliminar.", "error");
      return;
    }
    const r = hashRemove(dict, k);
    play(
      "dict",
      r.steps,
      () => setDict(r.table),
      r.removed ? `Eliminado "${k}".` : `"${k}" no estaba.`,
      r.removed ? "success" : "error",
      r.removed ? `eliminado` : `nada que eliminar`,
      dict,
    );
    setDKey("");
  };

  // --- Dibujo ---

  const frameFor = (which: "A" | "B" | "dict"): Frame => {
    const table = which === "A" ? setA.table : which === "B" ? setB.table : dict;
    const fallback: Frame = {
      buckets: table.buckets.map((l) => l.map((e) => ({ ...e }))),
      size: table.size,
      hot: -1,
      action: "",
      count: table.count,
    };
    if (running && animTarget === which && stepIdx < (anim?.length ?? 0)) {
      return anim![stepIdx];
    }
    return fallback;
  };

  const renderBuckets = (frame: Frame) => (
    <div className="flex flex-wrap gap-1">
      {frame.buckets.map((bucket, i) => {
        const e = bucket.find((x) => x.key !== "");
        const tomb = isTombstone(bucket);
        const hot = frame.hot === i;
        return (
          <div
            key={i}
            className={`min-w-14 border-2 border-black px-1.5 py-1 font-mono text-xs ${
              hot
                ? "bg-black text-white"
                : tomb
                  ? "border-dashed bg-white"
                  : e
                    ? "bg-neutral-200"
                    : "bg-white"
            }`}
          >
            <div className="text-[9px] opacity-60">{i}</div>
            <div className="truncate font-bold">
              {e ? e.key : tomb ? "⋈" : "·"}
            </div>
            {e && method === "encadenamiento" && bucket.length > 1 ? (
              <div className="text-[9px] opacity-70">+{bucket.length - 1}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  const setCard = (which: "A" | "B", set: HashSet, text: string, onText: (v: string) => void) => {
    const frame = frameFor(which);
    const vals = setValues(set);
    const probes = anim ? [] : probeSequence(set.table, element.trim() || " ");
    return (
      <Card className="border-2">
        <div className="flex items-baseline justify-between">
          <CardTitle>Conjunto {which}</CardTitle>
          <span className="font-mono text-xs">
            |{which}| = {cardinality(set)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <TextInput
            label="Elementos"
            value={text}
            onChange={onText}
            onEnter={rebuildSets}
            placeholder="manzana, pera"
            className="w-56"
          />
          <Button onClick={rebuildSets} disabled={running} variant="secondary">
            Construir
          </Button>
        </div>

        <div className="mt-3">{renderBuckets(frame)}</div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <span className="font-bold uppercase">
            {which} = {"{"}
          </span>
          {vals.length === 0 ? (
            <span className="opacity-50">∅</span>
          ) : (
            vals.map((v) => (
              <span
                key={v}
                className={`border-2 border-black px-2 py-0.5 ${
                  setHas(set, v) && element.trim() === v
                    ? "bg-black text-white"
                    : "bg-white"
                }`}
              >
                {v}
              </span>
            ))
          )}
          <span className="font-bold">{"}"}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => addElementTo(which)} disabled={running}>
            Añadir
          </Button>
          <Button
            onClick={() => searchElement(which)}
            disabled={running}
            variant="secondary"
          >
            ¿Pertenece?
          </Button>
          <Button
            onClick={() => removeElement(which)}
            disabled={running}
            variant="danger"
          >
            Quitar
          </Button>
        </div>

        {!anim && element.trim() ? (
          <p className="mt-2 font-mono text-[10px] break-all text-black/60">
            sondeo de «{element.trim()}»: {probes.join(" → ")}
          </p>
        ) : null}
      </Card>
    );
  };

  const aSubB = isSubset(setA, setB);
  const aSupB = isSuperset(setA, setB);
  const disjoint = isDisjoint(setA, setB);
  const eq = setEquals(setA, setB);
  const uni = setValues(setUnion(setA, setB).result).sort();
  const inter = setValues(setIntersection(setA, setB)).sort();
  const diff = setValues(setDifference(setA, setB)).sort();
  const sym = setValues(setSymmetricDifference(setA, setB)).sort();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Conjuntos y diccionarios"
        description="Ambos se construyen sobre la tabla hash: un conjunto es una tabla cuyas claves son los elementos (el valor no importa), así que no admite repetidos y la pertenencia es una búsqueda; un diccionario es la tabla guardando, además, un valor por clave."
      />

      <div className="mb-5 inline-flex border-2 border-black">
        <button
          onClick={() => !running && setTab("sets")}
          disabled={running}
          className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-40 ${
            tab === "sets" ? "bg-black text-white" : "bg-white hover:bg-neutral-200"
          }`}
        >
          Conjuntos
        </button>
        <button
          onClick={() => !running && setTab("dict")}
          disabled={running}
          className={`border-l-2 border-black px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-40 ${
            tab === "dict" ? "bg-black text-white" : "bg-white hover:bg-neutral-200"
          }`}
        >
          Diccionario
        </button>
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold tracking-[0.2em] uppercase">
              Método
            </span>
            <div className="inline-flex border-2 border-black">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => changeMethod(m.key)}
                  disabled={running}
                  className={`border-l-2 border-black px-2.5 py-2 text-[10px] font-bold tracking-wider uppercase first:border-l-0 disabled:opacity-40 ${
                    method === m.key ? "bg-black text-white" : "bg-white hover:bg-neutral-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold tracking-[0.2em] uppercase">
              Función
            </span>
            <div className="inline-flex border-2 border-black">
              {FNS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => changeFn(f.key)}
                  disabled={running}
                  className={`border-l-2 border-black px-2.5 py-2 text-[10px] font-bold tracking-wider uppercase first:border-l-0 disabled:opacity-40 ${
                    hashFn === f.key ? "bg-black text-white" : "bg-white hover:bg-neutral-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </label>
          <TextInput
            label="Tamaño"
            value={String(size)}
            onChange={(v) => changeSize(Number(v))}
            placeholder="11"
            className="w-20"
          />
          <SpeedControl value={speed} onChange={setSpeed} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <StatusBar tone={tone}>{message}</StatusBar>
          <div className="flex min-w-72 flex-col justify-center border-2 border-black bg-white px-4 py-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-black/60 uppercase">
              Resultado
            </span>
            <span className="font-mono text-sm font-bold break-words text-black">
              {output || "—"}
            </span>
          </div>
        </div>
      </Card>

      {tab === "sets" ? (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-end gap-3">
              <TextInput
                label="Elemento"
                value={element}
                onChange={setElement}
                onEnter={() => searchElement("A")}
                placeholder="pera"
                className="w-40"
              />
              <span className="pb-2 text-xs text-black/60">
                Se usa con «Añadir», «¿Pertenece?» y «Quitar» de cada conjunto.
              </span>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {setCard("A", setA, textA, setTextA)}
            {setCard("B", setB, textB, setTextB)}
          </div>

          <Card className="mt-6">
            <CardTitle>Operaciones</CardTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={opUnion} disabled={running}>
                A ∪ B
              </Button>
              <Button
                onClick={() => opBinary("A ∩ B", setIntersection, "A ∩ B")}
                disabled={running}
                variant="secondary"
              >
                A ∩ B
              </Button>
              <Button
                onClick={() => opBinary("A − B", setDifference, "A − B")}
                disabled={running}
                variant="secondary"
              >
                A − B
              </Button>
              <Button
                onClick={() =>
                  opBinary(
                    "A △ B",
                    setSymmetricDifference,
                    "A △ B (diferencia simétrica)",
                  )
                }
                disabled={running}
                variant="secondary"
              >
                A △ B
              </Button>
            </div>

            <div className="mt-4 grid gap-1.5 font-mono text-xs sm:grid-cols-2">
              <div>
                A ∪ B = {"{"}
                {uni.join(", ") || "∅"}
                {"}"}
              </div>
              <div>
                A ∩ B = {"{"}
                {inter.join(", ") || "∅"}
                {"}"}
              </div>
              <div>
                A − B = {"{"}
                {diff.join(", ") || "∅"}
                {"}"}
              </div>
              <div>
                A △ B = {"{"}
                {sym.join(", ") || "∅"}
                {"}"}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-black pt-4">
              <Button
                onClick={() => opPredicate("A ⊆ B", aSubB)}
                disabled={running}
                variant="secondary"
              >
                A ⊆ B
              </Button>
              <Button
                onClick={() => opPredicate("A ⊇ B", aSupB)}
                disabled={running}
                variant="secondary"
              >
                A ⊇ B
              </Button>
              <Button
                onClick={() => opPredicate("A y B disjuntos", disjoint)}
                disabled={running}
                variant="secondary"
              >
                A ∩ B = ∅
              </Button>
              <Button
                onClick={() => opPredicate("A = B", eq)}
                disabled={running}
                variant="secondary"
              >
                A = B
              </Button>
            </div>
            <p className="mt-3 font-mono text-xs text-black/70">
              A ⊆ B: {aSubB ? "sí" : "no"} · A ⊇ B: {aSupB ? "sí" : "no"} · A ∩
              B = ∅: {disjoint ? "sí" : "no"} · A = B: {eq ? "sí" : "no"}
            </p>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <Card>
              <CardTitle>Métricas de A y B</CardTitle>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {(["A", "B"] as const).map((w) => {
                  const s = w === "A" ? setA : setB;
                  return (
                    <dl key={w} className="space-y-1.5">
                      <MetricRow label={`|${w}|`} value={cardinality(s)} />
                      <MetricRow
                        label={`factor de carga ${w}`}
                        value={(s.table.count / s.table.size).toFixed(3)}
                      />
                      <MetricRow
                        label={`colisiones ${w}`}
                        value={w === "A" ? setA.table.collisions : setB.table.collisions}
                      />
                    </dl>
                  );
                })}
              </div>
            </Card>
            <Card>
              <CardTitle>Leyenda</CardTitle>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <Swatch fill="#ffffff" /> Casilla libre
                </li>
                <li>
                  <Swatch fill="#e5e5e5" /> Elemento guardado
                </li>
                <li>
                  <Swatch fill="#000000" /> Casilla en curso
                </li>
                <li>
                  <Swatch fill="#ffffff" dashed /> Lápida ⋈
                </li>
              </ul>
            </Card>
          </div>

          <Card className="mt-6">
            <CardTitle>Por qué un conjunto es una tabla hash</CardTitle>
            <p className="mt-3 text-xs leading-relaxed">
              La tabla guarda cada elemento como clave, así que no puede haber
              repetidos: insertar dos veces «pera» no aumenta el cardinal. La
              pertenencia (¿está «pera»?) es una búsqueda, la operación que la
              tabla hace bien. Las operaciones entre conjuntos se apoyan en
              eso: A ∪ B inserta los de B en A; A ∩ B y A − B recorren A y
              preguntan si el elemento está en B.
            </p>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-6">
              <div className="border-2 border-black bg-white p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <CardTitle>Diccionario (clave → valor)</CardTitle>
                  <span className="font-mono text-xs">
                    {dict.count} par(es) · {dict.size} casillas
                  </span>
                </div>
                {renderBuckets(frameFor("dict"))}
              </div>

              <Card>
                <CardTitle>Pares guardados</CardTitle>
                {dict.count === 0 ? (
                  <p className="mt-3 text-xs text-black/60">
                    El diccionario está vacío. Inserta un par.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-1.5 font-mono text-xs">
                    {dict.buckets
                      .flat()
                      .filter((e) => e.key !== "")
                      .map((e, i) => (
                        <li
                          key={e.key + i}
                          className="inline-flex items-center border-2 border-black"
                        >
                          <span className="bg-neutral-200 px-2 py-1 font-bold">
                            {e.key}
                          </span>
                          <span className="border-l-2 border-black px-2 py-1">
                            {e.value}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardTitle>Operación</CardTitle>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <TextInput
                    label="Clave"
                    value={dKey}
                    onChange={setDKey}
                    onEnter={dictInsert}
                    placeholder="nombre"
                    className="w-28"
                  />
                  <TextInput
                    label="Valor"
                    value={dValue}
                    onChange={setDValue}
                    onEnter={dictInsert}
                    placeholder="Ana"
                    className="w-28"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={dictInsert} disabled={running}>
                    Insertar
                  </Button>
                  <Button onClick={dictSearch} disabled={running} variant="secondary">
                    Buscar
                  </Button>
                  <Button onClick={dictRemove} disabled={running} variant="danger">
                    Eliminar
                  </Button>
                </div>
              </Card>

              <Card>
                <CardTitle>Métricas</CardTitle>
                <dl className="mt-3 space-y-1.5">
                  <MetricRow label="Pares" value={dict.count} />
                  <MetricRow label="Casillas" value={dict.size} />
                  <MetricRow
                    label="Factor de carga"
                    value={(dict.count / dict.size).toFixed(3)}
                  />
                  <MetricRow label="Colisiones" value={dict.collisions} />
                </dl>
              </Card>

              <Card>
                <CardTitle>Diccionario y conjunto</CardTitle>
                <p className="mt-3 text-xs leading-relaxed">
                  Un diccionario es la tabla hash con su valor; un conjunto es
                  la misma tabla donde el valor no se usa. Por eso compartir
                  implementación es correcto: cambia qué se hace con el valor,
                  no cómo se coloca la clave.
                </p>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

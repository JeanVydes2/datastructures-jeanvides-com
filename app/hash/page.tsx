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
  type Entry,
  type HashFn,
  type HashMethod,
  type HashStep,
  type HashTable,
  clusters,
  emptyHashTable,
  entries,
  expectedProbes,
  hash,
  hashInsert,
  hashRemove,
  hashResize,
  hashSearch,
  isTombstone,
  loadFactor,
  maxChain,
  measuredProbes,
  nextPrime,
  occupied,
  probeSequence,
  tombstones,
} from "@/lib/hashtable";

/** Estado visual de una casilla. */
type CellState =
  | "empty"
  | "occupied"
  | "current"
  | "collision"
  | "found"
  | "tombstone";

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

interface Frame {
  table: HashTable;
  states: Record<number, CellState>;
  message: string;
  tone: "info" | "success" | "error";
  /** Resultado textual de la operación. */
  output: string;
}

/**
 * Cómo se colorea cada casilla según lo que hace el paso: la ocupación de
 * fondo la decide su contenido, y la acción del paso resalta una en concreto.
 */
function statesFor(step: HashStep): Record<number, CellState> {
  const states: Record<number, CellState> = {};
  step.buckets.forEach((list, i) => {
    if (isTombstone(list)) states[i] = "tombstone";
    else if (list.length > 0) states[i] = "occupied";
    else states[i] = "empty";
  });
  if (step.action === "rehash") return states;
  states[step.index] =
    step.action === "collision" || step.action === "probe"
      ? "collision"
      : step.action === "found"
        ? "found"
        : "current";
  return states;
}

export default function HashPage() {
  const [table, setTable] = useState<HashTable>(() => {
    let t = emptyHashTable(7, "lineal", "simple");
    for (const [k, v] of [
      ["ana", "10"],
      ["luis", "20"],
      ["eva", "30"],
      ["sol", "40"],
    ]) {
      t = hashInsert(t, k, v).table;
    }
    return t;
  });

  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [size, setSize] = useState("7");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [frame, setFrame] = useState<Frame>(() => ({
    table,
    states: {},
    message:
      "Escribe una clave y un valor, e inserta. Cada paso muestra la casilla y el sondeo.",
    tone: "info",
    output: "",
  }));
  const [anim, setAnim] = useState<Frame[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const running = anim !== null;
  const stepMs = SPEED_MS[speed];
  const shown = anim && stepIdx < anim.length ? anim[stepIdx] : frame;
  const shownTable = shown.table;

  useEffect(() => {
    if (!anim) return;
    if (stepIdx >= anim.length) {
      const last = anim[anim.length - 1];
      setFrame(last);
      setAnim(null);
      setStepIdx(0);
      // El resultado solo se aplica al terminar: mientras se anima, la tabla
      // formal sigue siendo la de partida y se dibujan las fotos de cada paso.
      if (pendingRef.current) {
        setTable(pendingRef.current);
        pendingRef.current = null;
      }
      return;
    }
    setFrame(anim[stepIdx]);
    const t = setTimeout(() => setStepIdx((i) => i + 1), stepMs);
    return () => clearTimeout(t);
  }, [anim, stepIdx, stepMs]);

  // Tabla formal que se aplica al acabar una animación (con su conteo real).
  const pendingRef = useRef<HashTable | null>(null);

  const say = (
    message: string,
    tone: "info" | "success" | "error" = "info",
    output = "",
  ) => {
    if (running) return;
    setAnim(null);
    setFrame({ table, states: {}, message, tone, output });
  };

  const run = (
    base: HashTable,
    steps: HashStep[],
    resultTable: HashTable,
    tone: Frame["tone"],
    output: string,
    applyTable: boolean,
  ) => {
    // Cada fotograma lleva su propia foto de las casillas; la tabla formal
    // (con su conteo y métricas) es la base, y solo se sustituye al final si
    // la operación la cambia.
    const frames: Frame[] = steps.map((s, i) => {
      const last = i === steps.length - 1;
      const formal = last ? resultTable : base;
      return {
        // La tabla formal da el tamaño y el conteo; las casillas dibujadas
        // son la foto del paso, para que se vea cada sondeo.
        table: {
          ...formal,
          buckets: s.buckets.map((l) => l.map((e) => ({ ...e }))),
        },
        states: statesFor(s),
        message: s.message,
        tone,
        output: last ? output : "",
      };
    });
    pendingRef.current = applyTable ? resultTable : null;
    setAnim(frames);
    setStepIdx(0);
  };

  // --- Operaciones ---

  const doInsert = () => {
    if (running) return;
    const k = key.trim();
    if (!k) {
      say("Escribe una clave.", "error");
      return;
    }
    const v = value.trim() || "—";
    const r = hashInsert(table, k, v);
    const out = r.updated
      ? `actualizado: "${k}" → "${v}"`
      : r.inserted
        ? `insertado: "${k}" → "${v}"`
        : `no se pudo insertar "${k}" (tabla llena)`;
    // Si el factor de carga pasa de 0.75 en abierto, se encadena un resize.
    let finalTable = r.table;
    let frames = r.steps;
    if (r.inserted && table.method !== "encadenamiento" && loadFactor(r.table) > 0.75) {
      const grown = hashResize(r.table);
      finalTable = grown.table;
      frames = [
        ...r.steps,
        ...grown.steps.map((s, i) => ({
          ...s,
          buckets: grown.steps[i].buckets,
        })),
      ];
    }
    const tone: Frame["tone"] = r.inserted || r.updated ? "success" : "error";
    run(table, frames, finalTable, tone, out, true);
    setKey("");
    setValue("");
  };

  const doSearch = () => {
    if (running) return;
    const k = key.trim();
    if (!k) {
      say("Escribe una clave para buscar.", "error");
      return;
    }
    const r = hashSearch(table, k);
    const out = r.found
      ? `encontrado en la casilla ${r.index}: "${k}" → "${r.value}"`
      : `"${k}" no está en la tabla`;
    run(table, r.steps, table, r.found ? "success" : "error", out, false);
  };

  const doRemove = () => {
    if (running) return;
    const k = key.trim();
    if (!k) {
      say("Escribe una clave para eliminar.", "error");
      return;
    }
    const r = hashRemove(table, k);
    const out = r.removed
      ? table.method === "encadenamiento"
        ? `eliminado: "${k}"`
        : `eliminado: "${k}" deja lápida ⋈`
      : `"${k}" no estaba`;
    run(table, r.steps, r.table, r.removed ? "success" : "error", out, true);
  };

  const doResize = () => {
    if (running) return;
    const r = hashResize(table);
    run(
      table,
      r.steps,
      r.table,
      "success",
      `redimensionada a ${r.table.size} casillas (primo)`,
      true,
    );
  };

  const doDemo = () => {
    if (running) return;
    const n = Number(size);
    if (!Number.isFinite(n) || n < 1) {
      say("El tamaño debe ser un entero positivo.", "error");
      return;
    }
    const t = emptyHashTable(nextPrime(n), table.method, table.hashFn);
    setTable(t);
    setFrame({
      table: t,
      states: {},
      message: `Tabla vacía de ${t.size} casillas (${table.method}).`,
      tone: "info",
      output: "",
    });
  };

  const changeMethod = (m: HashMethod) => {
    if (running) return;
    const t = emptyHashTable(table.size, m, table.hashFn);
    setTable(t);
    const label = METHODS.find((x) => x.key === m)!.label;
    setFrame({
      table: t,
      states: {},
      message: `Método ${label}: la tabla se vacía, porque cambia cómo se colocan las claves.`,
      tone: "info",
      output: "",
    });
  };

  const changeFn = (f: HashFn) => {
    if (running) return;
    const t = emptyHashTable(table.size, table.method, f);
    setTable(t);
    const label = FNS.find((x) => x.key === f)!.label;
    setFrame({
      table: t,
      states: {},
      message: `Función hash ${label}: la tabla se vacía, porque cambia el índice de cada clave.`,
      tone: "info",
      output: "",
    });
  };

  const doClear = () => {
    if (running) return;
    const t = emptyHashTable(table.size, table.method, table.hashFn);
    setTable(t);
    setFrame({
      table: t,
      states: {},
      message: "Tabla vaciada.",
      tone: "info",
      output: "",
    });
  };

  // --- Datos derivados ---

  const list = entries(shownTable);
  const cls = clusters(shownTable);
  const clusterSet = new Set(cls.flat());

  // Casilla resaltada por la animación: se toma del último paso visible.
  const states = shown.states;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Tabla hash"
        description="Guarda pares clave-valor y aprende cómo se resuelven las colisiones. Con direccionamiento abierto, la clave sondea casillas hasta hallar un hueco; con encadenamiento, cada casilla es una lista. Elige método y función hash, observa el sondeo paso a paso, elimina (con lápida) y redimensiona cuando la tabla se llena."
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <TextInput
            label="Clave"
            value={key}
            onChange={setKey}
            onEnter={doInsert}
            placeholder="ana"
            className="w-28"
          />
          <TextInput
            label="Valor"
            value={value}
            onChange={setValue}
            onEnter={doInsert}
            placeholder="10"
            className="w-24"
          />
          <Button onClick={doInsert} disabled={running}>
            Insertar
          </Button>
          <Button onClick={doSearch} disabled={running} variant="secondary">
            Buscar
          </Button>
          <Button onClick={doRemove} disabled={running} variant="danger">
            Eliminar
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-black pt-4">
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
                  className={`border-l-2 border-black px-2.5 py-2 text-[10px] font-bold tracking-wider uppercase transition-colors first:border-l-0 disabled:opacity-40 ${
                    table.method === m.key
                      ? "bg-black text-white"
                      : "bg-white hover:bg-neutral-200"
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
                  className={`border-l-2 border-black px-2.5 py-2 text-[10px] font-bold tracking-wider uppercase transition-colors first:border-l-0 disabled:opacity-40 ${
                    table.hashFn === f.key
                      ? "bg-black text-white"
                      : "bg-white hover:bg-neutral-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </label>
          <TextInput
            label="Tamaño"
            value={size}
            onChange={setSize}
            onEnter={doDemo}
            placeholder="7"
            className="w-20"
          />
          <Button onClick={doDemo} disabled={running} variant="secondary">
            Nueva
          </Button>
          <Button onClick={doResize} disabled={running} variant="secondary">
            Redimensionar
          </Button>
          <SpeedControl value={speed} onChange={setSpeed} />
          <Button onClick={doClear} disabled={running} variant="danger">
            Vaciar
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <StatusBar tone={shown.tone}>{shown.message || "…"}</StatusBar>
          <div className="flex flex-col justify-center border-2 border-black bg-white px-4 py-2 md:min-w-72">
            <span className="text-[10px] font-bold tracking-[0.2em] text-black/60 uppercase">
              Resultado
            </span>
            <span className="font-mono text-sm font-bold break-words text-black">
              {shown.output || "—"}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* La tabla de casillas */}
          <div className="border-2 border-black bg-white p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase">
                Casillas
              </h2>
              <span className="text-xs text-black/60">
                índice 0 … {shownTable.size - 1} · {shownTable.size} casillas
              </span>
            </div>

            {table.method === "encadenamiento" ? (
              <ul className="space-y-1.5">
                {shownTable.buckets.map((bucket, i) => {
                  const st = states[i];
                  return (
                    <li key={i} className="flex items-stretch gap-2">
                      <span
                        className={`flex w-10 shrink-0 items-center justify-center border-2 border-black font-mono text-xs font-bold ${
                          st === "found"
                            ? "bg-neutral-400"
                            : st === "current" || st === "collision"
                              ? "bg-black text-white"
                              : "bg-white"
                        }`}
                      >
                        {i}
                      </span>
                      <div className="flex flex-1 flex-wrap items-center gap-1 border-2 border-black bg-white px-1 py-1">
                        {bucket.length === 0 ? (
                          <span className="px-2 font-mono text-xs text-black/40">
                            ∅
                          </span>
                        ) : (
                          bucket.map((e, j) => (
                            <span
                              key={e.key + j}
                              className={`inline-flex items-center gap-1 border-2 font-mono text-xs ${
                                st === "found" && j === 0
                                  ? "border-black bg-black text-white"
                                  : "border-black bg-white"
                              }`}
                            >
                              <span className="px-2 py-0.5 font-bold">
                                {e.key}
                              </span>
                              <span className="border-l-2 border-black px-2 py-0.5">
                                {e.value}
                              </span>
                            </span>
                          ))
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                {shownTable.buckets.map((bucket, i) => {
                  const st = states[i];
                  const e: Entry | undefined = bucket.find((x) => x.key !== "");
                  const tomb = isTombstone(bucket);
                  const bg =
                    st === "found"
                      ? "bg-neutral-400"
                      : st === "current"
                        ? "bg-black text-white"
                        : st === "collision"
                          ? "bg-neutral-500 text-white"
                          : tomb
                            ? "bg-white"
                            : e
                              ? "bg-neutral-200"
                              : "bg-white";
                  return (
                    <li
                      key={i}
                      className={`border-2 border-black px-2 py-1.5 font-mono text-xs ${bg} ${
                        tomb ? "border-dashed" : ""
                      } ${clusterSet.has(i) ? "border-width-[3px]" : ""}`}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-[9px] opacity-60">{i}</span>
                        {tomb ? <span className="opacity-60">⋈</span> : null}
                      </div>
                      {e ? (
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold">{e.key}</span>
                          <span className="opacity-70">{e.value}</span>
                        </div>
                      ) : (
                        <div className="leading-tight opacity-40">
                          {tomb ? "lápida" : "vacío"}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Sondeo: secuencia de la clave escrita */}
          {key.trim() ? (
            <Card>
              <CardTitle>Sondeo de «{key.trim()}»</CardTitle>
              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="border-2 border-black bg-black px-2 py-1 text-white">
                  h = {hash(key.trim(), table.size, table.hashFn)}
                </span>
                <span className="text-black/50">→</span>
                {probeSequence(table, key.trim()).map((idx, i) => (
                  <span
                    key={i}
                    className="border-2 border-black px-2 py-1"
                    title={`sondeo ${i}`}
                  >
                    {idx}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-black/60">
                Casillas que se probarían, en orden, para esta clave.
              </p>
            </Card>
          ) : null}

          {/* Entradas guardadas */}
          <Card>
            <CardTitle>Entradas ({list.length})</CardTitle>
            {list.length === 0 ? (
              <p className="mt-3 text-xs text-black/60">Vacía.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-1.5 font-mono text-xs">
                {list.map((e, i) => (
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
            <CardTitle>Métricas</CardTitle>
            <dl className="mt-3 space-y-1.5">
              <MetricRow label="Casillas" value={table.size} />
              <MetricRow label="Entradas" value={table.count} />
              <MetricRow
                label="Factor de carga"
                value={loadFactor(table).toFixed(3)}
              />
              <MetricRow label="Ocupadas" value={occupied(table)} />
              <MetricRow
                label="Lápidas"
                value={tombstones(table)}
              />
              <MetricRow label="Colisiones" value={table.collisions} />
              {table.method === "encadenamiento" ? (
                <MetricRow
                  label="Cadena más larga"
                  value={maxChain(table)}
                />
              ) : (
                <>
                  <MetricRow
                    label="Sondeos medidos"
                    value={measuredProbes(table).toFixed(2)}
                  />
                  <MetricRow
                    label="Sondeos teóricos"
                    value={expectedProbes(table).toFixed(2)}
                  />
                </>
              )}
              <MetricRow label="Racimos" value={cls.length} />
              <MetricRow
                label="Racimo mayor"
                value={cls.reduce((m, c) => Math.max(m, c.length), 0)}
              />
            </dl>
            {table.method !== "encadenamiento" &&
            table.count > 0 &&
            loadFactor(table) < 0.9 ? (
              <p className="mt-3 text-xs text-black/60">
                Los sondeos medidos ({measuredProbes(table).toFixed(2)}) frente a
                los que predice la fórmula ({expectedProbes(table).toFixed(2)}).
              </p>
            ) : null}
          </Card>

          <Card>
            <CardTitle>Método</CardTitle>
            <p className="mt-3 text-xs leading-relaxed">
              {table.method === "lineal"
                ? "Sondeo lineal: si la casilla está ocupada, prueba la siguiente. Sencillo, pero forma racimos que alargan las búsquedas."
                : table.method === "cuadratico"
                  ? "Sondeo cuadrático: los saltos crecen (1, 4, 9…), así que no forma racimos. Con relleno, aun así cubre toda la tabla para no fallar donde hay hueco."
                  : table.method === "doble"
                    ? "Doble hash: el salto depende de otra función de la clave, con lo que dos claves que chocan no siguen el mismo camino."
                    : "Encadenamiento: cada casilla guarda una lista de entradas; las colisiones se acumulan ahí y no hace falta sondear casillas."}
            </p>
          </Card>

          <Card>
            <CardTitle>Leyenda</CardTitle>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Swatch fill="#ffffff" /> Libre
              </li>
              <li>
                <Swatch fill="#e5e5e5" /> Ocupada
              </li>
              <li>
                <Swatch fill="#000000" /> Casilla en curso
              </li>
              <li>
                <Swatch fill="#737373" /> Colisión / encontrada
              </li>
              <li>
                <Swatch fill="#ffffff" dashed /> Lápida ⋈ (borrado)
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardTitle>Colisiones, lápidas y crecimiento</CardTitle>
        <div className="mt-3 grid gap-3 text-xs leading-relaxed sm:grid-cols-2">
          <p>
            <strong>Colisión:</strong> dos claves quieren la misma casilla. Se
            resuelve sondeando otra (abierto) o añadiendo a la lista
            (encadenamiento).
          </p>
          <p>
            <strong>Factor de carga α = n/m:</strong> cuánto de llena está. Al
            acercarse a 1, el sondeo se dispara, por eso se redimensiona antes
            (aquí, al pasar de 0.75).
          </p>
          <p>
            <strong>Lápida:</strong> al borrar en abierto no se deja la casilla
            vacía —eso cortaría las cadenas de sondeo— sino una marca; se puede
            reutilizar al insertar y desaparece al redimensionar.
          </p>
          <p>
            <strong>Redimensionar:</strong> el índice depende del tamaño, así
            que al crecer hay que recolocar todas las entradas. El nuevo tamaño
            es primo, para repartir mejor.
          </p>
        </div>
      </Card>
    </div>
  );
}

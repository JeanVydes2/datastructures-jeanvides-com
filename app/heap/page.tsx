"use client";

import { useEffect, useMemo, useState } from "react";
import TreeCanvas, { type NodeStatus } from "@/components/TreeCanvas";
import {
  Button,
  Card,
  CardTitle,
  MetricRow,
  NumberInput,
  PageHeader,
  StatusBar,
  Swatch,
} from "@/components/ui";
import {
  type Heap,
  type HeapKind,
  type HeapStep,
  emptyHeap,
  heapExtract,
  heapHeight,
  heapInsert,
  heapLayout,
  heapLeaves,
} from "@/lib/heap";

type PendingCommit =
  | { kind: "insert"; heap: Heap }
  | { kind: "extract"; heap: Heap; top: number | null }
  | null;

const SPEED_MS = 780;

export default function HeapPage() {
  const [kind, setKind] = useState<HeapKind>("min");
  const [heap, setHeap] = useState<Heap>(() => emptyHeap("min"));
  const [value, setValue] = useState("");
  const [steps, setSteps] = useState<HeapStep[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [commit, setCommit] = useState<PendingCommit>(null);
  const [message, setMessage] = useState(
    "El montículo está vacío. Inserta un valor para verlo subir hasta su lugar.",
  );
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  const running = steps !== null;

  useEffect(() => {
    if (!steps) return;
    if (idx >= steps.length) {
      setSteps(null);
      setIdx(0);
      if (commit?.kind === "insert") {
        setHeap(commit.heap);
        setMessage("Valor insertado manteniendo la propiedad de montículo.");
        setTone("success");
      } else if (commit?.kind === "extract") {
        setHeap(commit.heap);
        setMessage(
          commit.top === null
            ? "El montículo está vacío."
            : `Extraído ${commit.top} desde la raíz.`,
        );
        setTone(commit.top === null ? "error" : "success");
      }
      setCommit(null);
      return;
    }
    setMessage(steps[idx].message);
    setTone("info");
    const t = setTimeout(() => setIdx((i) => i + 1), SPEED_MS);
    return () => clearTimeout(t);
  }, [steps, idx, commit]);

  const frame = steps ? steps[Math.min(idx, steps.length - 1)] : null;
  const displayHeap: Heap = useMemo(
    () => (frame ? { data: frame.snapshot, kind } : heap),
    [frame, heap, kind],
  );

  const status = useMemo(() => {
    const st: Record<string, NodeStatus> = {};
    if (frame) {
      for (const i of frame.route) st[String(i)] = "visited";
      for (const i of frame.hot)
        st[String(i)] = frame.action === "swap" ? "current" : "found";
    }
    return st;
  }, [frame]);

  const tree = useMemo(() => heapLayout(displayHeap), [displayHeap]);

  const changeKind = (next: HeapKind) => {
    if (running) return;
    setKind(next);
    setHeap(emptyHeap(next));
    setSteps(null);
    setMessage(
      next === "min"
        ? "Min-heap: el menor queda en la raíz."
        : "Max-heap: el mayor queda en la raíz.",
    );
    setTone("info");
  };

  const parse = () => {
    const n = Number(value);
    if (value.trim() === "" || Number.isNaN(n)) return null;
    return Math.trunc(n);
  };

  const startAnim = (frames: HeapStep[], pending: PendingCommit) => {
    setValue("");
    setSteps(frames);
    setIdx(0);
    setCommit(pending);
  };

  const doInsert = () => {
    if (running) return;
    const n = parse();
    if (n === null) {
      setMessage("Escribe un número entero para insertar.");
      setTone("error");
      return;
    }
    const { heap: next, steps: frames } = heapInsert(heap, n);
    startAnim(frames, { kind: "insert", heap: next });
  };

  const doExtract = () => {
    if (running || heap.data.length === 0) return;
    const { heap: next, steps: frames, top } = heapExtract(heap);
    startAnim(frames, { kind: "extract", heap: next, top });
  };

  const reset = () => {
    if (running) return;
    setHeap(emptyHeap(kind));
    setMessage("Montículo vacío.");
    setTone("info");
  };

  const demo = () => {
    if (running) return;
    let h = emptyHeap(kind);
    for (const v of [5, 3, 8, 1, 9, 2]) h = heapInsert(h, v).heap;
    setHeap(h);
    setMessage("Montículo de ejemplo cargado.");
    setTone("info");
  };

  const topLabel = kind === "min" ? "Mínimo" : "Máximo";
  const leaves = heapLeaves(heap);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Montículo binario"
        description="El valor que manda queda en la raíz: el menor en un min-heap, el mayor en un max-heap. Al insertar, el valor burbujea hacia arriba; al extraer, la raíz se reemplaza y el reemplazo se hunde."
      />

      <Card className="mb-6">
        <div className="mb-4 inline-flex border-2 border-black">
          {(["min", "max"] as const).map((k) => (
            <button
              key={k}
              onClick={() => changeKind(k)}
              disabled={running}
              className={`px-4 py-1.5 text-xs font-bold tracking-wider uppercase transition-colors duration-150 disabled:opacity-40 ${
                kind === k
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              {k === "min" ? "Min-heap" : "Max-heap"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <NumberInput
            label="Valor"
            value={value}
            onChange={setValue}
            onEnter={doInsert}
            placeholder="7"
          />
          <Button onClick={doInsert} disabled={running}>
            Insertar
          </Button>
          <Button
            onClick={doExtract}
            disabled={running || heap.data.length === 0}
            variant="secondary"
          >
            Extraer {kind === "min" ? "mínimo" : "máximo"}
          </Button>
          <div className="mx-1 hidden h-9 w-px bg-black sm:block" />
          <Button onClick={demo} disabled={running} variant="secondary">
            Ejemplo
          </Button>
          <Button onClick={reset} disabled={running} variant="danger">
            Vaciar
          </Button>
        </div>

        <div className="mt-4">
          <StatusBar tone={tone}>{message}</StatusBar>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
        <TreeCanvas tree={tree} status={status} />

        <div className="space-y-6">
          <Card>
            <CardTitle>Métricas</CardTitle>
            <dl className="mt-3 space-y-2">
              <MetricRow label="Altura" value={heapHeight(heap)} />
              <MetricRow label="Hojas" value={leaves.length} />
              <MetricRow label="Nodos" value={heap.data.length} />
              <MetricRow
                label={topLabel}
                value={heap.data.length ? heap.data[0] : "—"}
              />
            </dl>
          </Card>

          <Card>
            <CardTitle>Arreglo</CardTitle>
            <div className="mt-3 flex flex-wrap gap-1 font-mono text-xs">
              {displayHeap.data.length === 0 ? (
                <span className="text-black/50">vacío</span>
              ) : (
                displayHeap.data.map((v, i) => {
                  const isHot = frame?.hot.includes(i);
                  const isRoute = frame?.route.includes(i);
                  return (
                    <span
                      key={i}
                      className={`inline-flex min-w-9 flex-col items-center border-2 px-2 py-1 transition-colors duration-200 ${
                        isHot
                          ? "border-black bg-black text-white"
                          : isRoute
                            ? "border-black bg-neutral-300 text-black"
                            : "border-black bg-white text-black"
                      }`}
                    >
                      <span className="text-[9px] opacity-60">{i}</span>
                      <span className="font-bold">{v}</span>
                    </span>
                  );
                })
              )}
            </div>
            <p className="mt-3 text-xs text-black/60">Hijos de i: 2i+1 y 2i+2.</p>
          </Card>

          <Card>
            <CardTitle>Orden por extracción</CardTitle>
            <div className="mt-3 font-mono text-xs leading-relaxed break-words text-black">
              {heap.data.length
                ? [...heap.data]
                    .sort((a, b) => (kind === "min" ? a - b : b - a))
                    .join(" → ")
                : "—"}
            </div>
            <p className="mt-2 text-xs text-black/60">
              Extraer la raíz repetidamente produce este orden.
            </p>
          </Card>

          <Card>
            <CardTitle>Leyenda</CardTitle>
            <ul className="mt-3 space-y-2 text-xs text-black">
              <li>
                <Swatch fill="#d4d4d4" /> En la ruta del burbujeo
              </li>
              <li>
                <Swatch fill="#000000" /> Intercambiando
              </li>
              <li>
                <Swatch fill="#a3a3a3" /> Comparado ahora
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

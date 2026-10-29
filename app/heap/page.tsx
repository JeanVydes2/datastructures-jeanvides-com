"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TreeCanvas, {
  type GhostNode,
  type NodeStatus,
} from "@/components/TreeCanvas";
import {
  Button,
  Card,
  CardTitle,
  MetricRow,
  NumberInput,
  PageHeader,
  SPEED_MS,
  SpeedControl,
  type Speed,
  StatusBar,
  Swatch,
  TextInput,
} from "@/components/ui";
import {
  type Heap,
  type HeapHole,
  type HeapKind,
  type HeapStep,
  emptyHeap,
  heapExtract,
  heapGeometry,
  heapHeight,
  heapInsert,
  heapLayout,
  heapLeaves,
  heapRemove,
} from "@/lib/heap";

type PendingCommit =
  | { kind: "insert"; heap: Heap }
  | { kind: "duplicate"; value: number }
  | { kind: "extract"; heap: Heap; top: number | null }
  | { kind: "remove"; heap: Heap; value: number; removed: boolean }
  | null;

/** Convierte "5, 3, 8" en [5, 3, 8]. Ignora lo que no sea entero. */
function parseList(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t !== "")
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.trunc(n));
}

export default function HeapPage() {
  const [kind, setKind] = useState<HeapKind>("min");
  const [heap, setHeap] = useState<Heap>(() => emptyHeap("min"));
  const [value, setValue] = useState("");
  const [list, setList] = useState("");
  const [steps, setSteps] = useState<HeapStep[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [commit, setCommit] = useState<PendingCommit>(null);
  const [message, setMessage] = useState(
    "El montículo está vacío. Inserta valores para verlos subir hasta su lugar.",
  );
  const [tone, setTone] = useState<"info" | "success" | "error">("info");
  const [queue, setQueue] = useState<number[]>([]);
  const [speed, setSpeed] = useState<Speed>("normal");

  const running = steps !== null;
  const stepMs = SPEED_MS[speed];
  const startedRef = useRef<string | null>(null);

  // --- Aplica el resultado cuando una animación termina. ---
  useEffect(() => {
    if (!steps) return;
    if (idx >= steps.length) {
      setSteps(null);
      setIdx(0);
      if (commit?.kind === "insert") {
        setHeap(commit.heap);
        setMessage("Valor insertado manteniendo la propiedad de montículo.");
        setTone("success");
      } else if (commit?.kind === "duplicate") {
        setMessage(
          `${commit.value} ya existe: se descubrió al llegar a su nodo, por eso no se duplica.`,
        );
        setTone("error");
      } else if (commit?.kind === "extract") {
        setHeap(commit.heap);
        setMessage(
          commit.top === null
            ? "El montículo está vacío."
            : `Extraído ${commit.top} desde la raíz.`,
        );
        setTone(commit.top === null ? "error" : "success");
      } else if (commit?.kind === "remove") {
        setHeap(commit.heap);
        setMessage(
          commit.removed
            ? `Eliminado ${commit.value}: lo reemplazó el último elemento, que se reacomodó.`
            : `${commit.value} no está en el montículo.`,
        );
        setTone(commit.removed ? "success" : "error");
      }
      setCommit(null);
      return;
    }
    setMessage(steps[idx].message);
    setTone("info");
    const t = setTimeout(() => setIdx((i) => i + 1), stepMs);
    return () => clearTimeout(t);
  }, [steps, idx, commit, stepMs]);

  // --- Procesa la cola: inserta el siguiente valor uno a uno. ---
  useEffect(() => {
    if (running || queue.length === 0) return;
    const key = `${queue.join(",")}|${heap.data.join(",")}|${kind}|${idx}`;
    if (startedRef.current === key) return;
    startedRef.current = key;

    const [next, ...rest] = queue;
    setQueue(rest);
    const { heap: after, steps: frames, inserted } = heapInsert(heap, next);
    setSteps(frames);
    setIdx(0);
    setCommit(
      inserted
        ? { kind: "insert", heap: after }
        : { kind: "duplicate", value: next },
    );
  }, [queue, running, heap, kind, idx]);

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
        st[String(i)] =
          frame.action === "swap"
            ? "current"
            : frame.action === "duplicate" ||
                frame.action === "found" ||
                frame.action === "missing"
              ? "found"
              : "visited";
    }
    return st;
  }, [frame]);

  const tree = useMemo(() => heapLayout(displayHeap), [displayHeap]);

  // Hijos nulos que faltan en este fotograma, dibujados como nodos "null".
  const ghosts = useMemo<GhostNode[]>(() => {
    if (!frame || frame.holes.length === 0) return [];
    const n = displayHeap.data.length;
    const geo = heapGeometry(n);
    const byId = new Map(tree.nodes.map((node) => [node.id, node]));
    return frame.holes.flatMap((h: HeapHole) => {
      const parent = byId.get(String(h.parentIndex));
      if (!parent) return [];
      const childIdx =
        h.side === "left" ? 2 * h.parentIndex + 1 : 2 * h.parentIndex + 2;
      const pos = geo.pos(childIdx);
      return [
        {
          x: pos.x,
          y: pos.y,
          from: { x: parent.x, y: parent.y },
        },
      ];
    });
  }, [frame, displayHeap, tree]);

  const changeKind = (next: HeapKind) => {
    if (running) return;
    setKind(next);
    setHeap(emptyHeap(next));
    setQueue([]);
    setSteps(null);
    setMessage(
      next === "min"
        ? "Min-heap: el menor queda en la raíz."
        : "Max-heap: el mayor queda en la raíz.",
    );
    setTone("info");
  };

  const parseOne = () => {
    const n = Number(value);
    if (value.trim() === "" || Number.isNaN(n)) return null;
    return Math.trunc(n);
  };

  const doInsert = () => {
    if (running || queue.length > 0) return;
    const n = parseOne();
    if (n === null) {
      setMessage("Escribe un número entero para insertar.");
      setTone("error");
      return;
    }
    setValue("");
    startedRef.current = null;
    setQueue([n]);
  };

  const insertList = () => {
    if (running || queue.length > 0) return;
    const values = parseList(list);
    if (values.length === 0) {
      setMessage("Escribe una lista de números, por ejemplo: 5, 3, 8, 1, 9.");
      setTone("error");
      return;
    }
    setList("");
    startedRef.current = null;
    setQueue(values);
    setMessage(`Insertando ${values.length} valor(es) uno a uno...`);
    setTone("info");
  };

  const doExtract = () => {
    if (running || queue.length > 0 || heap.data.length === 0) return;
    const { heap: next, steps: frames, top } = heapExtract(heap);
    setSteps(frames);
    setIdx(0);
    setCommit({ kind: "extract", heap: next, top });
  };

  const doRemove = () => {
    if (running || queue.length > 0) return;
    const n = parseOne();
    if (n === null) {
      setMessage("Escribe un número entero para eliminar.");
      setTone("error");
      return;
    }
    if (heap.data.length === 0) {
      setMessage("El montículo está vacío: no hay nada que eliminar.");
      setTone("error");
      return;
    }
    const { heap: next, steps: frames, removed } = heapRemove(heap, n);
    setValue("");
    setSteps(frames);
    setIdx(0);
    setCommit({ kind: "remove", heap: next, value: n, removed });
  };

  const reset = () => {
    if (running) return;
    setHeap(emptyHeap(kind));
    setQueue([]);
    setMessage("Montículo vacío.");
    setTone("info");
  };

  const demo = () => {
    if (running || queue.length > 0) return;
    let h = emptyHeap(kind);
    for (const v of [5, 3, 8, 1, 9, 2]) h = heapInsert(h, v).heap;
    setHeap(h);
    setMessage("Montículo de ejemplo cargado.");
    setTone("info");
  };

  const topLabel = kind === "min" ? "Mínimo" : "Máximo";
  const leaves = heapLeaves(heap);
  const busy = running || queue.length > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Montículo binario"
        description="El valor que manda queda en la raíz: el menor en un min-heap, el mayor en un max-heap. Al insertar, el valor burbujea hacia arriba comparando con su padre; los hijos que no existen se dibujan un instante como nodos nulos. Al extraer, la raíz se reemplaza y el reemplazo se hunde. Un duplicado solo se descubre al llegar a su nodo, así que también se recorre."
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

        <div className="grid gap-4 lg:grid-cols-[auto_auto_1fr]">
          <NumberInput
            label="Un valor"
            value={value}
            onChange={setValue}
            onEnter={doInsert}
            placeholder="7"
          />
          <div className="flex flex-wrap items-end gap-3">
            <Button onClick={doInsert} disabled={busy}>
              Insertar
            </Button>
            <Button
              onClick={doExtract}
              disabled={busy || heap.data.length === 0}
              variant="secondary"
            >
              Extraer {kind === "min" ? "mín." : "máx."}
            </Button>
            <Button
              onClick={doRemove}
              disabled={busy || heap.data.length === 0}
              variant="danger"
            >
              Eliminar
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <TextInput
              label="Una lista"
              value={list}
              onChange={setList}
              onEnter={insertList}
              placeholder="5, 3, 8, 1, 9, 2"
              className="w-full min-w-64"
            />
            <Button onClick={insertList} disabled={busy}>
              Insertar lista
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-black pt-4">
          <SpeedControl value={speed} onChange={setSpeed} />
          <div className="mx-1 hidden h-9 w-px bg-black sm:block" />
          <Button onClick={demo} disabled={busy} variant="secondary">
            Ejemplo
          </Button>
          <Button onClick={reset} disabled={running} variant="danger">
            Vaciar
          </Button>
        </div>

        <div className="mt-4">
          <StatusBar tone={tone}>
            {message}
            {queue.length > 0 ? ` · en cola: ${queue.length}` : ""}
          </StatusBar>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
        <TreeCanvas tree={tree} status={status} ghosts={ghosts} />

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
                <Swatch fill="#a3a3a3" /> Encontrado / comparado
              </li>
              <li>
                <Swatch fill="#ffffff" dashed /> Hijo nulo comprobado
              </li>
              <li>
                <Swatch fill="#a3a3a3" /> Nodo localizado / a eliminar
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

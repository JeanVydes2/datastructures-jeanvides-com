"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TreeCanvas, {
  type NodeStatus,
  type NullHole,
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
  type BstNode,
  type TraversalKind,
  countLeaves,
  countNodes,
  height,
  inorder,
  insert,
  leafValues,
  postorder,
  preorder,
  search,
  traversalTrace,
} from "@/lib/bst";
import { idOf, layout, pathIds } from "@/lib/layout";

/** Un fotograma de animación. */
interface AnimStep {
  /** Nodos en el camino desde la raíz hasta el activo, para pintarlos. */
  pathIds: string[];
  /** Nodo activo en este instante. */
  currentId: string | null;
  /** Estado con que se pinta el nodo activo. */
  currentStatus: NodeStatus;
  /** Mensaje que explica el paso. */
  message: string;
  /** Texto ya impreso por un recorrido (o vacío). */
  output?: string;
  /** Hueco nulo efímero que se dibuja en este paso. */
  nullHole?: NullHole | null;
}

type PendingCommit =
  | { kind: "insert"; root: BstNode; value: number }
  | { kind: "duplicate"; value: number }
  | { kind: "search"; value: number; found: boolean }
  | null;

/** Convierte "800, 1200 1500" en [800, 1200, 1500]. Ignora lo que no sea entero. */
function parseList(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t !== "")
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.trunc(n));
}

export default function BstPage() {
  const [root, setRoot] = useState<BstNode | null>(null);
  const [value, setValue] = useState("");
  const [list, setList] = useState("");
  const [anim, setAnim] = useState<AnimStep[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [commit, setCommit] = useState<PendingCommit>(null);
  const [message, setMessage] = useState(
    "Inserta un valor o pega una lista (separada por comas) para verlos entrar uno a uno.",
  );
  const [tone, setTone] = useState<"info" | "success" | "error">("info");
  const [status, setStatus] = useState<Record<string, NodeStatus>>({});
  const [edgeStatus, setEdgeStatus] = useState<Record<string, "visited">>({});
  const [output, setOutput] = useState("");
  const [outputIds, setOutputIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [speed, setSpeed] = useState<Speed>("normal");

  const running = anim !== null;
  const tree = useMemo(() => layout(root), [root]);
  const stepMs = SPEED_MS[speed];
  // Evita lanzar la inserción en cola dos veces con el mismo estado.
  const startedRef = useRef<string | null>(null);

  // --- Aplica el resultado cuando una animación termina. ---
  useEffect(() => {
    if (!anim) return;
    if (stepIdx < anim.length) {
      const step = anim[stepIdx];
      const st: Record<string, NodeStatus> = {};
      for (const id of step.pathIds) st[id] = "visited";
      if (step.currentId) st[step.currentId] = step.currentStatus;
      for (const id of outputIds) if (!st[id]) st[id] = "output";
      setStatus(st);
      setMessage(step.message);
      setTone("info");
      if (step.output !== undefined) setOutput(step.output);
      if (step.currentStatus === "output" && step.currentId) {
        setOutputIds((prev) =>
          prev.includes(step.currentId!) ? prev : [...prev, step.currentId!],
        );
      }
      const es: Record<string, "visited"> = {};
      for (let i = 1; i < step.pathIds.length; i += 1) {
        es[`${step.pathIds[i - 1]}->${step.pathIds[i]}`] = "visited";
      }
      setEdgeStatus(es);
      const t = setTimeout(() => setStepIdx((i) => i + 1), stepMs);
      return () => clearTimeout(t);
    }

    // Fin de la animación: aplica el cambio pendiente.
    setAnim(null);
    setStepIdx(0);
    if (commit?.kind === "insert") {
      setRoot(commit.root);
      const newId = idOf(commit.root, commit.value);
      setStatus(newId ? { [newId]: "new" } : {});
      setMessage(`Insertado ${commit.value}.`);
      setTone("success");
    } else if (commit?.kind === "duplicate") {
      const dupId = idOf(root, commit.value);
      setStatus(dupId ? { [dupId]: "found" } : {});
      setMessage(
        `${commit.value} ya existe: se descubrió al llegar a su nodo, por eso no se inserta un duplicado.`,
      );
      setTone("error");
    } else if (commit?.kind === "search") {
      const foundId = idOf(root, commit.value);
      if (commit.found && foundId) {
        setStatus({ [foundId]: "found" });
        setMessage(`${commit.value} encontrado.`);
        setTone("success");
      } else {
        setMessage(`${commit.value} no está en el árbol.`);
        setTone("error");
      }
    }
    setCommit(null);
    setEdgeStatus({});
  }, [anim, stepIdx, commit, root, outputIds, stepMs]);

  // --- Procesa la cola: inserta el siguiente valor uno a uno. ---
  useEffect(() => {
    if (running || queue.length === 0) return;
    const key = `${queue.join(",")}|${stepIdx}`;
    if (startedRef.current === key) return;
    startedRef.current = key;

    const [next, ...rest] = queue;
    setQueue(rest);
    // insert() siempre devuelve la traza del descenso; un duplicado solo se
    // descubre al llegar a su nodo, así que también se anima.
    const { root: newRoot, steps, inserted } = insert(root, next);
    const frames: AnimStep[] = steps.map((s) => {
      const visitedIds = s.visited
        .map((v) => idOf(root, v))
        .filter((id): id is string => id !== null);
      return {
        pathIds: visitedIds,
        currentId: s.at === null ? null : idOf(root, s.at),
        currentStatus: "current" as NodeStatus,
        message: s.message,
        nullHole: s.nullHole
          ? { parentId: s.nullHole.parentId, side: s.nullHole.side }
          : null,
      };
    });
    setOutput("");
    setOutputIds([]);
    setEdgeStatus({});
    setStatus({});
    setAnim(frames);
    setStepIdx(0);
    setCommit(
      inserted
        ? { kind: "insert", root: newRoot, value: next }
        : { kind: "duplicate", value: next },
    );
  }, [queue, running, root, stepIdx]);

  const parseOne = () => {
    const n = Number(value);
    if (value.trim() === "" || Number.isNaN(n)) return null;
    return Math.trunc(n);
  };

  const resetVisual = () => {
    setOutput("");
    setOutputIds([]);
    setEdgeStatus({});
  };

  const insertOne = () => {
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
      setMessage("Escribe una lista de números, por ejemplo: 800, 1200, 1500.");
      setTone("error");
      return;
    }
    setList("");
    startedRef.current = null;
    setQueue(values);
    setMessage(`Insertando ${values.length} valor(es) uno a uno...`);
    setTone("info");
  };

  const doSearch = () => {
    if (running || queue.length > 0) return;
    const n = parseOne();
    if (n === null) {
      setMessage("Escribe un número entero para buscar.");
      setTone("error");
      return;
    }
    const res = search(root, n);
    if (res.path.length === 0) {
      setMessage("El árbol está vacío: no hay nada que buscar.");
      setTone("error");
      return;
    }
    resetVisual();
    setValue("");
    setStatus({});
    setAnim(
      res.path.map((v, i) => {
        const isLast = i === res.path.length - 1;
        const hole: NullHole | null =
          isLast && !res.found && res.nullAt
            ? {
                parentId: idOf(root, res.nullAt.value) ?? "R",
                side: res.nullAt.side,
              }
            : null;
        return {
          pathIds: pathIds(root, v),
          currentId: idOf(root, v),
          currentStatus: (v === n ? "found" : "current") as NodeStatus,
          message: res.messages[i] ?? "",
          nullHole: hole,
        };
      }),
    );
    setStepIdx(0);
    setCommit({ kind: "search", value: n, found: res.found });
  };

  const doTraversal = (kind: TraversalKind) => {
    if (running || queue.length > 0) return;
    if (root === null) {
      setMessage("El árbol está vacío.");
      setTone("error");
      return;
    }
    const trace = traversalTrace(root, kind);
    setValue("");
    setStatus({});
    setEdgeStatus({});
    setOutput("");
    setOutputIds([]);
    setAnim(
      trace.map((s) => ({
        pathIds: s.pathIds,
        currentId: s.pathIds[s.pathIds.length - 1] ?? null,
        currentStatus: (s.emit ? "output" : "current") as NodeStatus,
        message: s.message,
        output: s.output.join("  "),
        nullHole: s.nullHole
          ? { parentId: s.nullHole.parentId, side: s.nullHole.side }
          : null,
      })),
    );
    setStepIdx(0);
    setCommit(null);
  };

  const reset = () => {
    if (running) return;
    setRoot(null);
    setQueue([]);
    setStatus({});
    resetVisual();
    setMessage("Árbol vacío.");
    setTone("info");
  };

  const demo = () => {
    if (running || queue.length > 0) return;
    let r: BstNode | null = null;
    for (const v of [50, 30, 70, 20, 40, 60, 80]) r = insert(r, v).root;
    setRoot(r);
    setStatus({});
    resetVisual();
    setMessage("Árbol de ejemplo cargado.");
    setTone("info");
  };

  const busy = running || queue.length > 0;
  // Hueco nulo efímero del fotograma actual: aparece al comprobar y
  // desaparece en el siguiente paso, dando a entender que se visitó.
  const hole: NullHole | null =
    anim && stepIdx < anim.length ? (anim[stepIdx].nullHole ?? null) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Árbol binario de búsqueda"
        description="Menores a la izquierda, mayores a la derecha. Al insertar, el recorrido baja comparando valores hasta hallar un hueco nulo (que se dibuja un instante y desaparece). Un recorrido no empieza por el primer valor que imprime: baja desde la raíz llamando a la izquierda y comprobando cada hijo hasta llegar al extremo, y solo entonces imprime. Un duplicado solo se descubre al llegar a su nodo, así que también se recorre."
      />

      <Card className="mb-6">
        <div className="grid gap-4 lg:grid-cols-[auto_auto_1fr]">
          <NumberInput
            label="Un valor"
            value={value}
            onChange={setValue}
            onEnter={insertOne}
            placeholder="42"
          />
          <div className="flex items-end gap-3">
            <Button onClick={insertOne} disabled={busy}>
              Insertar
            </Button>
            <Button onClick={doSearch} disabled={busy} variant="secondary">
              Buscar
            </Button>
          </div>
          <div className="flex items-end gap-3">
            <TextInput
              label="Una lista"
              value={list}
              onChange={setList}
              onEnter={insertList}
              placeholder="800, 1200, 1500, 2300, 3100"
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
          <Button
            onClick={() => doTraversal("inorder")}
            disabled={busy}
            variant="secondary"
          >
            Inorden
          </Button>
          <Button
            onClick={() => doTraversal("preorder")}
            disabled={busy}
            variant="secondary"
          >
            Preorden
          </Button>
          <Button
            onClick={() => doTraversal("postorder")}
            disabled={busy}
            variant="secondary"
          >
            Postorden
          </Button>
          <div className="mx-1 hidden h-9 w-px bg-black sm:block" />
          <Button onClick={demo} disabled={busy} variant="secondary">
            Ejemplo
          </Button>
          <Button onClick={reset} disabled={running} variant="danger">
            Vaciar
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <StatusBar tone={tone}>{message}</StatusBar>
          <div className="flex min-w-64 flex-col justify-center border-2 border-black bg-white px-4 py-2">
            <span className="text-[10px] font-bold tracking-[0.2em] text-black/60 uppercase">
              Salida {queue.length > 0 ? `· en cola: ${queue.length}` : ""}
            </span>
            <span className="font-mono text-sm font-bold break-words text-black">
              {output || "—"}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
        <TreeCanvas
          tree={tree}
          status={status}
          edgeStatus={edgeStatus}
          nullHole={hole}
        />

        <div className="space-y-6">
          <Card>
            <CardTitle>Métricas</CardTitle>
            <dl className="mt-3 space-y-2">
              <MetricRow label="Altura" value={height(root)} />
              <MetricRow label="Hojas" value={countLeaves(root)} />
              <MetricRow label="Nodos" value={countNodes(root)} />
            </dl>
            <p className="mt-3 text-xs text-black/60">
              Hojas: {leafValues(root).join(", ") || "—"}
            </p>
          </Card>

          <Card>
            <CardTitle>Recorridos</CardTitle>
            <div className="mt-3 space-y-3">
              <TraversalRow label="Inorden" values={inorder(root)} />
              <TraversalRow label="Preorden" values={preorder(root)} />
              <TraversalRow label="Postorden" values={postorder(root)} />
            </div>
          </Card>

          <Card>
            <CardTitle>Leyenda</CardTitle>
            <ul className="mt-3 space-y-2 text-xs text-black">
              <li>
                <Swatch fill="#ffffff" /> Normal
              </li>
              <li>
                <Swatch fill="#d4d4d4" /> En el camino
              </li>
              <li>
                <Swatch fill="#000000" /> Activo / comparando
              </li>
              <li>
                <Swatch fill="#a3a3a3" /> Encontrado
              </li>
              <li>
                <Swatch fill="#ffffff" dashed /> Hueco nulo comprobado
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TraversalRow({ label, values }: { label: string; values: number[] }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[0.2em] text-black/60 uppercase">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xs leading-relaxed break-words text-black">
        {values.length ? values.join(" → ") : "—"}
      </div>
    </div>
  );
}

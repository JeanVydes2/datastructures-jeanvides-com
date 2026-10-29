import Link from "next/link";
import { Card } from "@/components/ui";

const CARDS = [
  {
    href: "/bst",
    title: "Árbol binario de búsqueda",
    desc: "Inserta valores y observa el recorrido hasta el hueco. Busca un nodo resaltando el camino y ejecuta los recorridos inorden, preorden y postorden, viendo cómo bajan desde la raíz antes de imprimir.",
    num: "01",
  },
  {
    href: "/heap",
    title: "Montículo (min y max)",
    desc: "Inserta y extrae siguiendo el burbujeo hacia arriba y hacia abajo, con la propiedad de montículo visible en cada paso.",
    num: "02",
  },
  {
    href: "/graph",
    title: "Grafos",
    desc: "Dirigido o no, ponderado o no. BFS, DFS, Dijkstra, camino más corto, orden topológico, componentes, bipartito, matriz y lista de adyacencia.",
    num: "03",
  },
  {
    href: "/hash",
    title: "Tabla hash",
    desc: "Pares clave-valor con sondeo lineal, cuadrático, doble hash o encadenamiento. Colisiones, lápidas, factor de carga y redimensionado.",
    num: "04",
  },
  {
    href: "/sets",
    title: "Conjuntos y diccionarios",
    desc: "Ambos sobre una tabla hash. Unión, intersección, diferencia, subconjunto y pertenencia; y un diccionario clave→valor.",
    num: "05",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 border-b-2 border-black pb-6">
        <p className="text-xs font-bold tracking-[0.3em] text-black/60 uppercase">
          Visualizador interactivo
        </p>
        <h1 className="mt-3 font-mono text-5xl leading-none font-bold tracking-tight text-black uppercase">
          Estructuras
          <br />
          de datos
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-black/70">
          Estudia cómo se construyen y se recorren las estructuras de datos paso
          a paso. Elige una estructura en la barra lateral para empezar.
        </p>
      </header>

      <div className="grid gap-0 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="group block">
            <Card className="h-full transition-colors duration-150 group-hover:bg-black group-hover:text-white">
              <span className="font-mono text-xs text-black/40 group-hover:text-white/50">
                {c.num}
              </span>
              <h2 className="mt-2 text-base font-bold text-black uppercase group-hover:text-white">
                {c.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-black/70 group-hover:text-white/80">
                {c.desc}
              </p>
              <span className="mt-4 inline-block border-b-2 border-black text-xs font-bold tracking-wider uppercase group-hover:border-white group-hover:text-white">
                Abrir →
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

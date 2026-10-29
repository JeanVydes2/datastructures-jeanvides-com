"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Iconos SVG en línea, en blanco y negro, sin emojis. */
function IconHome() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function IconTree() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="12" cy="4.5" r="2.2" />
      <circle cx="5.5" cy="19" r="2.2" />
      <circle cx="18.5" cy="19" r="2.2" />
      <path d="M12 6.7 6.7 16.9" />
      <path d="M12 6.7 17.3 16.9" />
    </svg>
  );
}

function IconSet() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="9.5" cy="12" r="6" />
      <circle cx="14.5" cy="12" r="6" />
    </svg>
  );
}

function IconHash() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M9 3 7 21" />
      <path d="M17 3l-2 18" />
      <path d="M3.5 8.5h17" />
      <path d="M2.5 15.5h17" />
    </svg>
  );
}

function IconGraph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="5" cy="6" r="2.4" />
      <circle cx="19" cy="6" r="2.4" />
      <circle cx="12" cy="18" r="2.4" />
      <path d="M7.2 6h9.6" />
      <path d="M6.6 8 10.8 15.8" />
      <path d="M17.4 8 13.2 15.8" />
    </svg>
  );
}

function IconHeap() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M12 3.5 3.5 20.5h17L12 3.5Z" />
      <path d="M12 3.5v17" />
      <path d="M7.8 12h8.4" />
    </svg>
  );
}

const LINKS = [
  { href: "/", label: "Inicio", short: "Inicio", Icon: IconHome },
  { href: "/bst", label: "Árbol de búsqueda", short: "Árbol", Icon: IconTree },
  { href: "/heap", label: "Montículo", short: "Montículo", Icon: IconHeap },
  { href: "/graph", label: "Grafos", short: "Grafos", Icon: IconGraph },
  { href: "/hash", label: "Tabla hash", short: "Hash", Icon: IconHash },
  { href: "/sets", label: "Conjuntos", short: "Conjuntos", Icon: IconSet },
];

/**
 * Navegación de la aplicación. En móvil es una barra horizontal con scroll en
 * la parte de arriba; a partir de `md` pasa a ser una columna fija a la
 * izquierda. Se usa un solo DOM para no duplicar enlaces ni estados.
 */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-20 flex w-full shrink-0 flex-row items-stretch border-b-2 border-black bg-white md:h-screen md:w-60 md:flex-col md:border-r-2 md:border-b-0">
      {/* Cabecera: solo en la columna de escritorio. */}
      <div className="hidden border-b-2 border-black px-4 py-5 md:block">
        <p className="font-mono text-xl leading-none font-bold text-black">
          DS/
        </p>
        <p className="mt-1 text-[10px] tracking-[0.25em] text-black/60 uppercase">
          Estructuras de datos
        </p>
      </div>

      {/* En móvil, una marca compacta a la izquierda de la barra. */}
      <Link
        href="/"
        className="flex shrink-0 items-center border-r-2 border-black px-3 font-mono text-sm leading-none font-bold md:hidden"
        aria-label="Inicio"
      >
        DS/
      </Link>

      <nav className="flex min-w-0 flex-1 flex-row overflow-x-auto md:flex-col md:overflow-x-visible">
        {LINKS.map(({ href, label, short, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 border-r border-black px-3 py-3 text-[11px] font-bold tracking-wider whitespace-nowrap uppercase transition-colors duration-150 md:gap-3 md:border-r-0 md:border-b md:px-4 md:text-xs ${
                active
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 shrink-0 border ${
                  active ? "border-white bg-white" : "border-black bg-transparent"
                }`}
                aria-hidden
              />
              <Icon />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </Link>
          );
        })}
      </nav>

      {/* Pie: solo en la columna de escritorio. */}
      <div className="hidden border-t-2 border-black px-4 py-3 md:block">
        <p className="text-[10px] tracking-wider text-black/50 uppercase">
          jeanvides.com
        </p>
      </div>
    </aside>
  );
}

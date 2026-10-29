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
  { href: "/", label: "Inicio", Icon: IconHome },
  { href: "/bst", label: "Árbol", Icon: IconTree },
  { href: "/heap", label: "Montículo", Icon: IconHeap },
];

/** Barra lateral monocroma con las páginas de la aplicación. */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r-2 border-black bg-white">
      <div className="border-b-2 border-black px-4 py-5">
        <p className="font-mono text-xl leading-none font-bold text-black">
          DS/
        </p>
        <p className="mt-1 text-[10px] tracking-[0.25em] text-black/60 uppercase">
          Estructuras de datos
        </p>
      </div>

      <nav className="flex flex-1 flex-col">
        {LINKS.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 border-b border-black px-4 py-3 text-xs font-bold tracking-wider uppercase transition-colors duration-150 ${
                active
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 border ${
                  active ? "border-white bg-white" : "border-black bg-transparent"
                }`}
                aria-hidden
              />
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t-2 border-black px-4 py-3">
        <p className="text-[10px] tracking-wider text-black/50 uppercase">
          jeanvides.com
        </p>
      </div>
    </aside>
  );
}

import type { ReactNode } from "react";

/**
 * Envuelve contenido que puede ser más ancho que la pantalla (tablas con el
 * tamaño mínimo de sus celdas, por ejemplo) y le da su propio scroll
 * horizontal. Así el resto de la página no se desplaza de lado en móvil.
 */
export function ScrollArea({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`-mx-1 overflow-x-auto px-1 ${className}`}>
      <div className="min-w-max">{children}</div>
    </div>
  );
}

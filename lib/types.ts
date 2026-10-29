// Tipos compartidos por las visualizaciones.

/** Un nodo ya posicionado, listo para dibujar. */
export interface VisualNode {
  /** Identificador estable dentro del árbol. */
  id: string;
  /** Texto que se muestra dentro del nodo. */
  label: string;
  /** Coordenada X del centro del nodo, en unidades de dibujo. */
  x: number;
  /** Coordenada Y del centro del nodo, en unidades de dibujo. */
  y: number;
}

/** Una arista entre dos nodos, por identificador. */
export interface VisualEdge {
  from: string;
  to: string;
}

/** Un árbol listo para dibujar: nodos, aristas y tamaño del lienzo. */
export interface VisualTree {
  nodes: VisualNode[];
  edges: VisualEdge[];
  width: number;
  height: number;
}

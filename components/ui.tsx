import type { ReactNode } from "react";

/** Encabezado de página. */
export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 border-b-2 border-black pb-4">
      <h1 className="font-mono text-3xl font-bold tracking-tight text-black uppercase">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/70">
        {description}
      </p>
    </header>
  );
}

/** Tarjeta con borde negro grueso, sin sombra ni redondeo. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-2 border-black bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

/** Título de sección, en versalitas separadas. */
export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-b border-black pb-2 text-xs font-bold tracking-[0.2em] text-black uppercase">
      {children}
    </h2>
  );
}

/** Mensaje de estado de la operación en curso. */
export function StatusBar({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error";
}) {
  const tones = {
    info: "bg-white text-black",
    success: "bg-black text-white",
    error: "bg-white text-black border-dashed",
  } as const;
  return (
    <div
      className={`min-h-12 border-2 border-black px-4 py-3 text-sm leading-relaxed font-medium ${tones[tone]}`}
      role="status"
      aria-live="polite"
    >
      <span className="mr-2 font-bold" aria-hidden>
        {tone === "error" ? "!" : tone === "success" ? "=" : ">"}
      </span>
      {children}
    </div>
  );
}

/** Botón monocromo: negro macizo, contorno o discontinuo. */
export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "sky" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const variants = {
    primary: "bg-black text-white hover:bg-neutral-800",
    sky: "bg-black text-white hover:bg-neutral-800",
    secondary: "bg-white text-black hover:bg-black hover:text-white",
    danger: "bg-white text-black border-dashed hover:bg-black hover:text-white",
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`border-2 border-black px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Campo de entrada numérico. */
export function NumberInput({
  value,
  onChange,
  onEnter,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-[0.2em] text-black uppercase">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
        }}
        placeholder={placeholder}
        className="w-32 border-2 border-black bg-white px-3 py-2 font-mono text-sm text-black outline-none placeholder:text-neutral-400 focus:bg-black focus:text-white focus:placeholder:text-neutral-500"
      />
    </label>
  );
}

/** Cuadrado de muestra para las leyendas, distinguiendo estados por relleno. */
export function Swatch({ fill, dashed }: { fill: string; dashed?: boolean }) {
  return (
    <span
      className="mr-2 inline-block h-3.5 w-3.5 border-2 border-black align-middle"
      style={{
        backgroundColor: fill,
        borderStyle: dashed ? "dashed" : "solid",
      }}
    />
  );
}

/** Fila etiqueta/valor de las tarjetas de métricas. */
export function MetricRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dotted border-neutral-400 pb-1">
      <dt className="text-xs tracking-wider text-black uppercase">{label}</dt>
      <dd className="font-mono text-sm font-bold text-black">{value}</dd>
    </div>
  );
}

/** Campo de texto libre (para listas de valores). */
export function TextInput({
  value,
  onChange,
  onEnter,
  placeholder,
  label,
  className = "w-64",
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-[0.2em] text-black uppercase">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
        }}
        placeholder={placeholder}
        className={`border-2 border-black bg-white px-3 py-2 font-mono text-sm text-black outline-none placeholder:text-neutral-400 focus:bg-black focus:text-white focus:placeholder:text-neutral-500 ${className}`}
      />
    </label>
  );
}

/** Escalas de velocidad de la animación. */
export type Speed = "slow" | "normal" | "fast";

/** Milisegundos por fotograma para cada velocidad. */
export const SPEED_MS: Record<Speed, number> = {
  slow: 1200,
  normal: 700,
  fast: 260,
};

/** Selector de velocidad: lento, normal, rápido. */
export function SpeedControl({
  value,
  onChange,
  disabled,
}: {
  value: Speed;
  onChange: (s: Speed) => void;
  disabled?: boolean;
}) {
  const options: { key: Speed; label: string }[] = [
    { key: "slow", label: "Lento" },
    { key: "normal", label: "Normal" },
    { key: "fast", label: "Rápido" },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-[0.2em] text-black uppercase">
        Velocidad
      </span>
      <div className="inline-flex border-2 border-black">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            disabled={disabled}
            className={`px-3 py-2 text-[10px] font-bold tracking-wider uppercase transition-colors duration-150 disabled:opacity-40 ${
              value === o.key
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-neutral-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
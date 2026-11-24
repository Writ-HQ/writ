import type { ReactNode } from "react";

// The dashboard's building blocks: page title, framed cards, deltas, a
// segmented control and a ruled table. Quiet greys, one accent blue for
// data and the selected state, green and red only for change.

export function PageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[14px] leading-[1.55] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  hint,
  action,
  children,
  flush = false,
  className = "",
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  /** No inner padding: for tables that run edge to edge. */
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] ${className}`}>
      {title && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {hint && <p className="mt-0.5 text-[12.5px] leading-[1.5] text-muted">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={flush ? "" : `px-5 ${title ? "pb-5" : "py-5"}`}>{children}</div>
    </section>
  );
}

/** A change against the period before. Up is good unless `invert`. */
export function Delta({ value, invert = false, percent = true }: { value: number | null; invert?: boolean; percent?: boolean }) {
  if (value == null || !isFinite(value)) return null;
  const good = invert ? value < 0 : value >= 0;
  const shown = percent ? `${Math.abs(Math.round(value * 100))}%` : Math.abs(Math.round(value * 10) / 10).toString();
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12.5px] font-medium tabular-nums ${good ? "text-good" : "text-bad"}`}>
      {value >= 0 ? "↑" : "↓"}
      {shown}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  dots = [],
  dotLabel,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  /** Options to mark with a dot: there is something under them. */
  dots?: T[];
  dotLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-panel p-0.5 ring-1 ring-line/70">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={o.key === value}
          onClick={() => onChange(o.key)}
          className={`relative h-7 rounded-md px-2.5 text-[12.5px] transition-colors ${
            o.key === value ? "bg-white font-medium shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
          {dots.includes(o.key) && o.key !== value && (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-accent-bright" aria-label={dotLabel} />
          )}
        </button>
      ))}
    </div>
  );
}

/** A ruled table; scrolls sideways inside its card on narrow screens. */
export function DataTable({
  head,
  rows,
  align,
  minWidth = 520,
}: {
  head: string[];
  rows: ReactNode[][];
  align?: ("left" | "right")[];
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                className={`border-y border-line/70 bg-panel px-5 py-2.5 text-[12.5px] font-medium text-muted ${align?.[i] === "right" ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/70 last:border-b-0 hover:bg-panel">
              {r.map((c, j) => (
                <td key={j} className={`px-5 py-3 text-[13.5px] text-ink/80 ${align?.[j] === "right" ? "text-right tabular-nums" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A 16px line icon on a 16-unit grid; `vb` for one drawn on a larger grid. */
export function Glyph({ d, vb = 16, className = "size-4 shrink-0" }: { d: string; vb?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${vb} ${vb}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={(1.3 * vb) / 16}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

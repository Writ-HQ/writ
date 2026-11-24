import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

// The dashboard's building blocks: page title, soft cards, change pills, a
// segmented control and small helpers. White cards on a hairline ring,
// the accent blue for data, green and red only for change.

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
  className = "",
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-[20px] bg-white p-5 ring-1 ring-line/80 shadow-[0_1px_0_rgb(15_23_42/0.02),0_10px_30px_-18px_rgb(15_23_42/0.14)] ${className}`}
    >
      {title && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[14.5px] font-semibold tracking-[-0.005em]">{title}</h2>
            {hint && <p className="mt-0.5 text-[12.5px] leading-[1.5] text-muted">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** A quiet "see all" link for a card's corner. */
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12.5px] font-medium text-accent hover:bg-accent-soft"
    >
      {children}
      <Glyph className="size-3 transition-transform group-hover:translate-x-0.5" d="M6 3.5L10.5 8 6 12.5" />
    </Link>
  );
}

/** A change against the period before, as a pill. Up is good unless `invert`. */
export function Delta({ value, invert = false, percent = true }: { value: number | null; invert?: boolean; percent?: boolean }) {
  if (value == null || !isFinite(value)) return null;
  const flat = percent ? Math.abs(value) < 0.005 : Math.abs(value) < 0.05;
  const good = invert ? value < 0 : value >= 0;
  const shown = percent ? `${Math.abs(Math.round(value * 100))}%` : Math.abs(Math.round(value * 10) / 10).toString();
  const tone = flat ? "bg-panel text-muted" : good ? "bg-good/10 text-good" : "bg-bad/10 text-bad";
  return (
    <span className={`inline-flex h-[22px] items-center gap-0.5 rounded-full px-2 text-[12px] font-medium tabular-nums ${tone}`}>
      {!flat && (
        <Glyph className="size-3" d={value >= 0 ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} />
      )}
      {shown}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-chrome p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={o.key === value}
          onClick={() => onChange(o.key)}
          className={`h-7 rounded-full px-3 text-[12.5px] transition-colors ${
            o.key === value ? "bg-white font-medium text-ink shadow-[0_1px_3px_rgb(15_23_42/0.12)]" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Initials in a tinted circle, for the person a case is assigned to. */
export function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .replace(/[^\p{L}]/gu, "")
    .slice(0, 2);
  return (
    <span
      title={name}
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-deep ring-2 ring-white"
    >
      {letters}
    </span>
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

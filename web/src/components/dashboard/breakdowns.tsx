"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { issues, sources, starredIssues, starredSources, type BreakdownDef, type IssueKey, type Metric, type SourceKey, type Totals } from "./data";
import { Glyph, Segmented } from "./kit";
import { useStored } from "./use-stored";

// Breakdown cards under the chart: cases by issue and contacts by source.
// Each row is drawn over a bar sized to its share, with the change against
// the period before.

type Filter = "all" | "growing" | "falling";
type Row = { key: string; cur: number; prev: number | null };

function buildRows(defs: readonly BreakdownDef[], cur: Totals, prev: Totals | null, metric: Metric): Row[] {
  const sw = defs.reduce((a, d) => a + d.share * d.growth, 0);
  const sp = defs.reduce((a, d) => a + d.share, 0);
  return defs.map((d) => ({
    key: d.key,
    cur: Math.round(cur[metric] * ((d.share * d.growth) / sw)),
    prev: prev ? Math.round(prev[metric] * (d.share / sp)) : null,
  }));
}

const change = (r: Row) => (r.prev ? (r.cur - r.prev) / r.prev : null);

function Change({ v }: { v: number | null }) {
  if (v == null) return null;
  if (Math.abs(v) < 0.005) return <span className="text-[12px] text-faint">0%</span>;
  return (
    <span className={`text-[12px] font-medium tabular-nums ${v > 0 ? "text-good" : "text-bad"}`}>
      {v > 0 ? "↑" : "↓"}
      {Math.round(Math.abs(v) * 100)}%
    </span>
  );
}

function MetricPicker({ value, options, onChange }: { value: Metric; options: Metric[]; onChange: (m: Metric) => void }) {
  const t = useTranslations("Dashboard.breakdown.metrics");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  if (options.length < 2) {
    return <span className="px-1.5 text-[13px] font-medium text-accent">{t(value)}</span>;
  }
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[13px] font-medium text-accent hover:bg-accent-soft"
      >
        {t(value)}
        <Glyph className="size-3" d="M4 6l4 4 4-4" />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-1 w-36 rounded-xl border border-line bg-white p-1 shadow-[0_12px_32px_-12px_rgb(15_23_42/0.25)]">
          {options.map((m) => (
            <button
              key={m}
              type="button"
              role="menuitemradio"
              aria-checked={m === value}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-panel ${m === value ? "font-medium text-accent-deep" : "text-ink/75"}`}
            >
              {t(m)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const LIMIT = 8;

function BreakdownCard({
  title,
  note,
  defs,
  labels,
  metrics,
  cur,
  prev,
  starKey,
  starred,
}: {
  title: string;
  note?: string;
  defs: readonly BreakdownDef[];
  /** The name shown for a row's key. */
  labels: (key: string) => string;
  metrics: Metric[];
  cur: Totals;
  prev: Totals | null;
  /** Stars are kept per viewer in browser storage under this key. */
  starKey: string;
  starred: readonly string[];
}) {
  const t = useTranslations("Dashboard.breakdown");
  const format = useFormatter();
  const [filter, setFilter] = useState<Filter>("all");
  const [metric, setMetric] = useState<Metric>(metrics[0]!);
  const [saved, setSaved] = useStored(`writ-stars-${starKey}`);
  const stars = useMemo(() => {
    try {
      return saved ? (JSON.parse(saved) as string[]) : starred;
    } catch {
      return starred;
    }
  }, [saved, starred]);
  const toggleStar = (k: string) =>
    setSaved(JSON.stringify(stars.includes(k) ? stars.filter((x) => x !== k) : [...stars, k]));

  const all = buildRows(defs, cur, prev, metric);
  const matches = (r: Row, f: Filter) => {
    if (f === "all") return true;
    const c = change(r);
    if (c == null) return false;
    return f === "growing" ? c > 0.005 : c < -0.005;
  };
  const dots = (["growing", "falling"] as Filter[]).filter((f) => all.some((r) => matches(r, f)));
  const rows = all.filter((r) => matches(r, filter)).sort((a, b) => b.cur - a.cur);
  const shown = rows.slice(0, LIMIT);
  const top = Math.max(...rows.map((r) => r.cur), 0);

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 pt-4 pb-3">
        <h2 className="flex items-center gap-1.5 text-[15px] font-semibold">
          {title}
          {note && (
            <span className="group/note relative flex">
              <span
                tabIndex={0}
                aria-label={note}
                className="flex size-4 cursor-help items-center justify-center rounded-full border border-ink/25 text-[10px] font-semibold text-faint"
              >
                i
              </span>
              <span
                role="tooltip"
                className="pointer-events-none absolute top-6 -left-2 z-20 w-60 rounded-lg bg-ink px-3 py-2 text-[12px] leading-[1.5] font-normal text-white opacity-0 shadow-lg transition-opacity group-focus-within/note:opacity-100 group-hover/note:opacity-100"
              >
                {note}
              </span>
            </span>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label={t("show")}
            value={filter}
            options={(["all", "growing", "falling"] as Filter[]).map((k) => ({ key: k, label: t(k) }))}
            dots={dots}
            dotLabel={t("hasItems")}
            onChange={setFilter}
          />
          <MetricPicker value={metric} options={metrics} onChange={setMetric} />
        </div>
      </div>

      <ul className="mb-3 flex h-[316px] flex-col gap-1 overflow-hidden px-3">
        {shown.length === 0 && (
          <li className="px-2 py-6 text-center text-[13px] text-faint">{filter === "growing" ? t("nothingGrowing") : t("nothingFalling")}</li>
        )}
        {shown.map((r) => {
          const on = stars.includes(r.key);
          const label = labels(r.key);
          return (
            <li key={r.key} className="group relative flex h-9 shrink-0 items-center gap-3 rounded-lg px-2 hover:bg-panel">
              {/* The bar runs up to the numbers, never under them. */}
              <span className="absolute inset-y-0 right-[7rem] left-0" aria-hidden="true">
                <span
                  className="block h-full rounded-lg bg-accent-soft transition-[width] duration-500"
                  style={{ width: `${Math.max(top ? r.cur / top : 0, 0.02) * 100}%` }}
                />
              </span>
              <span className="relative flex min-w-0 flex-1 items-center gap-2.5">
                <span className="truncate text-[13.5px] text-ink/85">{label}</span>
                <button
                  type="button"
                  onClick={() => toggleStar(r.key)}
                  aria-pressed={on}
                  aria-label={on ? t("unstar", { name: label }) : t("star", { name: label })}
                  className={`-m-1 shrink-0 rounded-md p-1 transition-colors ${
                    on ? "text-star" : "text-ink/25 opacity-0 group-hover:opacity-100 hover:text-star focus-visible:opacity-100"
                  }`}
                >
                  <svg className="size-3.5" viewBox="0 0 16 16" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
                  </svg>
                </button>
              </span>
              <span className="relative flex w-[6.25rem] shrink-0 items-baseline justify-end gap-2">
                <span className="text-[13.5px] font-medium tabular-nums">{format.number(r.cur)}</span>
                <span className="w-12 text-right">
                  <Change v={change(r)} />
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The two cards, for the period's totals and the period before. */
export function Breakdowns({ cur, prev }: { cur: Totals; prev: Totals | null }) {
  const t = useTranslations("Dashboard.breakdown");
  const d = useTranslations("Dashboard");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BreakdownCard
        title={t("issuesTitle")}
        note={t("issuesNote")}
        defs={issues}
        labels={(k) => d(`issues.${k as IssueKey}`)}
        metrics={["opened", "resolved"]}
        cur={cur}
        prev={prev}
        starKey="issues"
        starred={starredIssues}
      />
      <BreakdownCard
        title={t("sourcesTitle")}
        defs={sources}
        labels={(k) => d(`sources.${k as SourceKey}`)}
        metrics={["contacts"]}
        cur={cur}
        prev={prev}
        starKey="sources"
        starred={starredSources}
      />
    </div>
  );
}

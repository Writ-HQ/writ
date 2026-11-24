"use client";

import { useFormatter, useTranslations, type DateTimeFormatOptions } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";

import { newsletters, type Metric } from "./data";
import { Glyph } from "./kit";
import type { Grain, Point } from "./range";

// The accent, as literals because SVG attributes need values. They match
// --color-accent and --color-accent-bright in globals.css.
const LINE = "#2c6a8f";
const FILL = "#9dcfeb";
const H = 280;
const PAD = { top: 12, right: 8, bottom: 28, left: 44 };
const DRAW_MS = 1000;

/** A round top for the scale, split into four equal steps. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const raw = v / 4;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((c) => c * exp).find((c) => c >= raw) ?? 10 * exp;
  return step * 4;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver((entries) => setW(entries[0]?.contentRect.width ?? 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** 0 → 1 once per mount, so the line draws in from the left. */
function useDrawIn() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setP(1));
      return () => cancelAnimationFrame(raf);
    }
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(Math.max((t - t0) / DRAW_MS, 0), 1);
      setP(1 - (1 - k) ** 3);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return p;
}

const utc = (iso: string) => new Date(iso + "T00:00:00Z");

/**
 * One metric over the range: a solid line for this period and a dashed
 * one for the period before, on dashed gridlines, with newsletters marked
 * on the baseline.
 */
export function Chart({
  days,
  prev,
  metric,
  grain,
  label,
}: {
  days: Point[];
  prev: (Point | null)[];
  metric: Metric;
  grain: Grain;
  /** The period's name in the legend, such as "28 days". */
  label: string;
}) {
  const t = useTranslations("Dashboard");
  const format = useFormatter();
  const [box, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const p = useDrawIn();
  const [hover, setHover] = useState<number | null>(null);

  const date = (iso: string, o: DateTimeFormatOptions) => format.dateTime(utc(iso), { ...o, timeZone: "UTC" });
  const value = (v: number) => (metric === "days" ? format.number(v, { maximumFractionDigits: 1 }) : format.number(Math.round(v)));

  const cur = days.map((d) => d[metric]);
  const old = prev.map((d) => (d ? d[metric] : null));
  const all = [...cur, ...old.filter((v): v is number => v != null)];
  const hi = niceMax(Math.max(...all, 1));
  const ticks = [0, 1, 2, 3, 4].map((i) => (hi * i) / 4);

  const iw = Math.max(width - PAD.left - PAD.right, 10);
  const ih = H - PAD.top - PAD.bottom;
  const n = days.length;
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * iw : iw / 2);
  const y = (v: number) => PAD.top + (1 - v / hi) * ih;
  const line = (vals: (number | null)[]) =>
    vals
      .map((v, i) => (v == null ? "" : `${i && vals[i - 1] != null ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`))
      .join("");
  const base = PAD.top + ih;
  const curPath = line(cur);
  const area = `${curPath}L${x(n - 1)} ${base}L${x(0)} ${base}Z`;
  const long = n > 1 && Date.parse(days[n - 1]!.date) - Date.parse(days[0]!.date) > 120 * 86_400_000;

  // Which buckets get a date under them.
  const room = Math.max(3, Math.floor(iw / 80));
  const step = Math.max(1, Math.ceil(n / room));
  const sent = newsletters
    .map((d) => ({ date: d, i: days.findIndex((pt) => pt.date <= d && d <= pt.end) }))
    .filter((u) => u.i >= 0)
    // One mark per bucket.
    .filter((u, j, list) => list.findIndex((o) => o.i === u.i) === j);

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - PAD.left) / iw) * (n - 1));
    setHover(Math.min(Math.max(i, 0), n - 1));
  };

  const axisDate = (iso: string) =>
    grain === "month" || long ? date(iso, { month: "short", year: "2-digit" }) : date(iso, { month: "short", day: "numeric" });
  const bucketDate = (pt: Point) =>
    grain === "day"
      ? date(pt.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
      : `${date(pt.date, { month: "short", day: "numeric" })} – ${date(pt.end, { month: "short", day: "numeric", year: "numeric" })}`;

  const saveImage = () => {
    if (!svgRef.current) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgRef.current)], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `writ-${metric}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div ref={box} className="relative" style={{ height: H }}>
        {width > 0 && (
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={H}
            className="block touch-none select-none"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={t("chart.label", { metric: t(`metrics.${metric}`), period: label })}
          >
            <defs>
              <linearGradient id="dc-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={FILL} stopOpacity="0.55" />
                <stop offset="1" stopColor={FILL} stopOpacity="0.03" />
              </linearGradient>
              <clipPath id="dc-clip">
                <rect x="0" y="0" width={PAD.left + iw * p + 2} height={H} />
              </clipPath>
            </defs>

            {ticks.map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + iw} y1={y(v)} y2={y(v)} stroke="#e8ecef" strokeDasharray="4 4" />
                <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" fill="#737373" fontSize="12">
                  {format.number(v, { notation: "compact", maximumFractionDigits: 1 })}
                </text>
              </g>
            ))}

            {days.map((d, i) =>
              i % step === 0 ? (
                <text key={d.date} x={x(i)} y={H - 8} textAnchor={x(i) > PAD.left + iw - 24 ? "end" : "middle"} fill="#737373" fontSize="12">
                  {axisDate(d.date)}
                </text>
              ) : null,
            )}

            <g clipPath="url(#dc-clip)">
              <path d={area} fill="url(#dc-fill)" />
              <path d={line(old)} fill="none" stroke={LINE} strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="5 4" />
              <path d={curPath} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
              {n <= 14 && cur.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="white" stroke={LINE} strokeWidth="1.75" />)}
            </g>

            {sent.map((u) => (
              <g key={u.date} transform={`translate(${x(u.i)} ${base})`}>
                <title>{t("chart.newsletterOn", { date: date(u.date, { month: "long", day: "numeric" }) })}</title>
                <circle r="8.5" fill="white" stroke="#dfe5ea" />
                <path d="M-4 -2.5h8v5.5h-8zM-4 -2.5l4 3 4-3" fill="none" stroke={LINE} strokeWidth="1.1" strokeLinejoin="round" />
              </g>
            ))}

            {hover != null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={base} stroke="#d4d4d8" />
                <circle cx={x(hover)} cy={y(cur[hover]!)} r="4" fill="white" stroke={LINE} strokeWidth="2" />
              </g>
            )}
          </svg>
        )}

        {hover != null && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-52 rounded-xl border border-line bg-white px-3.5 py-3 text-[13px] shadow-[0_8px_24px_-8px_rgb(15_23_42/0.18)]"
            style={{ left: Math.min(Math.max(x(hover) - 104, 0), width - 208) }}
          >
            <p className="text-[12px] text-muted">{bucketDate(days[hover]!)}</p>
            <p className="mt-1.5 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ink/70">
                <span className="h-0.5 w-3 rounded-full" style={{ background: LINE }} />
                {t("chart.thisPeriod")}
              </span>
              <span className="font-medium tabular-nums">{value(cur[hover]!)}</span>
            </p>
            {old[hover] != null && (
              <p className="mt-1 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-ink/70">
                  <span className="w-3 border-t-[1.5px] border-dashed" style={{ borderColor: LINE }} />
                  {date(prev[hover]!.date, { month: "short", day: "numeric" })}
                </span>
                <span className="text-ink/70 tabular-nums">{value(old[hover]!)}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-muted">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 rounded-full" style={{ background: LINE }} />
            {label}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 border-t-[1.5px] border-dashed" style={{ borderColor: LINE }} />
            {t("chart.periodBefore")}
          </span>
          {sent.length > 0 && (
            <span className="flex items-center gap-2">
              <svg viewBox="-9 -9 18 18" className="size-4" aria-hidden="true">
                <circle r="8.5" fill="white" stroke="#d4d4d8" />
                <path d="M-4 -2.5h8v5.5h-8zM-4 -2.5l4 3 4-3" fill="none" stroke={LINE} strokeWidth="1.1" strokeLinejoin="round" />
              </svg>
              {t("chart.newsletter")}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={saveImage}
          title={t("chart.saveImage")}
          aria-label={t("chart.saveImage")}
          className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel hover:text-ink"
        >
          <Glyph vb={20} className="size-[18px]" d="M3.5 4.5h13v11h-13zM3.5 13l4-4 3 3 2-2 4 4M12.5 7.5h.01" />
        </button>
      </div>
    </div>
  );
}

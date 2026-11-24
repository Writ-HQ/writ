"use client";

import { useFormatter, useTranslations, type DateTimeFormatOptions } from "next-intl";
import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";

import type { Grain, Point } from "./range";

const H = 248;
const PAD = { top: 10, right: 4, bottom: 26, left: 36 };

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

/**
 * Cases opened and cases resolved side by side, one pair of bars per day,
 * week or month. Hovering a pair shows both numbers.
 */
export function FlowChart({ points, grain, label }: { points: Point[]; grain: Grain; label: string }) {
  const t = useTranslations("Dashboard.flow");
  const format = useFormatter();
  const [box, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const date = (iso: string, o: DateTimeFormatOptions) => format.dateTime(new Date(iso + "T00:00:00Z"), { ...o, timeZone: "UTC" });

  const n = points.length;
  const hi = niceMax(Math.max(...points.flatMap((p) => [p.opened, p.resolved]), 1));
  const ticks = [0, 1, 2, 3, 4].map((i) => (hi * i) / 4);
  const iw = Math.max(width - PAD.left - PAD.right, 10);
  const ih = H - PAD.top - PAD.bottom;
  const base = PAD.top + ih;
  const slot = iw / Math.max(n, 1);
  const bw = Math.max(Math.min(slot * 0.3, 14), 2);
  const gap = Math.min(2, bw / 3);
  const cx = (i: number) => PAD.left + slot * (i + 0.5);
  const y = (v: number) => PAD.top + (1 - v / hi) * ih;
  const r = Math.min(4, bw / 2);

  const room = Math.max(3, Math.floor(iw / 72));
  const step = Math.max(1, Math.ceil(n / room));
  const axisDate = (iso: string) =>
    grain === "month" ? date(iso, { month: "short" }) : date(iso, { month: "short", day: "numeric" });
  const bucketDate = (p: Point) =>
    grain === "day"
      ? date(p.date, { weekday: "long", month: "long", day: "numeric" })
      : grain === "month"
        ? date(p.date, { month: "long", year: "numeric" })
        : `${date(p.date, { month: "short", day: "numeric" })} – ${date(p.end, { month: "short", day: "numeric" })}`;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - PAD.left) / slot);
    setHover(i >= 0 && i < n ? i : null);
  };

  const hp = hover != null ? points[hover] : undefined;

  return (
    <div ref={box} className="relative" style={{ height: H }}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          className="block touch-none select-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={label}
        >
          <defs>
            {/* Bars are drawn with round ends and cut flat at the baseline. */}
            <clipPath id="flow-clip">
              <rect x="0" y="0" width={width} height={base} />
            </clipPath>
          </defs>

          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={PAD.left + iw} y1={y(v)} y2={y(v)} className={v === 0 ? "stroke-line" : "stroke-line/60"} />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="fill-faint" fontSize="11.5">
                {format.number(v, { notation: "compact", maximumFractionDigits: 1 })}
              </text>
            </g>
          ))}

          {hover != null && (
            <rect x={cx(hover) - slot / 2 + 1} y={PAD.top} width={slot - 2} height={ih} rx="8" className="fill-accent-soft" />
          )}

          <g clipPath="url(#flow-clip)">
            {points.map((p, i) => {
              const dim = hover != null && hover !== i;
              return (
                <g key={p.date} opacity={dim ? 0.45 : 1} className="transition-opacity">
                  <rect x={cx(i) - bw - gap / 2} y={y(p.opened)} width={bw} height={base - y(p.opened) + r} rx={r} className="fill-accent" />
                  <rect x={cx(i) + gap / 2} y={y(p.resolved)} width={bw} height={base - y(p.resolved) + r} rx={r} className="fill-accent-bright" />
                </g>
              );
            })}
          </g>

          {points.map((p, i) =>
            i % step === 0 ? (
              <text key={p.date} x={cx(i)} y={H - 6} textAnchor="middle" className="fill-muted" fontSize="11.5">
                {axisDate(p.date)}
              </text>
            ) : null,
          )}
        </svg>
      )}

      {hp && hover != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-48 rounded-2xl bg-ink px-3.5 py-3 text-[12.5px] text-white shadow-xl"
          style={{ left: Math.min(Math.max(cx(hover) - 96, 0), width - 192) }}
        >
          <p className="text-white/60">{bucketDate(hp)}</p>
          <p className="mt-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-accent ring-1 ring-white/40" />
              {t("opened")}
            </span>
            <span className="font-medium tabular-nums">{format.number(hp.opened)}</span>
          </p>
          <p className="mt-1 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-accent-bright" />
              {t("resolved")}
            </span>
            <span className="font-medium tabular-nums">{format.number(hp.resolved)}</span>
          </p>
          <p className="mt-2 flex items-center justify-between border-t border-white/15 pt-2 text-white/70">
            {t("net")}
            <span className="tabular-nums">{format.number(hp.opened - hp.resolved, { signDisplay: "exceptZero" })}</span>
          </p>
        </div>
      )}
    </div>
  );
}

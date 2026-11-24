import { addDays, daily, LAST_DATE, toMs, type Day } from "./data";

// Date ranges for the chart: the presets in the picker, the period before
// each one, and grouping days into weeks or months. Measured from the
// last day with data.

export type Grain = "day" | "week" | "month";
export const PRESETS = ["7d", "28d", "3m", "6m", "12m"] as const;
export type Preset = (typeof PRESETS)[number];

/** A bucket on the chart: a day, a week or a month, summed. */
export type Point = Day & { end: string };

export function presetRange(p: Preset): [string, string] {
  if (p.endsWith("d")) return [addDays(LAST_DATE, -parseInt(p) + 1), LAST_DATE];
  const months = parseInt(p);
  const end = new Date(toMs(LAST_DATE));
  const start = Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, end.getUTCDate() + 1);
  return [new Date(start).toISOString().slice(0, 10), LAST_DATE];
}

const byDate = new Map(daily.map((d) => [d.date, d]));

/**
 * The days in a preset, and the same number of days just before it, lined
 * up index by index.
 */
export function periods(p: Preset) {
  const [a, b] = presetRange(p);
  const n = Math.round((toMs(b) - toMs(a)) / 86_400_000) + 1;
  const cur: Day[] = [];
  const prev: Day[] = [];
  for (let i = 0; i < n; i++) {
    const d = byDate.get(addDays(a, i));
    const before = byDate.get(addDays(a, i - n));
    if (d) cur.push(d);
    if (before) prev.push(before);
  }
  return { range: [a, b] as [string, string], cur, prev };
}

function bucketKey(iso: string, g: Grain) {
  if (g === "day") return iso;
  if (g === "month") return iso.slice(0, 7);
  return addDays(iso, -((new Date(toMs(iso)).getUTCDay() + 6) % 7));
}

function sum(days: Day[]): Point {
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const resolved = days.reduce((n, d) => n + d.resolved, 0);
  return {
    date: first.date,
    end: last.date,
    contacts: days.reduce((n, d) => n + d.contacts, 0),
    opened: days.reduce((n, d) => n + d.opened, 0),
    resolved,
    days: resolved
      ? Math.round((days.reduce((n, d) => n + d.days * d.resolved, 0) / resolved) * 10) / 10
      : 0,
  };
}

/**
 * Groups the current days by grain, and the previous days in the same
 * runs, so bucket k of each period covers matching days.
 */
export function bucket(cur: Day[], prev: Day[], g: Grain) {
  const runs: number[][] = [];
  let key = "";
  cur.forEach((d, i) => {
    const k = bucketKey(d.date, g);
    if (k !== key) {
      runs.push([]);
      key = k;
    }
    runs[runs.length - 1]!.push(i);
  });
  const offset = prev.length - cur.length;
  return {
    points: runs.map((r) => sum(r.map((i) => cur[i]!))),
    before: runs.map((r) => {
      const days = r.map((i) => prev[i + offset]).filter((d): d is Day => d != null);
      return days.length ? sum(days) : null;
    }),
  };
}

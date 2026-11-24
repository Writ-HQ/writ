"use client";

import { useFormatter, useTranslations, type DateTimeFormatOptions } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import { account, activity, issues, LAST_DATE, NOW, offices, oldestCases, recentEmails, statuses, summarize, type Metric } from "./data";
import { FlowChart } from "./flow-chart";
import { Card, CardLink, Delta, Glyph, Initials, Segmented } from "./kit";
import { bucket, periods, type Grain, type Point } from "./range";

// The overview: a greeting with quick actions, four stat cards, casework
// flow and status, then what needs attention and what happened lately.

const RANGES = ["28d", "3m", "12m"] as const;
type Range = (typeof RANGES)[number];
/** Each range's bars: days for four weeks, weeks for three months, months for a year. */
const GRAIN: Record<Range, Grain> = { "28d": "day", "3m": "week", "12m": "month" };

const change = (cur: number, prev: number | undefined) => (prev ? (cur - prev) / prev : null);

/** One icon per metric, on a 20-unit grid. */
const ICONS: Record<Metric, string> = {
  opened: "M4 3.5h9l3 3v10H4zM13 3.5v3h3M10 9v5M7.5 11.5h5",
  resolved: "M4 3.5h9l3 3v10H4zM13 3.5v3h3M7 12l2 2 4-4.5",
  days: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 6v4l2.5 2",
  contacts: "M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5M15 6v5M12.5 8.5h5",
};

/** A small trend line under a stat. Drawn in a stretched box. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 30 - ((v - lo) / span) * 26]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x!.toFixed(2)} ${y!.toFixed(2)}`).join("");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-full overflow-visible" aria-hidden="true">
      <path d={`${line}L100 32L0 32Z`} className="fill-accent-soft" />
      <path d={line} fill="none" className="stroke-accent" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({
  metric,
  value,
  delta,
  trend,
}: {
  metric: Metric;
  value: string;
  delta: ReactNode;
  trend: number[];
}) {
  const t = useTranslations("Dashboard");
  return (
    <Card className="gap-3 !p-0">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <p className="text-[13px] text-muted">{t(`metrics.${metric}`)}</p>
          <p className="mt-2 text-[30px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-xl bg-chrome text-accent">
          <Glyph vb={20} className="size-[18px]" d={ICONS[metric]} />
        </span>
      </div>
      <div className="flex items-center gap-2 px-5 text-[12px] text-muted">
        {delta}
        {t("overview.vsBefore")}
      </div>
      <div className="overflow-hidden rounded-b-[20px]">
        <Sparkline values={trend} />
      </div>
    </Card>
  );
}

const STATUS_TONE = ["stroke-accent-deep", "stroke-accent", "stroke-accent-bright", "stroke-mist"] as const;
const STATUS_DOT = ["bg-accent-deep", "bg-accent", "bg-accent-bright", "bg-mist"] as const;

/** Open cases as a ring, one arc per status, with the total in the middle. */
function StatusRing() {
  const t = useTranslations("Dashboard.status");
  const format = useFormatter();
  const total = statuses.reduce((n, s) => n + s.count, 0);
  const R = 54;
  const C = 2 * Math.PI * R;
  const GAP = 4;
  // Where each arc starts along the ring.
  const starts = statuses.map((_, i) => statuses.slice(0, i).reduce((n, x) => n + (x.count / total) * C, 0));

  return (
    <Card title={t("title")} hint={t("hint")} action={<CardLink href="/app/casework">{t("all")}</CardLink>}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
        <div className="relative size-[148px] shrink-0">
          <svg viewBox="0 0 140 140" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="70" cy="70" r={R} fill="none" className="stroke-chrome" strokeWidth="14" />
            {statuses.map((s, i) => {
              const len = (s.count / total) * C;
              return (
                <circle
                  key={s.key}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  strokeWidth="14"
                  strokeLinecap="round"
                  className={STATUS_TONE[i]}
                  strokeDasharray={`${Math.max(len - GAP - 14, 0.5)} ${C}`}
                  strokeDashoffset={-(starts[i]! + 7 + GAP / 2)}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[30px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{format.number(total)}</span>
            <span className="mt-1 text-[12px] text-muted">{t("total")}</span>
          </div>
        </div>
        <ul className="flex w-full min-w-0 flex-col gap-2.5">
          {statuses.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2.5 text-[13px]">
              <span className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[i]}`} />
              <span className="min-w-0 flex-1 truncate text-ink/80">{t(s.key)}</span>
              <span className="font-medium tabular-nums">{format.number(s.count)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** Age badge: red past two months, amber past five weeks. */
function Age({ days }: { days: number }) {
  const t = useTranslations("Dashboard.attention");
  const tone = days >= 60 ? "bg-bad/10 text-bad" : days >= 35 ? "bg-star/10 text-star" : "bg-accent-soft text-accent-deep";
  return (
    <span
      title={t("daysOpen", { days })}
      className={`flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-xl leading-none ${tone}`}
    >
      <span className="text-[15px] font-semibold tabular-nums">{days}</span>
      <span className="mt-0.5 text-[10.5px] font-medium">{t("dayUnit")}</span>
    </span>
  );
}

const ACTIVITY_ICON: Record<(typeof activity)[number]["key"], { d: string; tone: string }> = {
  resolved: { d: "M4 8.5l2.5 2.5L12 5.5", tone: "bg-good/10 text-good" },
  opened: { d: "M8 4v8M4 8h8", tone: "bg-accent-soft text-accent" },
  note: { d: "M3.5 12.5l1-3 6-6 2 2-6 6zM9.5 4.5l2 2", tone: "bg-chrome text-ink/70" },
  signup: { d: "M6 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM2.5 12.5c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5M12 5v4M10 7h4", tone: "bg-accent-soft text-accent" },
  email: { d: "M2.5 4h11v8h-11zM2.5 4L8 8.5 13.5 4", tone: "bg-star/10 text-star" },
};

export function Overview() {
  const t = useTranslations("Dashboard");
  const format = useFormatter();
  const [range, setRange] = useState<Range>("28d");

  const per = useMemo(() => periods(range), [range]);
  const s = useMemo(() => summarize(per.cur), [per]);
  const sp = useMemo(() => (per.prev.length ? summarize(per.prev) : null), [per]);
  const points: Point[] = useMemo(() => bucket(per.cur, per.prev, GRAIN[range]).points, [per, range]);
  // Sparklines by week, whatever the range, so they stay smooth.
  const weekly: Point[] = useMemo(() => (range === "28d" ? points : bucket(per.cur, per.prev, "week").points), [per, points, range]);

  const day = (iso: string, o: DateTimeFormatOptions) => format.dateTime(new Date(iso + "T00:00:00Z"), { ...o, timeZone: "UTC" });
  const rangeLabel = t(`range.presets.${range}`);

  const topIssues = useMemo(() => {
    const sw = issues.reduce((a, d) => a + d.share * d.growth, 0);
    const shareSum = issues.reduce((a, d) => a + d.share, 0);
    return issues
      .map((d) => {
        const cur = Math.round(s.opened * ((d.share * d.growth) / sw));
        const prev = sp ? Math.round(sp.opened * (d.share / shareSum)) : 0;
        return { key: d.key, cur, change: change(cur, prev) };
      })
      .sort((a, b) => b.cur - a.cur)
      .slice(0, 6);
  }, [s, sp]);
  const issueTop = topIssues[0]?.cur ?? 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting and quick actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-accent">
            {t("overview.eyebrow", { date: day(LAST_DATE, { weekday: "long", month: "long", day: "numeric" }), office: offices[0].name })}
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.025em]">{t("overview.title", { name: account.name.split(" ")[0]! })}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/contacts" className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-medium ring-1 ring-line hover:bg-panel">
            <Glyph className="size-3.5" d="M6.5 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M12.5 5v4M10.5 7h4" />
            {t("overview.actions.addContact")}
          </Link>
          <Link href="/app/email" className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13px] font-medium ring-1 ring-line hover:bg-panel">
            <Glyph className="size-3.5" d="M2.5 4h11v8h-11zM2.5 4L8 8.5 13.5 4" />
            {t("overview.actions.writeEmail")}
          </Link>
          <Link href="/app/casework" className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white hover:bg-ink-soft/85">
            <Glyph className="size-3.5" d="M8 3.5v9M3.5 8h9" />
            {t("overview.actions.newCase")}
          </Link>
        </div>
      </div>

      {/* Range, for everything below */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
        <p className="text-[13px] text-muted">{t("overview.showing", { range: rangeLabel })}</p>
        <Segmented
          label={t("overview.range")}
          value={range}
          options={RANGES.map((r) => ({ key: r, label: t(`range.presets.${r}`) }))}
          onChange={setRange}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard metric="opened" value={format.number(s.opened)} delta={<Delta value={change(s.opened, sp?.opened)} />} trend={weekly.map((p) => p.opened)} />
        <StatCard metric="resolved" value={format.number(s.resolved)} delta={<Delta value={change(s.resolved, sp?.resolved)} />} trend={weekly.map((p) => p.resolved)} />
        <StatCard
          metric="days"
          value={format.number(s.days, { maximumFractionDigits: 1 })}
          delta={<Delta value={sp ? s.days - sp.days : null} invert percent={false} />}
          trend={weekly.map((p) => p.days)}
        />
        <StatCard metric="contacts" value={format.number(s.contacts)} delta={<Delta value={change(s.contacts, sp?.contacts)} />} trend={weekly.map((p) => p.contacts)} />
      </div>

      {/* Flow and status */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card
          title={t("flow.title")}
          hint={t(`flow.hint.${GRAIN[range]}`)}
          action={
            <div className="flex items-center gap-4 pt-0.5 text-[12.5px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-accent" />
                {t("flow.opened")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] bg-accent-bright" />
                {t("flow.resolved")}
              </span>
            </div>
          }
        >
          <FlowChart points={points} grain={GRAIN[range]} label={t("flow.label", { period: rangeLabel })} />
        </Card>
        <StatusRing />
      </div>

      {/* Needs attention and top issues */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title={t("attention.title")} hint={t("attention.hint")} action={<CardLink href="/app/casework">{t("attention.all")}</CardLink>}>
          <ul className="-mx-2 flex flex-col">
            {oldestCases.map((c) => (
              <li key={c.key}>
                <Link href="/app/casework" className="flex items-center gap-3.5 rounded-2xl px-2 py-2.5 hover:bg-panel">
                  <Age days={c.days} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink/90">{t(`mock.cases.${c.key}`)}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                      <span className="tabular-nums">#{c.number}</span>
                      <span className="size-[3px] rounded-full bg-faint" />
                      {t(`issues.${c.issue}`)}
                    </span>
                  </span>
                  <Initials name={c.owner} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t("topIssues.title")} hint={t("topIssues.hint")}>
          <ol className="flex flex-col gap-3.5">
            {topIssues.map((r, i) => (
              <li key={r.key}>
                <div className="flex items-baseline gap-2 text-[13px]">
                  <span className="w-4 text-[11.5px] text-faint tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-ink/85">{t(`issues.${r.key}`)}</span>
                  <span className="font-medium tabular-nums">{format.number(r.cur)}</span>
                  <span className={`w-10 text-right text-[11.5px] tabular-nums ${r.change == null ? "" : r.change >= 0 ? "text-good" : "text-bad"}`}>
                    {r.change == null ? "" : format.number(r.change, { style: "percent", signDisplay: "exceptZero" })}
                  </span>
                </div>
                <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-chrome">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(r.cur / issueTop) * 100}%`, opacity: 1 - i * 0.12 }} />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Email and activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("emails.title")} hint={t("emails.hint")} action={<CardLink href="/app/email">{t("emails.all")}</CardLink>}>
          <ul className="flex flex-col divide-y divide-line/70">
            {recentEmails.map((e) => {
              const C = 2 * Math.PI * 15;
              return (
                <li key={e.key} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                  <span className="relative size-11 shrink-0" title={t("emails.openRate")}>
                    <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden="true">
                      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.5" className="stroke-chrome" />
                      <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.5" strokeLinecap="round" className="stroke-accent" strokeDasharray={`${e.opened * C} ${C}`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10.5px] font-semibold tabular-nums">
                      {format.number(e.opened, { style: "percent" })}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-ink/90">{t(`mock.emails.${e.key}`)}</span>
                    <span className="mt-0.5 block text-[12px] text-muted">
                      {t("emails.line", { date: day(e.sent, { month: "short", day: "numeric" }), recipients: format.number(e.recipients) })}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title={t("activity.title")} hint={t("activity.hint")}>
          <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-px before:bg-line">
            {activity.map((a) => {
              const icon = ACTIVITY_ICON[a.key];
              return (
                <li key={a.at} className="relative flex items-start gap-3">
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${icon.tone}`}>
                    <Glyph className="size-3.5" d={icon.d} />
                  </span>
                  <span className="min-w-0 pt-1">
                    <span className="block text-[13px] leading-[1.45] text-ink/85">
                      {t(`activity.items.${a.key}`, { who: a.who, number: a.number, count: a.count })}
                    </span>
                    <span className="text-[12px] text-muted">{format.relativeTime(new Date(a.at), new Date(NOW))}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}

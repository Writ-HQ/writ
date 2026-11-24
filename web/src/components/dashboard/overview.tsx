"use client";

import { useFormatter, useTranslations, type DateTimeFormatOptions } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import {
  account,
  channels,
  dms,
  issues,
  LAST_DATE,
  NOW,
  offices,
  oldestCases,
  scheduledPosts,
  statuses,
  summarize,
  type Metric,
  type Platform,
} from "./data";
import { FlowChart } from "./flow-chart";
import { Card, CardLink, Delta, Glyph, Initials, Segmented } from "./kit";
import { bucket, periods, type Grain } from "./range";

// The overview, laid out around the day's work: a banner with the numbers,
// then a queue of what needs doing and the casework trend, with a rail for
// social (posts going out, channels) and where cases stand.

const RANGES = ["28d", "3m", "12m"] as const;
type Range = (typeof RANGES)[number];
const GRAIN: Record<Range, Grain> = { "28d": "day", "3m": "week", "12m": "month" };
/** The office's own clock, for post times and "today". */
const ZONE = "America/Toronto";

const change = (cur: number, prev: number | undefined) => (prev ? (cur - prev) / prev : null);
const localDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date(iso));

/** A platform's mark in its colour: Facebook blue, Instagram's gradient. */
function PlatformBadge({ platform, size = "md" }: { platform: Platform; size?: "sm" | "md" }) {
  const t = useTranslations("Dashboard.platforms");
  const box = size === "sm" ? "size-5 rounded-md" : "size-8 rounded-[10px]";
  const icon = size === "sm" ? "size-3" : "size-4";
  return (
    <span
      title={t(platform)}
      className={`flex shrink-0 items-center justify-center text-white ${box}`}
      style={{ background: platform === "facebook" ? "#0866FF" : "linear-gradient(135deg,#F58529,#DD2A7B 55%,#8134AF)" }}
    >
      {platform === "facebook" ? (
        <svg viewBox="0 0 16 16" className={icon} fill="currentColor" aria-hidden="true">
          <path d="M9.2 15V8.9h2l.3-2.4H9.2V5c0-.7.2-1.2 1.2-1.2h1.3V1.7c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.6H4.5v2.4h2.1V15z" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className={icon} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="2" y="2" width="12" height="12" rx="3.5" />
          <circle cx="8" cy="8" r="2.8" />
          <circle cx="11.6" cy="4.4" r=".6" fill="currentColor" stroke="none" />
        </svg>
      )}
    </span>
  );
}

/* ---------- Banner ---------- */

function Banner({ range, onRange }: { range: Range; onRange: (r: Range) => void }) {
  const t = useTranslations("Dashboard");
  const format = useFormatter();
  const per = useMemo(() => periods(range), [range]);
  const s = useMemo(() => summarize(per.cur), [per]);
  const sp = useMemo(() => (per.prev.length ? summarize(per.prev) : null), [per]);

  const today = localDay(NOW);
  const counts = {
    cases: oldestCases.filter((c) => c.days >= 60).length,
    messages: dms.filter((m) => m.state !== "replied").length,
    posts: scheduledPosts.filter((p) => localDay(p.at) === today && p.status === "approved").length,
  };

  const stats: { metric: Metric; value: string; delta: ReactNode }[] = [
    { metric: "opened", value: format.number(s.opened), delta: <Delta value={change(s.opened, sp?.opened)} /> },
    { metric: "resolved", value: format.number(s.resolved), delta: <Delta value={change(s.resolved, sp?.resolved)} /> },
    {
      metric: "days",
      value: format.number(s.days, { maximumFractionDigits: 1 }),
      delta: <Delta value={sp ? s.days - sp.days : null} invert percent={false} />,
    },
    { metric: "contacts", value: format.number(s.contacts), delta: <Delta value={change(s.contacts, sp?.contacts)} /> },
  ];

  return (
    <section className="bg-sky relative overflow-hidden rounded-[28px] p-6 ring-1 ring-ink/[0.06] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl min-w-0">
          <p className="text-[13px] font-medium text-ink/55">
            {t("overview.eyebrow", {
              date: format.dateTime(new Date(LAST_DATE + "T12:00:00Z"), { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }),
              office: offices[0].name,
            })}
          </p>
          <h1 className="mt-2 text-[30px] leading-[1.15] font-semibold tracking-[-0.03em] sm:text-[34px]">
            {t("overview.title", { name: account.name.split(" ")[0]! })}
          </h1>
          <p className="mt-2 text-[14.5px] leading-[1.55] text-ink/70">{t("overview.summary", counts)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/posts"
            className="flex h-9 items-center gap-1.5 rounded-full bg-white/80 px-3.5 text-[13px] font-medium ring-1 ring-ink/[0.08] backdrop-blur hover:bg-white"
          >
            <Glyph className="size-3.5" d="M2.5 3.5h11v10h-11zM2.5 6.5h11M5.5 2v3M10.5 2v3" />
            {t("overview.actions.schedulePost")}
          </Link>
          <Link href="/app/casework" className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white hover:bg-ink/85">
            <Glyph className="size-3.5" d="M8 3.5v9M3.5 8h9" />
            {t("overview.actions.newCase")}
          </Link>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] font-medium text-ink/55">{t("overview.showing", { range: t(`range.presets.${range}`) })}</p>
        <Segmented
          label={t("overview.range")}
          value={range}
          options={RANGES.map((r) => ({ key: r, label: t(`range.presets.${r}`) }))}
          onChange={onRange}
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink/[0.06] ring-1 ring-ink/[0.06] lg:grid-cols-4">
        {stats.map((st) => (
          <div key={st.metric} className="bg-white/85 px-4 py-4 backdrop-blur sm:px-5">
            <dt className="text-[12.5px] text-muted">{t(`metrics.${st.metric}`)}</dt>
            <dd className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[26px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{st.value}</span>
              {st.delta}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------- Queue ---------- */

type QueueTab = "messages" | "cases";

const DM_STATE = {
  new: "bg-bad/10 text-bad",
  auto: "bg-star/10 text-star",
  replied: "bg-good/10 text-good",
} as const;

function Queue() {
  const t = useTranslations("Dashboard");
  const format = useFormatter();
  const [tab, setTab] = useState<QueueTab>("messages");
  const waiting = dms.filter((m) => m.state !== "replied").length;

  return (
    <Card className="!p-0">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 pt-4">
        <div role="tablist" aria-label={t("queue.title")} className="flex gap-5">
          {(["messages", "cases"] as const).map((k) => {
            const on = tab === k;
            const n = k === "messages" ? waiting : oldestCases.length;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(k)}
                className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-[14px] transition-colors ${
                  on ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t(`queue.tabs.${k}`)}
                <span className={`rounded-full px-1.5 text-[11px] font-medium tabular-nums ${on ? "bg-ink text-white" : "bg-chrome text-muted"}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="pb-3">
          {tab === "messages" ? <CardLink href="/app/inbox">{t("queue.openInbox")}</CardLink> : <CardLink href="/app/casework">{t("queue.allCases")}</CardLink>}
        </div>
      </header>

      {tab === "messages" ? (
        <ul role="tabpanel" className="divide-y divide-line/60">
          {dms.map((m) => (
            <li key={m.key}>
              <Link href="/app/inbox" className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-panel">
                <span className="relative">
                  <Initials name={m.name} />
                  <span className="absolute -right-1.5 -bottom-1.5 rounded-md ring-2 ring-white">
                    <PlatformBadge platform={m.platform} size="sm" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={`truncate text-[13.5px] ${m.state === "new" ? "font-semibold" : "font-medium text-ink/85"}`}>{m.name}</span>
                    <span className="shrink-0 text-[12px] text-faint">{format.relativeTime(new Date(m.at), new Date(NOW))}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted">{t(`mock.dms.${m.key}`)}</span>
                </span>
                <span className={`mt-0.5 hidden shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium sm:block ${DM_STATE[m.state]}`}>
                  {t(`queue.states.${m.state}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul role="tabpanel" className="divide-y divide-line/60">
          {oldestCases.map((c) => {
            const tone = c.days >= 60 ? "text-bad" : c.days >= 35 ? "text-star" : "text-accent";
            return (
              <li key={c.key}>
                <Link href="/app/casework" className="flex items-center gap-4 px-5 py-3.5 hover:bg-panel">
                  <span className="w-14 shrink-0" title={t("queue.daysOpen", { days: c.days })}>
                    <span className={`block text-[18px] leading-none font-semibold tabular-nums ${tone}`}>{c.days}</span>
                    <span className="text-[11px] text-faint">{t("queue.dayUnit")}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink/90">{t(`mock.cases.${c.key}`)}</span>
                    <span className="mt-0.5 block text-[12px] text-muted">
                      <span className="tabular-nums">#{c.number}</span> · {t(`issues.${c.issue}`)}
                    </span>
                  </span>
                  <Initials name={c.owner} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Rail ---------- */

const POST_STATUS = { approved: "bg-good", approval: "bg-star", draft: "bg-faint" } as const;

function UpNext() {
  const t = useTranslations("Dashboard.upNext");
  const m = useTranslations("Dashboard.mock.posts");
  const format = useFormatter();
  const today = localDay(NOW);
  const tomorrow = localDay(new Date(Date.parse(NOW) + 86_400_000).toISOString());
  const dayLabel = (iso: string) => {
    const d = localDay(iso);
    if (d === today) return t("today");
    if (d === tomorrow) return t("tomorrow");
    return format.dateTime(new Date(iso), { weekday: "long", month: "short", day: "numeric", timeZone: ZONE });
  };
  const time = (iso: string, o: DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" }) => format.dateTime(new Date(iso), { ...o, timeZone: ZONE });

  return (
    <Card title={t("title")} hint={t("hint")} action={<CardLink href="/app/posts">{t("all")}</CardLink>}>
      <ol className="flex flex-col gap-4">
        {scheduledPosts.map((p, i) => {
          const label = dayLabel(p.at);
          const first = i === 0 || dayLabel(scheduledPosts[i - 1]!.at) !== label;
          return (
            <li key={p.key}>
              {first && <p className="mb-2 text-[11.5px] font-semibold tracking-[0.04em] text-faint uppercase">{label}</p>}
              <Link href="/app/posts" className="-m-2 flex gap-3 rounded-xl p-2 hover:bg-panel">
                <span className="w-14 shrink-0 pt-0.5 text-[12.5px] font-medium tabular-nums">{time(p.at)}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] leading-[1.45] text-ink/85">{m(p.key)}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="flex -space-x-1">
                      {p.platforms.map((pl) => (
                        <span key={pl} className="rounded-md ring-2 ring-white">
                          <PlatformBadge platform={pl} size="sm" />
                        </span>
                      ))}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                      <span className={`size-1.5 rounded-full ${POST_STATUS[p.status]}`} />
                      {t(`status.${p.status}`)}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function Channels() {
  const t = useTranslations("Dashboard.channels");
  const format = useFormatter();
  const auto = channels.reduce((n, c) => n + c.autoReplied, 0);
  return (
    <Card title={t("title")} action={<CardLink href="/app/settings">{t("manage")}</CardLink>}>
      <ul className="flex flex-col gap-3">
        {channels.map((c) => (
          <li key={c.key} className="flex items-center gap-3">
            <PlatformBadge platform={c.key} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">{c.handle}</span>
              <span className="text-[12px] text-muted">{t("followers", { count: c.followers })}</span>
            </span>
            <Link
              href="/app/inbox"
              className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px] font-medium text-accent-deep tabular-nums hover:bg-accent-bright/40"
            >
              {t("unread", { count: c.unread })}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/app/replies" className="mt-4 flex items-center gap-3 rounded-2xl bg-chrome px-3.5 py-3 hover:bg-mist/60">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-accent">
          <Glyph d="M6.5 4L3 7.5 6.5 11M3 7.5h6.5a3.5 3.5 0 0 1 3.5 3.5v1.5" />
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] leading-[1.4] text-muted">
          <span className="block text-[18px] leading-none font-semibold text-ink tabular-nums">{format.number(auto)}</span>
          {t("autoReplies")}
        </span>
      </Link>
    </Card>
  );
}

const STATUS_BAR = ["bg-accent-deep", "bg-accent", "bg-accent-bright", "bg-mist"] as const;

function CaseStatus() {
  const t = useTranslations("Dashboard.status");
  const format = useFormatter();
  const total = statuses.reduce((n, s) => n + s.count, 0);
  return (
    <Card title={t("title")} action={<CardLink href="/app/casework">{t("all")}</CardLink>}>
      <p className="flex items-baseline gap-1.5">
        <span className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{format.number(total)}</span>
        <span className="text-[13px] text-muted">{t("total")}</span>
      </p>
      <div className="mt-3 flex h-2.5 gap-1" aria-hidden="true">
        {statuses.map((s, i) => (
          <span key={s.key} className={`rounded-full ${STATUS_BAR[i]}`} style={{ flexGrow: s.count }} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {statuses.map((s, i) => (
          <li key={s.key} className="flex min-w-0 items-start gap-2 text-[12.5px]">
            <span className={`mt-1 size-2 shrink-0 rounded-full ${STATUS_BAR[i]}`} />
            <span className="min-w-0">
              <span className="block font-medium tabular-nums">{format.number(s.count)}</span>
              <span className="block leading-[1.35] text-muted">{t(s.key)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TopIssues({ range }: { range: Range }) {
  const t = useTranslations("Dashboard");
  const format = useFormatter();
  const per = useMemo(() => periods(range), [range]);
  const opened = useMemo(() => summarize(per.cur).opened, [per]);
  const rows = useMemo(() => {
    const sw = issues.reduce((a, d) => a + d.share * d.growth, 0);
    return issues
      .map((d) => ({ key: d.key, n: Math.round(opened * ((d.share * d.growth) / sw)) }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [opened]);
  const top = rows[0]?.n || 1;
  return (
    <Card title={t("topIssues.title")} hint={t("topIssues.hint")}>
      <ol className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.key} className="relative flex h-8 items-center justify-between overflow-hidden rounded-lg px-2.5 text-[13px]">
            <span className="absolute inset-y-0 left-0 rounded-lg bg-accent-soft transition-[width] duration-500" style={{ width: `${(r.n / top) * 100}%` }} aria-hidden="true" />
            <span className="relative truncate text-ink/85">{t(`issues.${r.key}`)}</span>
            <span className="relative font-medium tabular-nums">{format.number(r.n)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ---------- Page ---------- */

export function Overview() {
  const t = useTranslations("Dashboard");
  const [range, setRange] = useState<Range>("28d");
  const per = useMemo(() => periods(range), [range]);
  const points = useMemo(() => bucket(per.cur, per.prev, GRAIN[range]).points, [per, range]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Banner range={range} onRange={setRange} />
        <Queue />
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
          <FlowChart points={points} grain={GRAIN[range]} label={t("flow.label", { period: t(`range.presets.${range}`) })} />
        </Card>
      </div>

      <aside className="grid content-start gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <UpNext />
        <Channels />
        <CaseStatus />
        <TopIssues range={range} />
      </aside>
    </div>
  );
}

"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";

import { Breakdowns } from "./breakdowns";
import { Chart } from "./chart";
import { offices, oldestCases, recentEmails, summarize, type Metric } from "./data";
import { Card, DataTable, Delta, Glyph, PageTitle } from "./kit";
import { RangePicker } from "./range-picker";
import { bucket, periods, type Grain, type Preset } from "./range";

const change = (cur: number, prev: number | undefined) => (prev ? (cur - prev) / prev : null);

/** One icon per metric, on a 20-unit grid. */
const ICONS: Record<Metric, string> = {
  contacts: "M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5M15 6v5M12.5 8.5h5",
  opened: "M4 3.5h9l3 3v10H4zM13 3.5v3h3M10 9v5M7.5 11.5h5",
  resolved: "M4 3.5h9l3 3v10H4zM13 3.5v3h3M7 12l2 2 4-4.5",
  days: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 6v4l2.5 2",
};

export function Overview() {
  const t = useTranslations("Dashboard");
  const format = useFormatter();
  const [preset, setPreset] = useState<Preset>("28d");
  const [grain, setGrain] = useState<Grain>("day");
  const [metric, setMetric] = useState<Metric>("opened");

  const per = useMemo(() => periods(preset), [preset]);
  const s = useMemo(() => summarize(per.cur), [per]);
  const sp = useMemo(() => (per.prev.length ? summarize(per.prev) : null), [per]);
  const chart = useMemo(() => bucket(per.cur, per.prev, grain), [per, grain]);

  const tiles: { key: Metric; value: string; delta: ReactNode }[] = [
    { key: "opened", value: format.number(s.opened), delta: <Delta value={change(s.opened, sp?.opened)} /> },
    { key: "resolved", value: format.number(s.resolved), delta: <Delta value={change(s.resolved, sp?.resolved)} /> },
    { key: "days", value: format.number(s.days, { maximumFractionDigits: 1 }), delta: <Delta value={sp ? s.days - sp.days : null} invert percent={false} /> },
    { key: "contacts", value: format.number(s.contacts), delta: <Delta value={change(s.contacts, sp?.contacts)} /> },
  ];

  const date = (iso: string) => format.dateTime(new Date(iso + "T00:00:00Z"), { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div>
      <PageTitle
        title={t("overview.title")}
        description={t("overview.description", { office: offices[0].name })}
        action={
          <RangePicker
            preset={preset}
            grain={grain}
            onPreset={(p) => {
              setPreset(p);
              // A long range by day is a blur; switch to weeks for it.
              if ((p === "6m" || p === "12m") && grain === "day") setGrain("week");
              if (p === "7d" && grain !== "day") setGrain("day");
            }}
            onGrain={setGrain}
          />
        }
      />

      <div className="mt-6">
        <Card flush>
          <div role="tablist" aria-label={t("overview.metric")} className="grid grid-cols-2 border-b border-line/70 lg:grid-cols-4">
            {tiles.map((tile) => {
              const on = tile.key === metric;
              return (
                <button
                  key={tile.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setMetric(tile.key)}
                  className={`relative px-5 py-4 text-left transition-colors ${on ? "bg-accent-soft" : "hover:bg-panel"}`}
                >
                  <span className="flex items-center gap-2 text-[13px] text-muted">
                    <Glyph vb={20} className={`size-4 ${on ? "text-accent" : "text-faint"}`} d={ICONS[tile.key]} />
                    {t(`metrics.${tile.key}`)}
                  </span>
                  <span className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[26px] font-semibold tracking-[-0.01em] tabular-nums">{tile.value}</span>
                    {tile.delta}
                  </span>
                  <span className={`absolute inset-x-0 bottom-0 h-0.5 ${on ? "bg-accent" : ""}`} />
                </button>
              );
            })}
          </div>
          <div className="px-3 pt-5 pb-3 sm:px-5">
            {/* Keyed so a new range, grain or metric draws the line in again. */}
            <Chart
              key={`${preset}-${grain}-${metric}`}
              days={chart.points}
              prev={chart.before}
              metric={metric}
              grain={grain}
              label={t(`range.presets.${preset}`)}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Breakdowns cur={s} prev={sp} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card
          title={t("oldest.title")}
          hint={t("oldest.hint")}
          action={
            <Link href="/app/casework" className="flex h-8 items-center rounded-full border border-line px-3.5 text-[13px] font-medium hover:bg-panel">
              {t("oldest.open")}
            </Link>
          }
          flush
        >
          <DataTable
            head={[t("oldest.case"), t("oldest.issue"), t("oldest.days"), t("oldest.owner")]}
            align={["left", "left", "right", "left"]}
            rows={oldestCases.map((c) => [
              <span key="s" className="block">
                <span className="block text-ink">{t(`mock.cases.${c.key}`)}</span>
                <span className="text-[12px] text-muted tabular-nums">#{c.number}</span>
              </span>,
              t(`issues.${c.issue}`),
              <span key="d" className={c.days > 60 ? "font-medium text-bad" : ""}>
                {format.number(c.days)}
              </span>,
              c.owner,
            ])}
          />
        </Card>

        <Card title={t("emails.title")} hint={t("emails.hint")}>
          <ul className="flex flex-col gap-2.5">
            {recentEmails.map((e) => (
              <li key={e.key} className="flex gap-3 rounded-xl bg-panel px-3.5 py-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Glyph className="size-3" d="M2 4h12v8.5H2zM2 4l6 4.5L14 4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] leading-[1.45]">{t(`mock.emails.${e.key}`)}</p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {t("emails.line", {
                      date: date(e.sent),
                      recipients: format.number(e.recipients),
                      opened: format.number(e.opened, { style: "percent" }),
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

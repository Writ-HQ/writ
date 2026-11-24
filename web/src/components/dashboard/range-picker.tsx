"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Glyph } from "./kit";
import { PRESETS, presetRange, type Grain, type Preset } from "./range";

const GRAINS: Grain[] = ["day", "week", "month"];

/** The date range button and its menu: Day / Week / Month, then the presets. */
export function RangePicker({
  preset,
  grain,
  onPreset,
  onGrain,
}: {
  preset: Preset;
  grain: Grain;
  onPreset: (p: Preset) => void;
  onGrain: (g: Grain) => void;
}) {
  const t = useTranslations("Dashboard.range");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const rangeText = (p: Preset) => {
    const [a, b] = presetRange(p);
    return format.dateTimeRange(new Date(a + "T00:00:00Z"), new Date(b + "T00:00:00Z"), {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-2.5 rounded-lg border border-line bg-white pr-2.5 pl-3 text-[13px] shadow-[0_1px_2px_rgb(15_23_42/0.05)] hover:bg-panel"
      >
        <Glyph className="size-4 text-faint" d="M2.5 3.5h11v10h-11zM2.5 6.5h11M5.5 2v3M10.5 2v3" />
        <span className="font-medium">{t(`presets.${preset}`)}</span>
        <span className="hidden text-muted sm:inline">{rangeText(preset)}</span>
        <span className="rounded-md bg-panel px-1.5 py-0.5 text-[11.5px] text-ink/60">{t(`by.${grain}`)}</span>
        <Glyph className={`size-3.5 text-faint transition-transform ${open ? "rotate-180" : ""}`} d="M4 6l4 4 4-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 z-40 mt-2 w-64 rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-12px_rgb(15_23_42/0.25)] sm:right-0 sm:left-auto"
        >
          <div className="flex rounded-lg bg-panel p-0.5">
            {GRAINS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGrain(g)}
                aria-pressed={g === grain}
                className={`h-8 flex-1 rounded-md text-[13px] transition-colors ${
                  g === grain ? "bg-white font-medium shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {t(`grains.${g}`)}
              </button>
            ))}
          </div>
          <div className="mt-1.5 border-t border-line/70 pt-1.5">
            {PRESETS.map((p) => {
              const on = p === preset;
              return (
                <button
                  key={p}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  onClick={() => {
                    onPreset(p);
                    setOpen(false);
                  }}
                  className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[13.5px] transition-colors hover:bg-panel ${on ? "bg-accent-soft" : ""}`}
                >
                  <span className={on ? "font-semibold text-accent-deep" : ""}>{t(`presets.${p}`)}</span>
                  {on && <span className="block text-[12px] text-muted">{rangeText(p)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

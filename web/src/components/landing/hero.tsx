import { useTranslations } from "next-intl";
import type React from "react";

import { Pill } from "@/components/ui/pill";
import { subprocessors } from "@/lib/subprocessors";

import { Container } from "./container";
import { DashboardMock } from "./mocks";

// Sizes follow the reference layout at 1470px wide: the text column is
// 594px tall with a hairline underneath; the sky panel is half the width
// and 706px tall (112px above the column plus the column itself), so its
// bottom lines up with that hairline; a 50px band sits 64px below.
export function Hero() {
  const t = useTranslations("Landing.hero");

  // Pulled up by the navbar's height (-mt-16), so the sky panel starts at
  // the very top, behind the transparent navbar.
  return (
    <section className="relative -mt-16 flex flex-col pt-28 pb-24 lg:block lg:pb-32">
      <div
        role="img"
        aria-label={t("visualLabel")}
        className="bg-sky relative mt-12 h-[440px] overflow-hidden shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_24px_40px_-12px_rgb(0_0_0/0.06),0_12px_24px_-6px_rgb(0_0_0/0.05),0_4px_8px_-2px_rgb(0_0_0/0.04),0_1px_3px_-1px_rgb(0_0_0/0.03)] order-2 sm:h-[520px] lg:absolute lg:top-0 lg:right-0 lg:mt-0 lg:h-[706px] lg:w-1/2"
      >
        {/* The dashboard sits 136px below the top of the sky and 40px from
            its left, ends about 40px above its bottom, and runs off its
            right edge, as if on a larger screen. */}
        <div aria-hidden="true" className="absolute top-12 left-6 origin-top-left scale-[0.62] sm:top-20 sm:scale-[0.85] lg:top-[136px] lg:left-10 xl:scale-100">
          <DashboardMock />
        </div>
      </div>

      <Container>
        <div className="flex flex-col justify-center border-b border-[#f0f0f0] pb-14 lg:h-[594px] lg:max-w-[min(585px,calc(50vw-6rem))] lg:pb-0">
          <HeroTitle />
          <p className="mt-6 max-w-[398px] text-base leading-[21px]">{t("subtitle")}</p>
          <div className="mt-11">
            <Pill size="lg">{t("cta")}</Pill>
          </div>
        </div>
        <Band />
      </Container>
    </section>
  );
}

// Three fixed lines, the first with a small picture and a word that
// change together every three seconds, as in the reference. Screen
// readers get the whole sentence once, instead of the moving parts.
function HeroTitle() {
  const t = useTranslations("Landing.hero");
  const words = (["w1", "w2", "w3", "w4"] as const).map((k) => t(`words.${k}`));
  const pictures = [ClipboardPicture, EnvelopePicture, BadgePicture, PhonePicture];

  // All items share one grid cell, so the cell is as wide as the widest
  // and nothing shifts as they change.
  const cycling = (items: React.ReactNode[]) =>
    items.map((item, i) => (
      <span key={i} className="cycle-item [grid-area:1/1]" style={{ animationDelay: `${i * 3}s` }}>
        {item}
      </span>
    ));

  return (
    <h1 className="text-[34px] leading-[33px] font-normal tracking-[-0.7px] sm:text-[40px] sm:leading-[38px] sm:tracking-[-0.8px]">
      <span className="sr-only">{t("title")}</span>
      <span aria-hidden="true" className="block">
        <span className="block whitespace-nowrap">
          {t("lead")}
          <span className="mx-3 inline-grid h-[38px] w-[52px] translate-y-[2px] align-middle">{cycling(pictures.map((P, i) => <P key={i} />))}</span>
          <span className="inline-grid align-baseline">{cycling(words)}</span>
        </span>
        <span className="block">{t("line2")}</span>
        <span className="block">{t("line3")}</span>
      </span>
    </h1>
  );
}

// Small paper-like pictures that sit in the heading, tilted, with a soft
// shadow. Drawn in CSS; decorative.
function Paper({ children, tilt }: { children: React.ReactNode; tilt: string }) {
  return (
    <span className={`absolute top-1/2 left-1/2 flex h-[54px] w-[42px] -translate-x-1/2 -translate-y-1/2 flex-col gap-[3px] rounded-[4px] bg-white p-[6px] shadow-[0_1px_2px_rgb(0_0_0/0.08),0_8px_16px_-6px_rgb(0_0_0/0.25)] ring-1 ring-black/5 ${tilt}`}>
      {children}
    </span>
  );
}

const Line = ({ w, dark = false }: { w: string; dark?: boolean }) => <span className={`block h-[2px] rounded-full ${dark ? "bg-ink/60" : "bg-ink/15"} ${w}`} />;

function ClipboardPicture() {
  return (
    <span className="relative block h-full w-full">
      <Paper tilt="-rotate-6">
        <Line w="w-1/2" dark />
        {["w-full", "w-5/6", "w-full", "w-2/3", "w-5/6"].map((w, i) => (
          <span key={i} className="flex items-center gap-[3px]">
            <span className={`h-[4px] w-[4px] shrink-0 rounded-[1px] ${i < 3 ? "bg-positive" : "ring-1 ring-ink/25"}`} />
            <Line w={w} />
          </span>
        ))}
      </Paper>
    </span>
  );
}

function EnvelopePicture() {
  return (
    <span className="relative block h-full w-full">
      <span className="absolute top-1/2 left-1/2 h-[34px] w-[50px] -translate-x-1/2 -translate-y-1/2 rotate-[5deg] overflow-hidden rounded-[4px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08),0_8px_16px_-6px_rgb(0_0_0/0.25)] ring-1 ring-black/5">
        <span className="absolute -top-[18px] left-1/2 h-[34px] w-[34px] -translate-x-1/2 rotate-45 border border-ink/15 bg-panel" />
        <span className="absolute right-1.5 bottom-1.5 rounded-[2px] bg-ink px-[3px] text-[7px] leading-[10px] font-semibold tracking-normal text-white">FR</span>
      </span>
    </span>
  );
}

function BadgePicture() {
  return (
    <span className="relative block h-full w-full">
      <Paper tilt="rotate-[4deg]">
        <span className="mx-auto mt-[2px] block h-[14px] w-[14px] rounded-full bg-[#c7d9b0]" />
        <span className="mt-[3px] flex flex-col items-center gap-[3px]">
          <Line w="w-3/4" dark />
          <Line w="w-1/2" />
        </span>
        <span className="mt-auto block rounded-[2px] bg-sky py-[2px]" />
      </Paper>
    </span>
  );
}

function PhonePicture() {
  return (
    <span className="relative block h-full w-full">
      <span className="absolute top-1/2 left-1/2 flex h-[54px] w-[30px] -translate-x-1/2 -translate-y-1/2 -rotate-[5deg] flex-col gap-[3px] rounded-[6px] bg-ink p-[3px] shadow-[0_8px_16px_-6px_rgb(0_0_0/0.35)]">
        <span className="flex flex-1 flex-col justify-end gap-[3px] rounded-[4px] bg-white p-[3px]">
          <span className="block h-[5px] w-3/4 rounded-full bg-panel ring-1 ring-ink/10" />
          <span className="ml-auto block h-[5px] w-2/3 rounded-full bg-[#9dcfeb]" />
          <span className="block h-[5px] w-1/2 rounded-full bg-panel ring-1 ring-ink/10" />
        </span>
      </span>
    </span>
  );
}

// The companies Writ is built on, where the reference shows customer
// logos: a "Built on" label and, for each subprocessor in use, its name
// and what it does for Writ. Names rather than logos (see
// src/lib/subprocessors.ts). Same place and height as before: 64px below
// the hairline, 50px tall.
function Band() {
  const t = useTranslations("Landing.band");
  return (
    <div className="mt-16 flex min-h-[50px] flex-wrap items-center gap-x-14 gap-y-4">
      <p className="text-sm leading-[18px] font-medium text-ink/45">{t("label")}</p>
      <ul className="flex flex-wrap items-center gap-x-14 gap-y-4">
        {subprocessors.map(({ name, purpose }) => (
          <li key={name} className="flex items-baseline gap-3 whitespace-nowrap">
            <span className="text-[19px] font-semibold tracking-[-0.03em] text-ink/70">{name}</span>
            <span className="text-[13px] text-ink/45">{t(`purposes.${purpose}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

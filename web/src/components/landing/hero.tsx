import { useTranslations } from "next-intl";
import type { ComponentType, ReactNode, SVGProps } from "react";

import {
  BriefcaseSolid,
  BrowserSolid,
  CalendarSolid,
  ClipboardSolid,
  MailSolid,
  MessageSolid,
  PhoneSolid,
  SignatureSolid,
  StarSolid,
} from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { bandItems, type FeatureKey } from "@/lib/built-with";

import { BrandLogo } from "./brand-logos";
import { Container } from "./container";
import { DashboardPreview } from "./dashboard-preview";

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
          <DashboardPreview />
        </div>
      </div>

      <Container>
        <div className="flex flex-col justify-center border-b border-[#f0f0f0] pb-14 lg:h-[594px] lg:max-w-[min(585px,calc(50vw-6rem))] lg:pb-0">
          <HeroTitle />
          <p className="mt-6 max-w-[398px] text-base leading-[21px]">{t("subtitle")}</p>
          <div className="mt-11">
            <Pill size="lg" href="/waitlist">
              {t("cta")}
            </Pill>
          </div>
        </div>
        <Band />
      </Container>
    </section>
  );
}

// Three lines: the first word or phrase changes every three seconds. Screen
// readers get the whole sentence once, instead of the moving parts.
function HeroTitle() {
  const t = useTranslations("Landing.hero");
  const words = (["w1", "w2", "w3", "w4"] as const).map((k) => t(`words.${k}`));

  // All words share one grid cell, so the cell is as wide as the widest
  // and nothing shifts as they change.
  const cycling = (items: ReactNode[]) =>
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
          <span className="inline-grid align-baseline">{cycling(words)}</span>
        </span>
        <span className="block">{t("line2")}</span>
        <span className="block">{t("line3")}</span>
      </span>
    </h1>
  );
}

// Where the reference shows customer logos: a full-width band of logos
// and names that scrolls in a loop (src/lib/built-with.ts). No visible
// label; screen readers hear "Works with" and each name once. The list is
// drawn twice and slid by half its width, so the loop has no seam; the
// copy is hidden from screen readers. It stops on hover, and stands still
// for people who ask for less motion. 64px below the hairline, 50px tall.
const FEATURE_ICONS: Record<FeatureKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  newsletters: MailSolid,
  sms: MessageSolid,
  surveys: ClipboardSolid,
  websites: BrowserSolid,
  appointments: CalendarSolid,
  calls: PhoneSolid,
  reputation: StarSolid,
  signing: SignatureSolid,
  casework: BriefcaseSolid,
};

/** Times the list repeats in each half of the loop: enough to be wider than the widest screen. */
const REPEAT = Math.max(1, Math.ceil(10 / bandItems.length));

function Band() {
  const t = useTranslations("Landing.band");
  const half = Array.from({ length: REPEAT }, () => bandItems).flat();
  const items = (copy: number) =>
    half.map((item, i) => {
      const Icon = item.kind === "feature" ? FEATURE_ICONS[item.key] : null;
      return (
        <li
          key={`${copy}-${i}`}
          aria-hidden={copy > 0 || i >= bandItems.length || undefined}
          className="flex shrink-0 items-center gap-2 pr-[88px] whitespace-nowrap text-ink"
        >
          {Icon ? <Icon className="size-5 shrink-0" /> : item.kind === "platform" && <BrandLogo name={item.logo} className="size-5 shrink-0" />}
          <span className="text-[17px] font-semibold tracking-[-0.02em]">{item.kind === "feature" ? t(`features.${item.key}`) : item.name}</span>
        </li>
      );
    });
  return (
    <div className="group mt-16 flex min-h-[50px] items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul aria-label={t("label")} className="animate-marquee flex w-max [animation-duration:70s] group-hover:[animation-play-state:paused]">
        {items(0)}
        {items(1)}
      </ul>
    </div>
  );
}

import { useTranslations } from "next-intl";
import type React from "react";

import { Pill } from "@/components/ui/pill";
import { builtWith } from "@/lib/built-with";

import { BrandLogo } from "./brand-logos";
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
            <Pill size="lg" href="/signup">
              {t("cta")}
            </Pill>
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
          {/* Sized in em so it scales with the text, and set from just
              below the baseline to the top of the capitals: the pictures
              centre on the letters and never reach the next line. */}
          <span className="mx-[0.28em] inline-grid h-[0.95em] w-[1.3em] align-[-0.08em] [&>span]:flex [&>span]:items-center [&>span]:justify-center">
            {cycling(pictures.map((P, i) => <P key={i} />))}
          </span>
          <span className="inline-grid align-baseline">{cycling(words)}</span>
        </span>
        <span className="block">{t("line2")}</span>
        <span className="block">{t("line3")}</span>
      </span>
    </h1>
  );
}

// Small illustrations that sit in the heading, drawn in SVG: tilted, with
// gradients and a soft shadow, like objects on a desk. Decorative. Each is
// drawn once per page, so the gradient ids do not clash.
// Upright pictures are 1.15em tall; the envelope, which is wide, is 0.85em
// tall so that it is no wider than the 1.3em slot.
const shadow = "w-auto drop-shadow-[0_6px_6px_rgb(0_0_0/0.22)]";
const pictureStyle = `h-[1.15em] ${shadow}`;

function ClipboardPicture() {
  return (
    <svg viewBox="0 0 40 50" className={`${pictureStyle} -rotate-[7deg]`} aria-hidden="true">
      <defs>
        <linearGradient id="hp-board" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eeeeec" />
        </linearGradient>
        <linearGradient id="hp-clip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4a4a" />
          <stop offset="1" stopColor="#141414" />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="36" height="44" rx="4" fill="url(#hp-board)" stroke="#000" strokeOpacity="0.08" />
      <rect x="12" y="1" width="16" height="7" rx="2.5" fill="url(#hp-clip)" />
      <rect x="15" y="2.5" width="10" height="1.4" rx="0.7" fill="#fff" fillOpacity="0.35" />
      {[14, 21, 28, 35, 42].map((y, i) => (
        <g key={y}>
          {i < 3 ? (
            <>
              <rect x="7" y={y - 2.5} width="5" height="5" rx="1.3" fill="#27a139" />
              <path d={`M8.2 ${y} l1.3 1.3 2.3-2.6`} fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : (
            <rect x="7.5" y={y - 2} width="4" height="4" rx="1.1" fill="none" stroke="#000" strokeOpacity="0.25" />
          )}
          <rect x="15" y={y - 1} width={[16, 13, 17, 11, 14][i]} height="2" rx="1" fill="#000" fillOpacity={i < 3 ? 0.3 : 0.14} />
        </g>
      ))}
    </svg>
  );
}

function EnvelopePicture() {
  return (
    <svg viewBox="0 0 52 36" className={`h-[0.85em] ${shadow} rotate-[6deg]`} aria-hidden="true">
      <defs>
        <linearGradient id="hp-env" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#efefed" />
        </linearGradient>
        <linearGradient id="hp-stamp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#afd7ed" />
          <stop offset="1" stopColor="#9dcfeb" />
        </linearGradient>
      </defs>
      <rect x="1" y="2" width="50" height="33" rx="3" fill="url(#hp-env)" stroke="#000" strokeOpacity="0.08" />
      <path d="M2 4 26 21 50 4" fill="none" stroke="#000" strokeOpacity="0.14" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2 34 19 18M50 34 33 18" fill="none" stroke="#000" strokeOpacity="0.07" strokeWidth="1" />
      <rect x="39" y="6" width="8" height="10" rx="1" fill="url(#hp-stamp)" stroke="#fff" strokeWidth="1.2" strokeDasharray="1 1" />
      <rect x="5" y="27" width="11" height="5.5" rx="2.75" fill="#111" />
      <text x="10.5" y="31.4" textAnchor="middle" fontSize="4.2" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">FR</text>
    </svg>
  );
}

function BadgePicture() {
  return (
    <svg viewBox="0 0 36 52" className={`${pictureStyle} rotate-[5deg]`} aria-hidden="true">
      <defs>
        <linearGradient id="hp-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f0f0ee" />
        </linearGradient>
        <linearGradient id="hp-strap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9dcfeb" />
          <stop offset="1" stopColor="#c6e0ed" />
        </linearGradient>
      </defs>
      <path d="M12 0h12l-2 9h-8z" fill="url(#hp-strap)" />
      <rect x="2" y="8" width="32" height="42" rx="4" fill="url(#hp-card)" stroke="#000" strokeOpacity="0.08" />
      <rect x="13" y="11" width="10" height="2" rx="1" fill="#000" fillOpacity="0.15" />
      <circle cx="18" cy="23" r="6.5" fill="#cfdcc4" />
      <circle cx="18" cy="21.5" r="2.4" fill="#fff" fillOpacity="0.9" />
      <path d="M13.6 27.6a5 5 0 0 1 8.8 0" fill="#fff" fillOpacity="0.9" />
      <rect x="9" y="33" width="18" height="2.4" rx="1.2" fill="#000" fillOpacity="0.45" />
      <rect x="12" y="37.5" width="12" height="2" rx="1" fill="#000" fillOpacity="0.15" />
      <rect x="2" y="43" width="32" height="7" rx="0" fill="url(#hp-strap)" />
      <rect x="2" y="46" width="32" height="4" rx="4" fill="url(#hp-strap)" />
    </svg>
  );
}

function PhonePicture() {
  return (
    <svg viewBox="0 0 30 52" className={`${pictureStyle} -rotate-[6deg]`} aria-hidden="true">
      <defs>
        <linearGradient id="hp-phone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a3a3a" />
          <stop offset="1" stopColor="#0d0d0d" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="28" height="50" rx="6" fill="url(#hp-phone)" />
      <rect x="3" y="3" width="24" height="46" rx="4.2" fill="#fbfbfa" />
      <rect x="11" y="5" width="8" height="2.2" rx="1.1" fill="#111" />
      <rect x="5.5" y="14" width="14" height="6" rx="3" fill="#ededeb" />
      <rect x="10.5" y="23" width="14" height="6" rx="3" fill="#9dcfeb" />
      <rect x="5.5" y="32" width="11" height="6" rx="3" fill="#ededeb" />
      <rect x="13" y="41" width="11.5" height="5" rx="2.5" fill="#000" fillOpacity="0.08" />
    </svg>
  );
}

// Where the reference shows customer logos: a full-width band of logos
// and names that scrolls in a loop (src/lib/built-with.ts). No visible
// label; screen readers hear "Works with" and each name once. The list is
// drawn twice and slid by half its width, so the loop has no seam; the
// copy is hidden from screen readers. It stops on hover, and stands still
// for people who ask for less motion. 64px below the hairline, 50px tall.
/** Times the list repeats in each half of the loop. */
const REPEAT = 4;

function Band() {
  const t = useTranslations("Landing.band");
  // Each half of the loop repeats the list until it is wider than the
  // widest screen, so the band never shows a gap.
  const half = Array.from({ length: REPEAT }, () => builtWith).flat();
  const items = (copy: number) =>
    half.map(({ name, logo }, i) => (
      <li
        key={`${copy}-${i}`}
        aria-hidden={copy > 0 || i >= builtWith.length || undefined}
        className="flex shrink-0 items-center gap-2 pr-[100px] whitespace-nowrap text-ink"
      >
        {logo && <BrandLogo name={logo} className="size-5 shrink-0" />}
        <span className="text-[17px] font-semibold tracking-[-0.02em]">{name}</span>
      </li>
    ));
  return (
    <div className="group mt-16 flex min-h-[50px] items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul aria-label={t("label")} className="animate-marquee flex w-max [animation-duration:40s] group-hover:[animation-play-state:paused]">
        {items(0)}
        {items(1)}
      </ul>
    </div>
  );
}

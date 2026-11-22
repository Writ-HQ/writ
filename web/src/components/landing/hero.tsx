import { useTranslations } from "next-intl";

import { Pill } from "@/components/ui/pill";

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
        {/* The dashboard sits 136px below the top of the sky and runs off
            its right and bottom edges, as if on a larger screen. */}
        <div aria-hidden="true" className="absolute top-12 left-6 origin-top-left scale-[0.62] sm:top-20 sm:scale-[0.85] lg:top-[136px] lg:left-10 xl:scale-100">
          <DashboardMock />
        </div>
      </div>

      <Container>
        <div className="flex flex-col justify-center border-b border-[#f0f0f0] pb-14 lg:h-[594px] lg:max-w-[min(585px,calc(50vw-6rem))] lg:pb-0">
          <h1 className="max-w-[476px] text-[40px] leading-[38px] font-normal tracking-[-0.8px] text-balance">{t("title")}</h1>
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

// A slowly scrolling strip of the kinds of campaigns Writ is built for,
// faded at both ends. (The reference shows customer logos here; Writ has
// no customers yet, and none are invented.)
function Band() {
  const t = useTranslations("Landing.band");
  const items = (["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8"] as const).map((k) => t(k));

  const list = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-14 pr-14">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-[17px] font-medium tracking-[-0.02em] whitespace-nowrap text-ink/55">
          <span aria-hidden="true" className="h-2 w-2 rotate-45 rounded-[1px] bg-ink/35" />
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      aria-label={t("label")}
      role="region"
      className="group mt-16 h-[50px] overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_84px,#000_calc(100%-84px),transparent)]"
    >
      {/* Two copies side by side: moving left by one copy's width loops
          without a seam. */}
      <div className="animate-marquee flex h-full w-max group-hover:[animation-play-state:paused]">
        {list(false)}
        {list(true)}
      </div>
    </div>
  );
}

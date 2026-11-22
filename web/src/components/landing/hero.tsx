import { useTranslations } from "next-intl";

import { Pill } from "@/components/ui/pill";

import { DashboardMock } from "./mocks";

export function Hero() {
  const t = useTranslations("Landing.hero");

  // The section is pulled up by the navbar's height (-mt-16), so that on
  // wide screens the sky panel starts at the very top, behind the
  // transparent navbar.
  return (
    <section className="-mt-16 grid lg:grid-cols-2">
      <div className="flex flex-col justify-end px-5 pt-28 pb-14 sm:px-8 lg:pt-16 lg:pr-12 lg:pb-16 lg:pl-20 2xl:pl-[max(5rem,calc((100vw-1440px)/2+5rem))]">
        <h1 className="max-w-[600px] text-[40px] leading-[0.98] font-normal tracking-[-0.035em] text-balance sm:text-5xl lg:text-[60px]">
          {t("title")}
        </h1>
        <p className="mt-7 max-w-[480px] text-[17px] leading-[1.35] text-ink/90">{t("subtitle")}</p>
        <div className="mt-10">
          <Pill size="lg">{t("cta")}</Pill>
        </div>
      </div>

      {/* The dashboard sits 136px below the top of the sky and runs off its
          right and bottom edges, as if on a larger screen. */}
      <div
        role="img"
        aria-label={t("visualLabel")}
        className="bg-sky relative h-[440px] overflow-hidden shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_24px_40px_-12px_rgb(0_0_0/0.06),0_12px_24px_-6px_rgb(0_0_0/0.05),0_4px_8px_-2px_rgb(0_0_0/0.04),0_1px_3px_-1px_rgb(0_0_0/0.03)] sm:h-[560px] lg:h-[clamp(600px,calc(100dvh-36px),820px)]"
      >
        <div aria-hidden="true" className="absolute top-16 left-6 origin-top-left scale-[0.62] sm:top-24 sm:left-10 sm:scale-[0.85] lg:top-[136px] lg:left-16 xl:scale-100">
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}

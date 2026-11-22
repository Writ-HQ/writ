import { useTranslations } from "next-intl";

import { Pill } from "@/components/ui/pill";

import { DashboardMock } from "./mocks";

export function Hero() {
  const t = useTranslations("Landing.hero");

  return (
    <section className="grid lg:min-h-[calc(100dvh-100px)] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-5 pt-16 pb-14 sm:px-8 lg:py-20 lg:pr-12 lg:pl-20 2xl:pl-[max(5rem,calc((100vw-1440px)/2+5rem))]">
        <h1 className="max-w-[580px] text-[40px] leading-[0.98] font-normal tracking-[-0.035em] text-balance sm:text-5xl lg:text-[56px]">
          {t("title")}
        </h1>
        <p className="mt-7 max-w-[480px] text-[17px] leading-[1.35] text-ink/90">{t("subtitle")}</p>
        <div className="mt-10">
          <Pill size="lg">{t("cta")}</Pill>
        </div>
      </div>

      {/* The dashboard runs off the right edge, as if on a larger screen. */}
      <div role="img" aria-label={t("visualLabel")} className="bg-sky relative h-[400px] overflow-hidden sm:h-[520px] lg:h-auto">
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-6 origin-left -translate-y-1/2 scale-[0.62] sm:left-10 sm:scale-[0.85] lg:left-12 xl:scale-100"
        >
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}

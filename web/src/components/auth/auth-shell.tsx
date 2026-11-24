import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ArrowRight } from "@/components/ui/icons";
import { Logo, WritMark } from "@/components/ui/logo";
import { Link } from "@/i18n/navigation";

type Props = {
  /** This page's path without the locale, for the language links. */
  path: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Under the form: the link to the other page. */
  footer: ReactNode;
};

// The layout shared by the waitlist, log-in and sign-up pages: on the left,
// the full height of the window, a light panel with the Writ mark and one
// line, with soft colour in two corners; the form on the right. Below lg the sky is left out and the form fills
// the screen.
export function AuthShell({ path, title, subtitle, children, footer }: Props) {
  const t = useTranslations("Auth");

  return (
    <div className="flex min-h-dvh">
      <Panel />

      <main className="flex min-h-dvh flex-1 flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          {/* Large screens: an arrow back home (the logo is in the panel).
              Small screens: the logo, which also leads home. */}
          <Link href="/" aria-label={t("home")} className="lg:hidden">
            <Logo />
          </Link>
          <Link href="/" className="group hidden items-center gap-2.5 text-[15px] font-semibold text-ink lg:inline-flex">
            <ArrowRight className="size-[18px] rotate-180 transition-transform group-hover:-translate-x-0.5" />
            {t("backHome")}
          </Link>
          <LocaleSwitcher compact href={path} />
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <h1 className="text-[32px] leading-[36px] font-medium tracking-[-0.03em]">{title}</h1>
          <p className="mt-2 text-[15px] text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-muted">{footer}</p>
        </div>
      </main>
    </div>
  );
}

function Panel() {
  const t = useTranslations("Auth");
  return (
    <aside className="sticky top-0 hidden h-dvh w-1/2 shrink-0 overflow-hidden bg-[#fbfbfa] lg:block">
      {/* Soft gradients in two corners: sky blue top left, warm sand bottom right. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 75% 60% at 0% 0%, rgb(157 207 235 / 0.85), rgb(157 207 235 / 0.35) 45%, transparent 75%)",
            "radial-gradient(ellipse 45% 35% at 18% 12%, rgb(110 168 214 / 0.35), transparent 70%)",
            "radial-gradient(ellipse 75% 60% at 100% 100%, rgb(240 206 166 / 0.85), rgb(240 206 166 / 0.35) 45%, transparent 75%)",
            "radial-gradient(ellipse 45% 35% at 84% 88%, rgb(222 168 112 / 0.3), transparent 70%)",
          ].join(","),
        }}
      />

      <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
        <Link href="/" aria-label={t("home")} className="text-ink transition-opacity hover:opacity-70">
          <WritMark withDot className="h-12 w-auto" />
        </Link>
        <p className="mt-8 max-w-[440px] text-[34px] leading-[38px] font-normal tracking-[-0.03em] text-balance text-ink">{t("panel.title")}</p>
      </div>
    </aside>
  );
}

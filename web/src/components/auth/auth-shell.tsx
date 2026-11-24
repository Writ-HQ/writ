import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Home } from "@/components/ui/icons";
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
// line, over halftone dots in two corners; the form on the right. Below lg the sky is left out and the form fills
// the screen.
export function AuthShell({ path, title, subtitle, children, footer }: Props) {
  const t = useTranslations("Auth");

  return (
    <div className="flex min-h-dvh">
      <Panel />

      <main className="flex min-h-dvh flex-1 flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          {/* Large screens: a small Home button (the logo is in the panel).
              Small screens: the logo, which also leads home. */}
          <Link href="/" aria-label={t("home")} className="lg:hidden">
            <Logo />
          </Link>
          <Link
            href="/"
            className="hidden h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink/70 ring-1 ring-line transition-colors hover:bg-panel hover:text-ink lg:inline-flex"
          >
            <Home className="size-3.5" strokeWidth={1.8} />
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

// The halftone in the panel's corners: a grid of small dots, tinted, shown
// only where an elliptical mask lets it through, so it fades to nothing
// towards the middle. Light-theme take on a dark reference.
const dots = (color: string) => `radial-gradient(circle, ${color} 1.7px, transparent 2.3px)`;
const corner = (at: string) => `radial-gradient(ellipse 85% 70% at ${at}, black 0%, rgb(0 0 0 / 0.7) 35%, transparent 75%)`;

function Panel() {
  const t = useTranslations("Auth");
  return (
    <aside className="sticky top-0 hidden h-dvh w-1/2 shrink-0 overflow-hidden bg-[#fbfbfa] lg:block">
      {/* Sky blue dots top left, warm sand bottom right, each with a soft wash behind. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `${dots("rgb(60 132 192 / 0.75)")}, radial-gradient(ellipse 70% 55% at 0% 0%, rgb(157 207 235 / 0.35), transparent 70%)`,
          backgroundSize: "9px 9px, 100% 100%",
          maskImage: corner("0% 0%"),
          WebkitMaskImage: corner("0% 0%"),
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `${dots("rgb(200 136 70 / 0.75)")}, radial-gradient(ellipse 70% 55% at 100% 100%, rgb(236 204 168 / 0.4), transparent 70%)`,
          backgroundSize: "9px 9px, 100% 100%",
          maskImage: corner("100% 100%"),
          WebkitMaskImage: corner("100% 100%"),
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

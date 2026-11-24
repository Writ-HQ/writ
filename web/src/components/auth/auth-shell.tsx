import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { DashboardMock } from "@/components/landing/mocks";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Check } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
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

// The layout shared by the log-in and sign-up pages: the sky on the left,
// the full height of the window, with the product running off its edge;
// the form on the right. Below lg the sky is left out and the form fills
// the screen.
export function AuthShell({ path, title, subtitle, children, footer }: Props) {
  const t = useTranslations("Auth");

  return (
    <div className="flex min-h-dvh">
      <Panel />

      <main className="flex min-h-dvh flex-1 flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          {/* The logo is in the sky on large screens. */}
          <Link href="/" aria-label={t("home")} className="lg:invisible">
            <Logo />
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
  const points = (["canada", "languages", "mfa"] as const).map((k) => t(`panel.points.${k}`));

  return (
    <aside className="bg-sky sticky top-0 hidden h-dvh w-1/2 shrink-0 overflow-hidden lg:block">
      <Link href="/" aria-label={t("home")} className="absolute top-6 left-10 z-10">
        <Logo />
      </Link>

      {/* The product, as on the landing page: starting below the logo and
          running off the right edge, as if on a larger screen. */}
      <div aria-hidden="true" className="absolute top-[112px] left-10 origin-top-left scale-[0.8] xl:scale-90">
        <DashboardMock />
      </div>

      <div className="absolute inset-x-10 bottom-10 z-10 rounded-[14px] border border-white/60 bg-white/70 p-7 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.18)] backdrop-blur-md">
        <p className="max-w-[420px] text-[26px] leading-[30px] font-medium tracking-[-0.03em]">{t("panel.title")}</p>
        <ul className="mt-5 grid gap-2.5">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-2.5 text-sm">
              <span className="flex size-5 items-center justify-center rounded-full bg-ink text-white">
                <Check className="size-3" strokeWidth={2.25} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

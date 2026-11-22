import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { WritMark } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";

import { Container } from "./container";

type FooterLink = { label: string; href?: string };

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-[13px] text-white/50">{title}</p>
      <ul className="mt-4 space-y-2 border-l border-white/20 pl-4 text-[14px]">
        {links.map(({ label, href }) => (
          <li key={label}>
            {href ? (
              <a href={href} className="text-white/90 transition-colors hover:text-white">
                {label}
              </a>
            ) : (
              <button type="button" className="text-left text-white/90 transition-colors hover:text-white">
                {label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const t = useTranslations("Landing");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-white">
      <Container className="pt-16 pb-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-2 self-start">
            <WritMark className="h-6 w-6 text-white" style={{ ["--writ-cut" as string]: "#000" }} />
            <span className="text-[19px] font-semibold tracking-[-0.03em]">Writ</span>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-12 sm:grid-cols-4 lg:gap-x-14">
            <Column
              title={t("footer.product")}
              links={[
                { label: t("overview.contacts.title"), href: "#contacts" },
                { label: t("overview.lists.title"), href: "#overview" },
                { label: t("overview.email.title"), href: "#email" },
                { label: t("overview.social.title"), href: "#social" },
                { label: t("overview.volunteers.title"), href: "#volunteers" },
                { label: t("overview.consent.title"), href: "#consent" },
              ]}
            />
            <Column
              title={t("footer.solutions")}
              links={[
                { label: t("builtFor.candidates.title"), href: "#built-for" },
                { label: t("builtFor.ridings.title"), href: "#built-for" },
                { label: t("builtFor.advocacy.title"), href: "#built-for" },
              ]}
            />
            <Column
              title={t("footer.company")}
              links={[{ label: t("footer.about") }, { label: t("footer.contact") }, { label: t("footer.privacy") }, { label: t("footer.terms") }]}
            />
            <div>
              <p className="text-[13px] text-white/50">{t("footer.getStarted")}</p>
              <div className="mt-4 flex flex-col items-start gap-2.5">
                <Pill variant="solid-inverse" size="sm">
                  {t("nav.waitlist")}
                </Pill>
                <Pill variant="outline-inverse" size="sm">
                  {t("nav.demo")}
                </Pill>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-6 border-t border-white/15 pt-8 text-[12px] text-white/55 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[560px] space-y-2">
            <p>{t("footer.nonPartisan")}</p>
            <p>{t("footer.copyright", { year })}</p>
          </div>
          <LocaleSwitcher inverse />
        </div>
      </Container>
    </footer>
  );
}

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { Link } from "@/i18n/navigation";

import { Container } from "./container";

// Measurements from the reference footer at 1470px wide: 46px of top
// padding; the logo top-left and the copyright bottom-left; five 153px
// link columns starting 417px in, 32px apart; notes 56px below them in two
// columns; then a closing line in large type.

type FooterLink = { label: string; href?: string };

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base leading-[21px] font-normal text-white/60">{title}</h2>
      <ul className="flex flex-col gap-2 border-l border-white pl-4">
        {links.map(({ label, href }) => (
          <li key={label}>
            {href ? (
              <Link href={href} className="inline-block text-base leading-[21px] font-medium text-white hover:text-white/70">
                {label}
              </Link>
            ) : (
              <button type="button" className="inline-block text-left text-base leading-[21px] font-medium text-white hover:text-white/70">
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
  const f = useTranslations("Landing.footer");
  const year = new Date().getFullYear();
  const notes = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10"] as const;

  return (
    <footer className="overflow-hidden bg-ink pt-[46px] text-white">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[385px_1fr] lg:gap-8">
          {/* Logo at the top, copyright at the bottom. */}
          <div className="flex flex-col justify-between gap-10 lg:py-8 max-lg:order-last">
            <Logo className="max-lg:hidden" />
            <div className="space-y-1">
              <p className="text-xs leading-4 font-medium">{f("copyright", { year })}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-4 font-medium text-faint">
                <Link href="/terms" className="underline underline-offset-2 hover:text-white">
                  {f("terms")}
                </Link>
                <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
                  {f("privacy")}
                </Link>
                <span aria-hidden="true">·</span>
                <LocaleSwitcher inverse className="text-xs" />
              </div>
            </div>
          </div>

          <div>
            <Logo className="lg:hidden" />
            <nav aria-label={f("product")} className="grid grid-cols-2 gap-8 max-lg:mt-10 sm:grid-cols-3 lg:grid-cols-5 lg:py-8">
              <LinkColumn
                title={f("product")}
                links={[
                  { label: t("overview.contacts.title"), href: "/#contacts" },
                  { label: t("overview.lists.title"), href: "/#overview" },
                  { label: t("overview.email.title"), href: "/#email" },
                  { label: t("overview.social.title"), href: "/#social" },
                  { label: t("overview.volunteers.title"), href: "/#volunteers" },
                  { label: t("overview.consent.title"), href: "/#consent" },
                ]}
              />
              <LinkColumn
                title={f("solutions")}
                links={[
                  { label: t("builtFor.candidates.title"), href: "/#built-for" },
                  { label: t("builtFor.ridings.title"), href: "/#built-for" },
                  { label: t("builtFor.offices.title"), href: "/#built-for" },
                  { label: t("builtFor.advocacy.title"), href: "/#built-for" },
                ]}
              />
              <LinkColumn
                title={f("company")}
                links={[
                  { label: f("about") },
                  { label: f("manifesto"), href: "/manifesto" },
                  { label: f("contact"), href: "/contact" },
                  { label: f("privacy"), href: "/privacy" },
                  { label: f("terms"), href: "/terms" },
                ]}
              />
              <LinkColumn
                title={f("resources")}
                links={[
                  { label: f("help") },
                  { label: f("security"), href: "/#security" },
                  { label: f("accessibility") },
                  { label: f("status") },
                  { label: f("cookies"), href: "/cookies" },
                  { label: f("subprocessors"), href: "/subprocessors" },
                ]}
              />
              <div className="flex flex-col gap-4">
                <h2 className="text-sm leading-[18px] font-medium text-white/60">{f("getStarted")}</h2>
                <div className="flex flex-col items-start gap-2">
                  <Pill variant="solid-inverse" size="sm" href="/waitlist">
                    {t("nav.start")}
                  </Pill>
                  <Pill variant="outline-inverse" size="sm" href="/contact?topic=demo">
                    {t("nav.demo")}
                  </Pill>
                </div>
              </div>
            </nav>

            <section aria-labelledby="footer-notes" className="mt-14">
              <h2 id="footer-notes" className="text-sm leading-[18px] font-medium text-white/60">
                {f("notesTitle")}
              </h2>
              {/* Two columns of five, numbered down each column. The number
                  sits in a fixed-width column so every note's text lines up,
                  including after "10.". */}
              <div className="mt-4 grid gap-[10px] sm:grid-cols-2 sm:gap-8">
                {[notes.slice(0, 5), notes.slice(5)].map((group, g) => (
                  <ol key={g} start={g * 5 + 1} className="flex flex-col gap-[10px]">
                    {group.map((n, i) => (
                      <li key={n} className="grid grid-cols-[1.375rem_1fr] text-xs leading-4 text-faint">
                        <span className="tabular-nums">{g * 5 + i + 1}.</span>
                        <span>
                          {n === "n10"
                            ? f.rich("n10", {
                                terms: (chunks) => <NoteLink href="/terms">{chunks}</NoteLink>,
                                privacy: (chunks) => <NoteLink href="/privacy">{chunks}</NoteLink>,
                              })
                            : f(n)}
                        </span>
                      </li>
                    ))}
                  </ol>
                ))}
              </div>
            </section>
          </div>
        </div>
      </Container>

      {/* A closing line, large, across the foot of the page. */}
      <Container>
        <p className="pt-10 pb-14 text-[44px] leading-[0.95] font-medium tracking-[-0.045em] text-balance text-white sm:text-[64px] lg:pt-14 lg:pb-20 lg:text-[96px]">
          {f("closingLine")}
        </p>
      </Container>
    </footer>
  );
}

// A link inside a note: white and underlined, as in the reference.
function NoteLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
      {children}
    </Link>
  );
}


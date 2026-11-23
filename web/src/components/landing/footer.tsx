import { useTranslations } from "next-intl";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { Chat, Globe, Home, Ledger, Mail, MapleLeaf, Users } from "@/components/ui/icons";
import { Logo, WritMark } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";

import { Container } from "./container";

// Measurements from the reference footer at 1470px wide: 46px of top
// padding; the logo top-left and the copyright bottom-left; five 153px
// link columns starting 417px in, 32px apart; notes 56px below them in two
// columns; then a strip of stamps, cut off by the bottom of the page.

type FooterLink = { label: string; href?: string };

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base leading-[21px] font-normal text-white/60">{title}</h2>
      <ul className="flex flex-col gap-2 border-l border-white pl-4">
        {links.map(({ label, href }) => (
          <li key={label}>
            {href ? (
              <a href={href} className="inline-block text-base leading-[21px] font-medium text-white hover:text-white/70">
                {label}
              </a>
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
                <button type="button" className="underline underline-offset-2 hover:text-white">
                  {f("terms")}
                </button>
                <button type="button" className="underline underline-offset-2 hover:text-white">
                  {f("privacy")}
                </button>
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
                  { label: t("overview.contacts.title"), href: "#contacts" },
                  { label: t("overview.lists.title"), href: "#overview" },
                  { label: t("overview.email.title"), href: "#email" },
                  { label: t("overview.social.title"), href: "#social" },
                  { label: t("overview.volunteers.title"), href: "#volunteers" },
                  { label: t("overview.consent.title"), href: "#consent" },
                ]}
              />
              <LinkColumn
                title={f("solutions")}
                links={[
                  { label: t("builtFor.candidates.title"), href: "#built-for" },
                  { label: t("builtFor.ridings.title"), href: "#built-for" },
                  { label: t("builtFor.advocacy.title"), href: "#built-for" },
                ]}
              />
              <LinkColumn title={f("company")} links={[{ label: f("about") }, { label: f("contact") }, { label: f("privacy") }, { label: f("terms") }]} />
              <LinkColumn
                title={f("resources")}
                links={[{ label: f("help") }, { label: f("security"), href: "#security" }, { label: f("accessibility") }, { label: f("status") }]}
              />
              <div className="flex flex-col gap-4">
                <h2 className="text-sm leading-[18px] font-medium text-white/60">{f("getStarted")}</h2>
                <div className="flex flex-col items-start gap-2">
                  <Pill variant="solid-inverse" size="sm">
                    {t("nav.start")}
                  </Pill>
                  <Pill variant="outline-inverse" size="sm">
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
                                terms: (chunks) => <NoteLink>{chunks}</NoteLink>,
                                privacy: (chunks) => <NoteLink>{chunks}</NoteLink>,
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

      <Stamps />
    </footer>
  );
}

// A link inside a note: white and underlined, as in the reference. Not
// wired to a page yet.
function NoteLink({ children }: { children: ReactNode }) {
  return (
    <button type="button" className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
      {children}
    </button>
  );
}

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

// Muted colours only: none of them is a party colour at full strength.
const stamps: { icon: IconType; className: string }[] = [
  { icon: MapleLeaf, className: "bg-sky" },
  { icon: Mail, className: "bg-[#e9dcc4]" },
  { icon: Users, className: "bg-[#d9d0ea]" },
  { icon: Ledger, className: "bg-[#cfdcc4]" },
  { icon: Chat, className: "bg-mist" },
  { icon: Globe, className: "bg-[#d6d3cd]" },
  { icon: Home, className: "bg-[#e7d6d0]" },
  { icon: WritMark, className: "bg-[#c9dbe3]" },
  { icon: MapleLeaf, className: "bg-[#e9dcc4]" },
  { icon: Mail, className: "bg-sky" },
];

// A strip of postage stamps along the bottom edge, drawn in CSS: white
// paper with a perforated edge (black half-circles bitten out of each
// side) around a printed panel with a fine halftone. Decorative.
function Stamps() {
  const perforation = (at: string) => `radial-gradient(circle at ${at}, #000 4px, transparent 4.5px)`;
  return (
    <div aria-hidden="true" className="mt-14 flex h-[192px] justify-center overflow-hidden pt-16">
      {stamps.map(({ icon: Icon, className }, i) => (
        <span key={i} className="shrink-0 px-4">
          <span
            className="block h-[184px] w-[145px] bg-white p-[11px]"
            style={{
              backgroundImage: [perforation("6px 0"), perforation("6px 12px"), perforation("0 6px"), perforation("12px 6px")].join(","),
              backgroundSize: "12px 12px",
              backgroundPosition: "0 0, 0 100%, 0 0, 100% 0",
              backgroundRepeat: "repeat-x, repeat-x, repeat-y, repeat-y",
            }}
          >
            <span className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}>
              <span className="absolute inset-0 bg-[radial-gradient(rgb(0_0_0/0.13)_0.7px,transparent_0.9px)] bg-[length:4px_4px]" />
              <Icon className="relative h-16 w-16 text-ink/55" />
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}

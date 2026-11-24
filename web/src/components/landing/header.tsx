import { useTranslations } from "next-intl";
import type { ComponentType, SVGProps } from "react";

import {
  ArrowRight,
  BriefcaseSolid,
  BuildingSolid,
  ChatSolid,
  ChevronDown,
  InfoSolid,
  LayersSolid,
  LedgerSolid,
  LifebuoySolid,
  ListSolid,
  LockSolid,
  MailSolid,
  NewspaperSolid,
  ShieldSolid,
  UsersSolid,
} from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { Link } from "@/i18n/navigation";
import { authPagesEnabled } from "@/lib/flags";

type MenuItem = {
  label: string;
  desc?: string;
  /** An anchor on this page. Items without one are not wired up yet. */
  href?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

// One entry in a menu: an 18px solid icon, like the rest of the site, and
// a 15px medium label, 12px apart, in a row that turns pale
// grey on hover.
// Descriptions show only in the small-screen menu, where there is no card.
function MenuEntry({ item, compact = true }: { item: MenuItem; compact?: boolean }) {
  const Icon = item.icon;
  const body = (
    <>
      {Icon && (
        <Icon className="h-[18px] w-[18px] shrink-0 text-ink" />
      )}
      <span>
        <span className="block text-[15px] leading-5 font-medium">{item.label}</span>
        {!compact && item.desc && <span className="mt-0.5 block text-[12px] leading-snug text-muted">{item.desc}</span>}
      </span>
    </>
  );
  const classes = "flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left transition-colors hover:bg-[#f3f3f3]";
  return item.href ? (
    <Link href={item.href} className={classes}>
      {body}
    </Link>
  ) : (
    <button type="button" className={classes}>
      {body}
    </button>
  );
}

const ArrowUpRight = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

// Skies for the cards beside the menus: dusk (Product), day (Solutions)
// and dawn (Company). Muted, so none reads as a party colour.
const SKIES = {
  dusk: [
    "linear-gradient(to top, rgb(16 28 26 / 0.92), rgb(16 28 26 / 0.25) 38%, transparent 55%)",
    "radial-gradient(ellipse 70% 28% at 78% 58%, rgb(214 160 170 / 0.75), transparent 70%)",
    "radial-gradient(ellipse 60% 22% at 22% 72%, rgb(196 150 166 / 0.6), transparent 70%)",
    "radial-gradient(ellipse 80% 30% at 50% 46%, rgb(236 222 222 / 0.85), transparent 70%)",
    "linear-gradient(rgb(104 104 150), rgb(160 140 172) 35%, rgb(214 190 196) 55%, rgb(60 72 70) 80%, rgb(28 40 38))",
  ],
  day: [
    "linear-gradient(to top, rgb(18 40 60 / 0.85), rgb(18 40 60 / 0.2) 38%, transparent 55%)",
    "radial-gradient(ellipse 70% 26% at 74% 40%, rgb(255 255 255 / 0.8), transparent 70%)",
    "radial-gradient(ellipse 60% 20% at 24% 58%, rgb(255 255 255 / 0.6), transparent 70%)",
    "linear-gradient(rgb(92 150 204), rgb(140 190 230) 40%, rgb(190 220 240) 60%, rgb(60 96 122) 82%, rgb(24 44 60))",
  ],
  dawn: [
    "linear-gradient(to top, rgb(40 30 24 / 0.9), rgb(40 30 24 / 0.2) 38%, transparent 55%)",
    "radial-gradient(ellipse 70% 26% at 70% 60%, rgb(250 214 170 / 0.8), transparent 70%)",
    "radial-gradient(ellipse 60% 22% at 26% 48%, rgb(244 226 206 / 0.7), transparent 70%)",
    "linear-gradient(rgb(120 132 160), rgb(196 176 170) 38%, rgb(236 204 168) 58%, rgb(92 80 68) 82%, rgb(40 32 26))",
  ],
} as const;

export type MenuCard = { caption: string; sky: keyof typeof SKIES; href?: string };

// The card beside a menu: a sky with a caption, as in the reference's
// announcement card. A link when it has somewhere to go.
function FeatureCard({ caption, sky, href }: MenuCard) {
  const classes = "group/card relative flex h-[277px] w-[242px] shrink-0 flex-col justify-between overflow-hidden rounded-[6px] p-4 text-left text-white";
  const style = { backgroundImage: SKIES[sky].join(",") };
  const body = (
    <>
      <ArrowUpRight className="ml-auto h-6 w-6 transition-transform group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5" />
      <span className="max-w-[200px] text-base leading-[21px] font-medium">{caption}</span>
    </>
  );
  return href ? (
    <Link href={href} className={classes} style={style}>
      {body}
    </Link>
  ) : (
    <button type="button" className={classes} style={style}>
      {body}
    </button>
  );
}

// A menu that opens on hover and on keyboard focus, without JavaScript: a
// white panel with a 220px column of entries and a card beside it.
// Beside the card the entries spread out to its full height.
function Dropdown({ label, items, card }: { label: string; items: MenuItem[]; card?: MenuCard }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-haspopup="true"
        className="flex h-16 items-center gap-1 px-2.5 text-sm leading-[14px] font-semibold text-ink transition-colors"
      >
        {label}
        <ChevronDown className="h-3 w-3 transition-transform group-focus-within:rotate-180 group-hover:rotate-180" />
      </button>
      <div className="invisible absolute top-full -left-2.5 -mt-3 translate-y-1 opacity-0 transition-all duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="flex gap-3 rounded-[20px] bg-white p-3 shadow-[0_0_0_1px_rgb(0_0_0/0.04),0_24px_48px_-16px_rgb(0_0_0/0.18),0_8px_16px_-8px_rgb(0_0_0/0.08)]">
          <div className={`flex w-[220px] flex-col gap-0.5 ${card ? "justify-between" : "py-0.5"}`}>
            {items.map((item) => (
              <MenuEntry key={item.label} item={item} />
            ))}
          </div>
          {card && <FeatureCard {...card} />}
        </div>
      </div>
    </div>
  );
}

function useMenus() {
  const t = useTranslations("Landing");
  const product: MenuItem[] = [
    { label: t("overview.contacts.title"), desc: t("overview.contacts.desc"), href: "/#contacts", icon: UsersSolid },
    { label: t("overview.lists.title"), desc: t("overview.lists.desc"), href: "/#overview", icon: ListSolid },
    { label: t("overview.email.title"), desc: t("overview.email.desc"), href: "/#email", icon: MailSolid },
    { label: t("overview.social.title"), desc: t("overview.social.desc"), href: "/#social", icon: ChatSolid },
    { label: t("overview.volunteers.title"), desc: t("overview.volunteers.desc"), href: "/#volunteers", icon: LayersSolid },
    { label: t("overview.consent.title"), desc: t("overview.consent.desc"), href: "/#consent", icon: ShieldSolid },
  ];
  const solutions: MenuItem[] = [
    { label: t("builtFor.candidates.title"), href: "/#built-for", icon: UsersSolid },
    { label: t("builtFor.ridings.title"), href: "/#built-for", icon: BuildingSolid },
    { label: t("builtFor.offices.title"), href: "/#built-for", icon: BriefcaseSolid },
    { label: t("builtFor.advocacy.title"), href: "/#built-for", icon: ChatSolid },
  ];
  const company: MenuItem[] = [
    { label: t("nav.about"), icon: InfoSolid },
    { label: t("nav.manifesto"), href: "/manifesto", icon: LedgerSolid },
    { label: t("nav.blog"), icon: NewspaperSolid },
    { label: t("nav.help"), icon: LifebuoySolid },
    { label: t("nav.contact"), href: "/contact", icon: MailSolid },
    { label: t("nav.security"), icon: ShieldSolid },
    { label: t("nav.privacy"), href: "/privacy", icon: LockSolid },
  ];
  return { product, solutions, company };
}

export function AnnouncementBar() {
  const t = useTranslations("Landing.announcement");
  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex min-h-10 max-w-[1440px] flex-wrap items-center justify-center gap-x-2 px-5 py-2 text-center text-sm leading-[21px] font-medium">
        <span>{t("text")}</span>
        <button type="button" className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline">
          {t("cta")}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// A blur that is strongest at the top edge and fades to nothing at the
// bottom: eight stacked layers, each blurring twice as much as the one
// below it, each masked to an overlapping band of the height.
const blurLayers = [0.078125, 0.15625, 0.3125, 0.625, 1.25, 2.5, 5, 10].map((px, i) => {
  const band = (n: number) => `${n * 12.5}%`;
  const stops =
    i === 0
      ? `transparent 0%, #000 ${band(1)}, #000 ${band(2)}, transparent ${band(3)}`
      : i === 6
        ? `transparent ${band(6)}, #000 ${band(7)}, #000 100%`
        : i === 7
          ? `transparent ${band(7)}, #000 100%`
          : `transparent ${band(i)}, #000 ${band(i + 1)}, #000 ${band(i + 2)}, transparent ${band(i + 3)}`;
  const mask = `linear-gradient(to top, ${stops})`;
  return { blur: `blur(${px}px)`, mask, z: i + 1 };
});

function ProgressiveBlur() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {blurLayers.map(({ blur, mask, z }) => (
        <div
          key={z}
          className="absolute inset-0"
          style={{ zIndex: z, backdropFilter: blur, WebkitBackdropFilter: blur, maskImage: mask, WebkitMaskImage: mask }}
        />
      ))}
    </div>
  );
}

export function Navbar() {
  const t = useTranslations("Landing.nav");
  const menus = useMenus();

  // Transparent and borderless: the hero's sky runs up behind it, and the
  // page blurs progressively as it scrolls underneath.
  return (
    <header className="sticky top-0 z-50 h-16 bg-white/[0.02]">
      <ProgressiveBlur />
      <div className="relative z-10 mx-auto flex h-16 max-w-[1440px] items-center gap-10 px-5 sm:px-8 lg:px-16">
        <Link href="/" aria-label={t("home")} className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav aria-label={t("menu")} className="hidden items-center gap-4 lg:flex [&:has(>div:hover)>div:not(:hover)>button]:text-ink/45 [&:has(>div:focus-within)>div:not(:focus-within)>button]:text-ink/45">
          <Dropdown label={t("product")} items={menus.product} card={{ caption: t("featureCard"), sky: "dusk" }} />
          <Dropdown label={t("solutions")} items={menus.solutions} card={{ caption: t("solutionsCard"), sky: "day", href: "/#built-for" }} />
          <Dropdown label={t("company")} items={menus.company} card={{ caption: t("companyCard"), sky: "dawn", href: "/manifesto" }} />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Log in returns with the auth pages (src/lib/flags.ts). */}
          {authPagesEnabled && (
            <Link href="/login" className="hidden h-8 items-center rounded-full px-4 text-sm leading-[18px] font-medium hover:bg-ink/5 md:inline-flex">
              {t("login")}
            </Link>
          )}
          <Pill variant="outline" size="sm" href="/contact?topic=demo" className="hidden md:inline-flex">
            {t("demo")}
          </Pill>
          <Pill size="sm" href="/waitlist">
            {t("start")}
          </Pill>

          {/* Small screens: the same links in a disclosure. */}
          <details className="group relative lg:hidden">
            <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full ring-1 ring-line [&::-webkit-details-marker]:hidden">
              <span className="sr-only">{t("menu")}</span>
              <span aria-hidden="true" className="flex flex-col gap-1">
                <span className="block h-px w-3.5 bg-ink transition group-open:translate-y-[2.5px] group-open:rotate-45" />
                <span className="block h-px w-3.5 bg-ink transition group-open:-translate-y-[2.5px] group-open:-rotate-45" />
              </span>
            </summary>
            <div className="absolute top-11 right-0 w-[min(88vw,360px)] rounded-xl bg-white p-3 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.25)] ring-1 ring-line">
              {[
                [t("product"), menus.product],
                [t("solutions"), menus.solutions],
                [t("company"), menus.company],
              ].map(([label, items]) => (
                <div key={label as string} className="border-b border-line py-2 last:border-0">
                  <p className="px-2.5 pb-1 text-[11px] font-medium text-muted uppercase">{label as string}</p>
                  {(items as MenuItem[]).map((item) => (
                    <MenuEntry key={item.label} item={item} />
                  ))}
                </div>
              ))}
              <div className="flex items-center justify-end gap-3 pt-3">
                <div className="flex gap-2">
                  {authPagesEnabled && (
                    <Link href="/login" className="inline-flex items-center text-[13px] font-medium">
                      {t("login")}
                    </Link>
                  )}
                  <Pill variant="outline" size="sm" href="/contact?topic=demo">
                    {t("demo")}
                  </Pill>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

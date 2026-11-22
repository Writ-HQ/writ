import { useTranslations } from "next-intl";
import type { ComponentType, SVGProps } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ArrowRight, Building, Chat, ChevronDown, Layers, ListIcon, Mail, Shield, Users, WritMark } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { Link } from "@/i18n/navigation";

type MenuItem = {
  label: string;
  desc?: string;
  /** An anchor on this page. Items without one are not wired up yet. */
  href?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

function MenuEntry({ item }: { item: MenuItem }) {
  const Icon = item.icon;
  const body = (
    <>
      {Icon && (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-panel ring-1 ring-line">
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <span>
        <span className="block text-[13px] font-medium">{item.label}</span>
        {item.desc && <span className="mt-0.5 block text-[12px] leading-snug text-muted">{item.desc}</span>}
      </span>
    </>
  );
  const classes = "flex w-full gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-panel";
  return item.href ? (
    <a href={item.href} className={classes}>
      {body}
    </a>
  ) : (
    <button type="button" className={classes}>
      {body}
    </button>
  );
}

// A menu that opens on hover and on keyboard focus, without JavaScript.
function Dropdown({ label, items, wide = false }: { label: string; items: MenuItem[]; wide?: boolean }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-haspopup="true"
        className="flex h-16 items-center gap-1 text-[13px] font-medium text-ink/85 transition-colors hover:text-ink"
      >
        {label}
        <ChevronDown className="h-3 w-3 transition-transform group-focus-within:rotate-180 group-hover:rotate-180" />
      </button>
      <div className="invisible absolute top-full left-0 -mt-2 opacity-0 transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div
          className={`grid gap-0.5 rounded-xl bg-white p-2 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.25)] ring-1 ring-line ${wide ? "w-[560px] grid-cols-2" : "w-[280px]"}`}
        >
          {items.map((item) => (
            <MenuEntry key={item.label} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function useMenus() {
  const t = useTranslations("Landing");
  const product: MenuItem[] = [
    { label: t("overview.contacts.title"), desc: t("overview.contacts.desc"), href: "#contacts", icon: Users },
    { label: t("overview.lists.title"), desc: t("overview.lists.desc"), href: "#overview", icon: ListIcon },
    { label: t("overview.email.title"), desc: t("overview.email.desc"), href: "#email", icon: Mail },
    { label: t("overview.social.title"), desc: t("overview.social.desc"), href: "#social", icon: Chat },
    { label: t("overview.volunteers.title"), desc: t("overview.volunteers.desc"), href: "#volunteers", icon: Layers },
    { label: t("overview.consent.title"), desc: t("overview.consent.desc"), href: "#consent", icon: Shield },
  ];
  const solutions: MenuItem[] = [
    { label: t("builtFor.candidates.title"), href: "#built-for", icon: Users },
    { label: t("builtFor.ridings.title"), href: "#built-for", icon: Building },
    { label: t("builtFor.advocacy.title"), href: "#built-for", icon: Chat },
  ];
  const company: MenuItem[] = [{ label: t("nav.about") }, { label: t("nav.contact") }, { label: t("nav.privacy") }];
  return { product, solutions, company };
}

export function AnnouncementBar() {
  const t = useTranslations("Landing.announcement");
  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex min-h-9 max-w-[1440px] flex-wrap items-center justify-center gap-x-2 px-5 py-2 text-center text-[13px]">
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
      <div className="relative z-10 mx-auto flex h-16 max-w-[1440px] items-center gap-10 px-5 sm:px-8 lg:px-20">
        <Link href="/" aria-label={t("home")} className="flex items-center gap-2">
          <WritMark className="h-6 w-6 text-ink" />
          <span className="text-[19px] font-semibold tracking-[-0.03em]">Writ</span>
        </Link>

        <nav aria-label={t("menu")} className="hidden items-center gap-7 lg:flex">
          <Dropdown label={t("product")} items={menus.product} wide />
          <Dropdown label={t("solutions")} items={menus.solutions} />
          <Dropdown label={t("company")} items={menus.company} />
        </nav>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <LocaleSwitcher compact className="hidden sm:flex" />
          <button type="button" className="hidden text-[13px] font-medium text-ink/85 hover:text-ink md:block">
            {t("login")}
          </button>
          <Pill variant="outline" size="sm" className="hidden md:inline-flex">
            {t("demo")}
          </Pill>
          <Pill size="sm">{t("waitlist")}</Pill>

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
                    <MenuEntry key={item.label} item={{ ...item, desc: undefined }} />
                  ))}
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 pt-3">
                <LocaleSwitcher compact />
                <div className="flex gap-2">
                  <button type="button" className="text-[13px] font-medium">
                    {t("login")}
                  </button>
                  <Pill variant="outline" size="sm">
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

"use client";

import { useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

import { WritMark } from "@/components/ui/logo";
import { Link, usePathname } from "@/i18n/navigation";

import { account, offices } from "./data";
import { Glyph } from "./kit";
import { sections } from "./sections";
import { useStored } from "./use-stored";


function Wordmark({ hideWhenSlim = false }: { hideWhenSlim?: boolean }) {
  return (
    <span className="flex items-center gap-2 px-1">
      <WritMark withDot className="h-[17px] w-auto shrink-0" />
      <span className={`font-serif text-[25px] leading-5 font-normal tracking-[-0.01em] ${hideWhenSlim ? "lg:hidden" : ""}`}>Writ</span>
    </span>
  );
}

/** The account row at the foot of the sidebar, with its own small menu. */
function AccountRow({ slim }: { slim: boolean }) {
  const t = useTranslations("Dashboard.shell");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative mt-1 border-t border-ink/[0.07] pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={slim ? account.name : undefined}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-ink/[0.04] ${slim ? "lg:justify-center lg:px-0" : ""}`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-bright text-[11.5px] font-medium text-ink">
          {account.initials}
        </span>
        <span className={`min-w-0 flex-1 ${slim ? "lg:hidden" : ""}`}>
          <span className="block truncate text-[13.5px] font-medium">{account.name}</span>
          <span className="block truncate text-[12px] text-muted">{account.email}</span>
        </span>
        <Glyph className={`size-3.5 shrink-0 text-faint ${slim ? "lg:hidden" : ""}`} d="M5 10l3 3 3-3M5 6l3-3 3 3" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-1 w-full min-w-[200px] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_12px_32px_-12px_rgb(15_23_42/0.25)]"
        >
          <Link href="/app/settings" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2 text-[13.5px] text-ink/75 hover:bg-panel hover:text-ink">
            {t("profile")}
          </Link>
          <Link href="/login" role="menuitem" className="block border-t border-line/70 px-3 py-2 text-[13.5px] text-ink/75 hover:bg-panel hover:text-ink">
            {t("signOut")}
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * The signed-in shell: a sidebar with the sections in groups and the
 * account; a top bar with the office switcher. Below lg the sidebar is a
 * drawer opened from a menu button. On large screens it can shrink to its
 * icons, remembered per viewer.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [office, setOffice] = useState<string>(offices[0].id);
  const [sidebar, setSidebar] = useStored("writ-sidebar");
  const slim = sidebar === "slim";
  const toggleSlim = () => setSidebar(slim ? "wide" : "slim");

  // Close the drawer on navigation, on Escape, and if the window grows
  // past lg; lock the page behind it while it is open.
  const [drawerPath, setDrawerPath] = useState(pathname);
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawer(false);
  }
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setDrawer(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [drawer]);

  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <button
        type="button"
        aria-label={t("shell.closeMenu")}
        tabIndex={drawer ? 0 : -1}
        onClick={() => setDrawer(false)}
        className={`fixed inset-0 z-40 bg-ink/50 transition-opacity duration-200 lg:hidden ${drawer ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        id="dashboard-drawer"
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-chrome transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:transition-[width] ${
          drawer ? "translate-x-0" : "-translate-x-full"
        } ${slim ? "lg:w-[68px]" : "lg:w-[220px]"}`}
      >
        <div className={`flex h-full flex-col overflow-y-auto px-4 pt-5 pb-5 lg:overflow-visible ${slim ? "lg:px-3" : ""}`}>
          <div className={`flex items-center justify-between gap-2 ${slim ? "lg:flex-col lg:gap-3" : ""}`}>
            <Link href="/app" aria-label={t("shell.home")}>
              <Wordmark hideWhenSlim={slim} />
            </Link>
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label={t("shell.closeMenu")}
              className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/[0.04] hover:text-ink lg:hidden"
            >
              <Glyph d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
            </button>
            <button
              type="button"
              onClick={toggleSlim}
              aria-label={slim ? t("shell.expand") : t("shell.collapse")}
              aria-expanded={!slim}
              title={slim ? t("shell.expand") : t("shell.collapse")}
              className="hidden size-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-ink/[0.04] hover:text-ink lg:flex"
            >
              <svg className="size-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" />
                <path d="M7.5 3.5v13" />
                <path d={slim ? "M11 8l2 2-2 2" : "M13 8l-2 2 2 2"} />
              </svg>
            </button>
          </div>

          <nav aria-label={t("shell.sections")} className="mt-7 flex min-h-0 flex-1 flex-col gap-0.5">
            {sections.map((s, i) => {
              const group = "group" in s ? s.group : null;
              const prev = sections[i - 1];
              const starts = group && (!prev || !("group" in prev) || prev.group !== group);
              const on = s.href === "/app" ? pathname === "/app" : pathname.startsWith(s.href);
              const last = s.key === "settings";
              const label = t(`nav.${s.key}`);
              return (
                <Fragment key={s.key}>
                  {starts &&
                    (slim ? (
                      <>
                        <p className="mt-5 px-2.5 pb-1 text-[11.5px] font-medium text-faint lg:hidden">{t(`shell.groups.${group}`)}</p>
                        <span aria-hidden="true" className="mx-3 my-2.5 hidden h-px bg-ink/[0.08] lg:block" />
                      </>
                    ) : (
                      <p className="mt-5 px-2.5 pb-1 text-[11.5px] font-medium text-faint">{t(`shell.groups.${group}`)}</p>
                    ))}
                  <Link
                    href={s.href}
                    aria-current={on ? "page" : undefined}
                    title={slim ? label : undefined}
                    className={`relative flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] whitespace-nowrap transition-colors ${
                      slim ? "lg:justify-center lg:px-0 lg:py-2" : ""
                    } ${last ? "mt-auto" : ""} ${
                      on ? "bg-accent-soft font-medium text-accent-deep ring-1 ring-accent-bright/60" : "text-ink/65 hover:bg-ink/[0.04] hover:text-ink"
                    }`}
                  >
                    <span className={on ? "text-accent-deep" : "text-faint"}>
                      <Glyph d={s.d} vb={"vb" in s ? s.vb : 16} />
                    </span>
                    <span className={slim ? "lg:sr-only" : ""}>{label}</span>
                    {"count" in s && (
                      <span
                        className={`ml-auto rounded-full bg-ink/[0.06] px-1.5 text-[11px] font-medium text-ink/65 ${
                          slim ? "lg:absolute lg:top-0.5 lg:right-1 lg:ml-0 lg:bg-accent-bright lg:px-1 lg:text-[9.5px] lg:leading-[14px] lg:text-ink" : ""
                        }`}
                      >
                        {s.count}
                      </span>
                    )}
                  </Link>
                </Fragment>
              );
            })}
          </nav>

          <AccountRow slim={slim} />
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-chrome">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-chrome px-4 py-3 sm:px-8 lg:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label={t("shell.openMenu")}
              aria-expanded={drawer}
              aria-controls="dashboard-drawer"
              className="flex size-9 items-center justify-center rounded-lg text-ink/65 transition-colors hover:bg-ink/[0.04] hover:text-ink"
            >
              <Glyph d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
            </button>
            <Link href="/app" aria-label={t("shell.home")}>
              <Wordmark />
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label className="relative">
              <span className="sr-only">{t("shell.office")}</span>
              <select
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                className="h-9 cursor-pointer appearance-none rounded-md border border-ink/10 bg-gradient-to-b from-white to-ink/[0.04] pr-9 pl-3.5 text-[13.5px] font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <Glyph className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted" d="M4 6l4 4 4-4" />
            </label>
          </div>
          {/* The concave corner where the content meets the chrome. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-full left-0 hidden size-5 lg:block"
            style={{ background: "radial-gradient(circle at 100% 100%, transparent 0 20px, var(--color-chrome) 20.5px)" }}
          />
        </header>

        <main className="min-h-[calc(100dvh-57px)] bg-white px-5 pt-7 pb-20 sm:px-8 lg:px-10 lg:pt-9">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

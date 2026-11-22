import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = {
  /** Show "EN · FR" instead of the full language names. */
  compact?: boolean;
  /** For dark backgrounds. */
  inverse?: boolean;
  className?: string;
};

// Links to the same page in each language. Plain links, so they work
// without JavaScript.
export function LocaleSwitcher({ compact = false, inverse = false, className = "" }: Props) {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const idle = inverse ? "text-white/55 hover:text-white" : "text-muted hover:text-ink";
  const active = inverse ? "text-white" : "text-ink";

  return (
    <nav aria-label={t("label")} className={`flex items-center gap-1.5 text-[13px] ${className}`}>
      {routing.locales.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true" className={inverse ? "text-white/30" : "text-faint"}>·</span>}
          <Link
            href="/"
            locale={locale}
            hrefLang={locale}
            lang={locale}
            aria-current={locale === current ? "page" : undefined}
            className={`transition-colors ${locale === current ? `font-medium ${active}` : idle}`}
          >
            {compact ? (
              <>
                <span aria-hidden="true">{locale.toUpperCase()}</span>
                <span className="sr-only">{t(locale)}</span>
              </>
            ) : (
              t(locale)
            )}
          </Link>
        </span>
      ))}
    </nav>
  );
}

import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Links to the same page in each language. A plain link, so it works
// without JavaScript.
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();

  return (
    <nav aria-label={t("label")} className="flex gap-4 text-sm">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href="/"
          locale={locale}
          hrefLang={locale}
          aria-current={locale === current ? "page" : undefined}
          className={locale === current ? "font-semibold" : "text-(--color-muted) hover:underline"}
        >
          {t(locale)}
        </Link>
      ))}
    </nav>
  );
}

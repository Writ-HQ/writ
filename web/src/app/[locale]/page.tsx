import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";

// A placeholder until the landing page is designed.
export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-6 px-6">
      <h1 className="text-5xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-lg text-(--color-muted)">{t("subtitle")}</p>
      <LocaleSwitcher />
    </main>
  );
}

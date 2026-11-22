import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { routing } from "@/i18n/routing";

import "../globals.css";

// Downloaded at build time and served from this site: visitors' browsers
// never contact Google.
const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist", display: "swap" });

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

// Build both languages ahead of time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((locale) => [locale, `/${locale}`])),
    },
  };
}

// The root layout. It lives under [locale] so that <html lang> is right
// for each language.
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} className={geist.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

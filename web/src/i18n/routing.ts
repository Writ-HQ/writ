import { defineRouting } from "next-intl/routing";

// Every page exists in English and French, at /en/... and /fr/... .
// Anything without a locale prefix is redirected to one, chosen from the
// visitor's browser languages, falling back to English.
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

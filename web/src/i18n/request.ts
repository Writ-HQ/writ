import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";

import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    // The locale is the root segment of every route: app/[locale]/...
    const fromPath = await rootParams.locale();
    if (!hasLocale(routing.locales, fromPath)) {
      notFound();
    }
    locale = fromPath;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Dates, times and numbers are shown in Canada's time zone unless a
    // page says otherwise. Without this, server and browser could format
    // the same moment differently.
    timeZone: "America/Toronto",
  };
});

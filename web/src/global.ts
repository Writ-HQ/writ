import type messages from "../messages/en.json";
import type { routing } from "./i18n/routing";

// Type-checks every translation key and locale against the English
// messages. French must have the same keys; a test enforces it.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}

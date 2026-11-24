import type { Locale } from "@/i18n/routing";

import { en } from "./en";
import { fr } from "./fr";
import type { LegalDoc, LegalSlug } from "./types";

export const legalDocs: Record<Locale, Record<LegalSlug, LegalDoc>> = { en, fr };

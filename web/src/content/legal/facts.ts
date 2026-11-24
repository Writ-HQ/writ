import type { Locale } from "@/i18n/routing";

import type { FactKey } from "./types";

/** A fact that reads the same in both languages, or one per language. */
export type Fact = string | Record<Locale, string> | null;

// Facts the legal pages depend on. Every one must be true and confirmed by
// the company before the pages are relied on; until a value is set, the
// pages show a highlighted blank in its place (docs/before-launch.md).
//
// Most facts read the same in both languages. Where French needs a
// different form, give both: province: { en: "Ontario", fr: "l’Ontario" }.

export const facts: Record<FactKey, Fact> = {
  /** The legal name of the company that runs Writ. */
  entity: null,
  /** Its registered address, on one line. */
  address: null,
  /** Where privacy questions and requests go. */
  privacyEmail: null,
  /** General contact address. */
  contactEmail: null,
  /** The province whose laws govern the terms, with its French article:
   *  { en: "Ontario", fr: "l’Ontario" }. */
  province: null,
  /** The company that hosts this website, and where. */
  siteHost: null,
  /** The company that hosts the waitlist database, and where. */
  waitlistHost: { en: "Neon, in the United States (AWS US East, Virginia)", fr: "Neon, aux États-Unis (AWS US East, Virginie)" },
};

/** The date the legal pages last changed, as YYYY-MM-DD. */
export const LEGAL_UPDATED = "2026-11-24";

// The shape of a legal page. Each language has its own copy of every page
// (en.ts, fr.ts) with the same sections in the same order; a test checks
// that they match.
//
// Text may contain {tokens} such as {entity} or {privacyEmail}; they are
// filled in from facts.ts when the page is drawn.

export const LEGAL_DOCS = ["privacy", "terms", "dpa", "acceptable-use", "cookies", "subprocessors"] as const;
export type LegalSlug = (typeof LEGAL_DOCS)[number];

export type Block =
  | string
  | { list: string[] }
  | { table: { head: string[]; rows: string[][] } };

export type LegalSection = { title: string; body: Block[] };

export type LegalDoc = {
  /** The page's name: the heading, the tab title and its link text. */
  title: string;
  /** One sentence for search engines and link previews. */
  description: string;
  intro: string[];
  /** "The short version": a few plain points in a box. Optional. */
  short?: string[];
  sections: LegalSection[];
};

/** Words around the documents, per language. */
export type LegalChrome = {
  related: string;
  updated: string; // contains {date}
  shortTitle: string;
  /** Shown in place of a fact that has not been filled in yet. */
  missing: Record<FactKey, string>;
};

export type FactKey = "entity" | "address" | "privacyEmail" | "contactEmail" | "province" | "siteHost" | "waitlistHost";

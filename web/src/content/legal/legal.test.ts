import { describe, expect, it } from "vitest";

import { en } from "./en";
import { facts } from "./facts";
import { fr } from "./fr";
import { LEGAL_DOCS, type Block, type LegalDoc } from "./types";

// The French pages must match the English ones section for section, so a
// reader in either language gets the same commitments.

const shape = (b: Block) =>
  typeof b === "string" ? "p" : "list" in b ? `list:${b.list.length}` : `table:${b.table.head.length}x${b.table.rows.length}`;

const outline = (d: LegalDoc) => ({
  intro: d.intro.length,
  short: d.short?.length ?? 0,
  sections: d.sections.map((s) => s.body.map(shape)),
});

const strings = (d: LegalDoc): string[] => [
  d.title,
  d.description,
  ...d.intro,
  ...(d.short ?? []),
  ...d.sections.flatMap((s) => [
    s.title,
    ...s.body.flatMap((b) => (typeof b === "string" ? [b] : "list" in b ? b.list : [...b.table.head, ...b.table.rows.flat()])),
  ]),
];

const tokens = (d: LegalDoc) => strings(d).flatMap((s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!)).sort();

describe("legal pages", () => {
  it.each(LEGAL_DOCS)("%s has the same structure in English and French", (slug) => {
    expect(outline(fr[slug])).toEqual(outline(en[slug]));
  });

  it.each(LEGAL_DOCS)("%s uses the same facts in both languages", (slug) => {
    expect(tokens(fr[slug])).toEqual(tokens(en[slug]));
  });

  it.each(LEGAL_DOCS)("%s has no empty text and only known facts", (slug) => {
    for (const d of [en[slug], fr[slug]]) {
      for (const s of strings(d)) expect(s.trim()).not.toBe("");
      for (const k of tokens(d)) expect(Object.keys(facts)).toContain(k);
    }
  });
});

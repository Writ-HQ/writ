import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { routing } from "./routing";

// Every user-facing string exists in English and French. This test fails
// when a key is in one language and not the other, or is empty.

const messagesDir = join(import.meta.dirname, "..", "..", "messages");

type Messages = { [key: string]: string | Messages };

function load(locale: string): Messages {
  return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), "utf8")) as Messages;
}

// "HomePage.title" -> value, for every leaf.
function flatten(messages: Messages, prefix = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      for (const [k, v] of flatten(value, path)) out.set(k, v);
    } else {
      out.set(path, value);
    }
  }
  return out;
}

describe("messages", () => {
  const byLocale = new Map(routing.locales.map((locale) => [locale, flatten(load(locale))]));
  const english = byLocale.get("en")!;

  it("has a file for every locale and no file for any other", () => {
    const files = readdirSync(messagesDir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""))
      .sort();
    expect(files).toEqual([...routing.locales].sort());
  });

  for (const locale of routing.locales) {
    it(`${locale} has exactly the same keys as en`, () => {
      const keys = [...byLocale.get(locale)!.keys()].sort();
      expect(keys).toEqual([...english.keys()].sort());
    });

    it(`${locale} has no empty or non-string values`, () => {
      const bad = [...byLocale.get(locale)!.entries()]
        .filter(([, value]) => typeof value !== "string" || value.trim() === "")
        .map(([key]) => key);
      expect(bad).toEqual([]);
    });
  }
});

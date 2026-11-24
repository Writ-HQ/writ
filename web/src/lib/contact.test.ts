import { describe, expect, it } from "vitest";

import { parseContact, topicFrom } from "./contact";

// Fictional people only.
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const valid = {
  name: "Alex Moreau",
  email: "alex@example.ca",
  organisation: "Riverside Centre Riding Association",
  topic: "demo",
  message: "  We would like to see Writ before our nomination meeting.  ",
  locale: "fr",
};

describe("parseContact", () => {
  it("accepts a complete form and trims it", () => {
    expect(parseContact(form(valid))).toEqual({
      ok: true,
      bot: false,
      message: {
        name: "Alex Moreau",
        email: "alex@example.ca",
        organisation: "Riverside Centre Riding Association",
        topic: "demo",
        message: "We would like to see Writ before our nomination meeting.",
        locale: "fr",
      },
    });
  });

  it("lets the organisation be left blank", () => {
    expect(parseContact(form({ ...valid, organisation: "" })).ok).toBe(true);
  });

  it("reports every problem at once", () => {
    expect(parseContact(form({ name: "", email: "not-an-email", topic: "lobbying", message: "   ", locale: "en" }))).toEqual({
      ok: false,
      problems: { name: "required", email: "invalidEmail", topic: "invalidChoice", message: "required" },
    });
  });

  it("requires a topic", () => {
    expect(parseContact(form({ ...valid, topic: "" }))).toEqual({ ok: false, problems: { topic: "required" } });
  });

  it("rejects values that are too long", () => {
    const r = parseContact(form({ ...valid, name: "a".repeat(121), organisation: "b".repeat(161), message: "c".repeat(5001) }));
    expect(r).toEqual({ ok: false, problems: { name: "tooLong", organisation: "tooLong", message: "tooLong" } });
  });

  it("accepts a message at the limit", () => {
    expect(parseContact(form({ ...valid, message: "c".repeat(5000) })).ok).toBe(true);
  });

  it("falls back to English for an unknown locale", () => {
    const r = parseContact(form({ ...valid, locale: "de" }));
    expect(r.ok && r.message.locale).toBe("en");
  });

  it("flags the hidden field as a bot", () => {
    const r = parseContact(form({ ...valid, website: "https://spam.example" }));
    expect(r.ok && r.bot).toBe(true);
  });
});

describe("topicFrom", () => {
  it("accepts a known topic from a link", () => {
    expect(topicFrom("press")).toBe("press");
  });

  it("ignores anything else", () => {
    expect(topicFrom("lobbying")).toBeUndefined();
    expect(topicFrom(["demo", "sales"])).toBeUndefined();
    expect(topicFrom(undefined)).toBeUndefined();
  });
});

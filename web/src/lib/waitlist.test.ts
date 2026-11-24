import { describe, expect, it } from "vitest";

import { parseSignup } from "./waitlist";

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
  orgType: "riding",
  province: "ON",
  locale: "fr",
  consent: "on",
};

describe("parseSignup", () => {
  it("accepts a complete form and trims it", () => {
    const r = parseSignup(form({ ...valid, name: "  Alex Moreau  " }));
    expect(r).toEqual({
      ok: true,
      bot: false,
      signup: {
        name: "Alex Moreau",
        email: "alex@example.ca",
        organisation: "Riverside Centre Riding Association",
        orgType: "riding",
        province: "ON",
        locale: "fr",
      },
    });
  });

  it("lets the organisation be left blank", () => {
    const r = parseSignup(form({ ...valid, organisation: "" }));
    expect(r.ok).toBe(true);
  });

  it("requires consent", () => {
    const rest: Record<string, string> = { ...valid };
    delete rest.consent;
    expect(parseSignup(form(rest))).toEqual({ ok: false, problems: { consent: "required" } });
  });

  it("reports every problem at once", () => {
    const r = parseSignup(form({ name: "", email: "not-an-email", orgType: "party", province: "XX", locale: "en" }));
    expect(r).toEqual({
      ok: false,
      problems: { name: "required", email: "invalidEmail", orgType: "invalidChoice", province: "invalidChoice", consent: "required" },
    });
  });

  it("rejects values that are too long", () => {
    const r = parseSignup(form({ ...valid, name: "a".repeat(121), organisation: "b".repeat(161) }));
    expect(r).toEqual({ ok: false, problems: { name: "tooLong", organisation: "tooLong" } });
  });

  it("falls back to English for an unknown locale", () => {
    const r = parseSignup(form({ ...valid, locale: "de" }));
    expect(r.ok && r.signup.locale).toBe("en");
  });

  it("flags the hidden field as a bot", () => {
    const r = parseSignup(form({ ...valid, website: "https://spam.example" }));
    expect(r.ok && r.bot).toBe(true);
  });
});

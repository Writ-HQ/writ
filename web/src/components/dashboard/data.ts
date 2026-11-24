// Fictional data for the dashboard while it is not connected to the API.
// Every number, case and name here is made up. It is generated from a
// fixed seed, so the server and the browser draw the same thing.

export type Day = {
  date: string; // YYYY-MM-DD
  contacts: number; // new contacts
  opened: number; // cases opened
  resolved: number; // cases resolved
  days: number; // average days to resolve the cases resolved that day
};

export type Metric = "contacts" | "opened" | "resolved" | "days";

/** The last day with data; ranges are measured back from it. */
export const LAST_DATE = "2026-11-23";

const DAY_MS = 86_400_000;
export const toMs = (iso: string) => Date.parse(iso + "T00:00:00Z");
export const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => toIso(toMs(iso) + n * DAY_MS);

// A small seeded random number generator (mulberry32).
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Two years and a bit, so a 12-month range has a period before it. */
export const daily: Day[] = (() => {
  const rand = seeded(42);
  const n = 760;
  const out: Day[] = [];
  for (let i = 0; i < n; i++) {
    const date = addDays(LAST_DATE, i - n + 1);
    const dow = new Date(toMs(date)).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    // Slow growth over the two years, a quiet summer and a busy autumn.
    const trend = 0.75 + (0.35 * i) / n;
    const month = +date.slice(5, 7);
    const season = month === 7 || month === 8 ? 0.8 : month >= 9 && month <= 11 ? 1.15 : 1;
    const k = trend * season * (weekend ? 0.3 : 1);
    const opened = Math.round(k * (7 + rand() * 6));
    const resolved = Math.max(0, Math.round(k * (6 + rand() * 6)));
    out.push({
      date,
      contacts: Math.round(k * (24 + rand() * 18)),
      opened,
      resolved,
      days: Math.round((11 + rand() * 9 - trend * 2) * 10) / 10,
    });
  }
  return out;
})();

export type Totals = Record<Metric, number>;

export function summarize(days: Day[]): Totals {
  const sum = (m: "contacts" | "opened" | "resolved") => days.reduce((n, d) => n + d[m], 0);
  const resolved = sum("resolved");
  return {
    contacts: sum("contacts"),
    opened: sum("opened"),
    resolved,
    days: resolved
      ? Math.round((days.reduce((n, d) => n + d.days * d.resolved, 0) / resolved) * 10) / 10
      : 0,
  };
}

/** Newsletters sent, marked on the chart. Every other Tuesday. */
export const newsletters: string[] = daily
  .filter((d, i) => new Date(toMs(d.date)).getUTCDay() === 2 && Math.floor(i / 7) % 2 === 0)
  .map((d) => d.date);

/** Breakdown rows: a share of the total and how fast each is growing. */
export type BreakdownDef = { key: string; share: number; growth: number };

export const issues = [
  { key: "immigration", share: 0.27, growth: 1.12 },
  { key: "pensions", share: 0.16, growth: 0.94 },
  { key: "taxes", share: 0.14, growth: 1.05 },
  { key: "passports", share: 0.12, growth: 0.71 },
  { key: "housing", share: 0.11, growth: 1.31 },
  { key: "ei", share: 0.08, growth: 0.88 },
  { key: "health", share: 0.07, growth: 1.02 },
  { key: "veterans", share: 0.05, growth: 1.18 },
] as const satisfies readonly BreakdownDef[];
export type IssueKey = (typeof issues)[number]["key"];

/** Open cases by where they stand. They add up to the count in the sidebar. */
export const statuses = [
  { key: "new", count: 6 },
  { key: "progress", count: 9 },
  { key: "agency", count: 5 },
  { key: "constituent", count: 3 },
] as const;
export type StatusKey = (typeof statuses)[number]["key"];

/** "Now" for the fictional data: noon in Toronto on the last day. */
export const NOW = "2026-11-23T17:00:00Z";


/** The oldest open cases, with fictional case numbers and staff. */
export const oldestCases = [
  { key: "c5", number: "2026-0412", issue: "immigration", days: 96, owner: "Priya S." },
  { key: "c6", number: "2026-0438", issue: "pensions", days: 81, owner: "Marc T." },
  { key: "c3", number: "2026-0471", issue: "passports", days: 64, owner: "Dana K." },
  { key: "c7", number: "2026-0502", issue: "housing", days: 47, owner: "Priya S." },
  { key: "c8", number: "2026-0519", issue: "taxes", days: 39, owner: "Sam O." },
] as const;


/** Offices the signed-in person belongs to. Fictional. */
export const offices = [
  { id: "riverside", name: "Riverside Centre office" },
  { id: "hillcrest", name: "Hillcrest community office" },
] as const;

export const account = { name: "Jordan Lee", email: "jordan@example.ca", initials: "JL" };

/** Social accounts connected to the office. Handles and numbers are made up. */
export const channels = [
  { key: "facebook", handle: "Riverside Centre office", followers: 6840, unread: 8, autoReplied: 41 },
  { key: "instagram", handle: "@riverside.office", followers: 3215, unread: 4, autoReplied: 17 },
] as const;
export type Platform = (typeof channels)[number]["key"];

/**
 * Direct messages, newest first. Texts are messages (mock.dms.*); names
 * are fictional. "auto" means an auto-reply went out and staff still owe
 * an answer; "new" has had nothing yet.
 */
export const dms = [
  { key: "m1", platform: "facebook", name: "Alex Moreau", at: "2026-11-23T16:42:00Z", state: "new" },
  { key: "m2", platform: "instagram", name: "Sam Okafor", at: "2026-11-23T15:58:00Z", state: "auto" },
  { key: "m3", platform: "facebook", name: "Lee Tremblay", at: "2026-11-23T14:11:00Z", state: "new" },
  { key: "m4", platform: "instagram", name: "Chris Nadeau", at: "2026-11-23T11:30:00Z", state: "auto" },
  { key: "m5", platform: "facebook", name: "Jamie Gill", at: "2026-11-22T19:05:00Z", state: "replied" },
] as const;

/** Posts planned for the coming days. Texts are messages (mock.posts.*). */
export const scheduledPosts = [
  { key: "p1", at: "2026-11-23T18:30:00Z", platforms: ["facebook", "instagram"], status: "approved" },
  { key: "p2", at: "2026-11-24T14:00:00Z", platforms: ["facebook"], status: "approval" },
  { key: "p3", at: "2026-11-25T16:00:00Z", platforms: ["instagram"], status: "approved" },
  { key: "p4", at: "2026-11-27T15:00:00Z", platforms: ["facebook", "instagram"], status: "draft" },
] as const;

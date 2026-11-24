"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Check, Users } from "@/components/ui/icons";
import { useReducedMotion } from "@/lib/motion";

import { Avatar, Card, people, Tag, type Person } from "./mocks";

// The product mock-ups beside each feature, as small living demos after
// altitude.xyz: every few seconds something happens, the way it would in
// Writ. A new event joins a timeline, a message arrives, the language of an
// email flips. They run only while on screen, and stand still for people
// who ask for less motion. Every name and message is fictional.

const STEP = 2800;

/** A counter that ticks every `ms` while the element is on screen. */
function useTick(ms = STEP) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    let timer = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        if (!timer) timer = window.setInterval(() => setTick((n) => n + 1), ms);
      } else {
        window.clearInterval(timer);
        timer = 0;
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [ms, reduce]);
  return [ref, tick] as const;
}

/** The newest `count` items after `tick` steps: item `tick` first, then the ones before it. */
const latest = <T,>(list: readonly T[], tick: number, count: number) =>
  Array.from({ length: count }, (_, i) => list[(((tick - i) % list.length) + list.length) % list.length]!);

// Contacts: a new event slides into the top of Marie's timeline.
export function LiveContactMock() {
  const t = useTranslations("Landing.mock");
  const [ref, tick] = useTick();
  const events = [t("tl1"), t("tl4"), t("tl2"), t("tl5"), t("tl3"), t("tl6")] as const;
  const times = [t("justNow"), t("t2"), t("t5")];
  // Newest first: each tick, the next event in the list becomes the newest.
  const shown = latest(events, tick, 3);
  return (
    <div ref={ref}>
      <Card className="w-[340px] p-5 text-ink">
        <div className="flex items-center gap-3">
          <Avatar person={people.marie} size="h-10 w-10 text-xs" />
          <div>
            <p className="text-sm font-medium">{people.marie.name}</p>
            <p className="text-[11px] text-muted">{t("household")}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Tag tone="positive">{t("tags.volunteer")}</Tag>
          <Tag>{t("tags.lawnSign")}</Tag>
          <Tag>{t("tags.french")}</Tag>
        </div>
        <p className="mt-5 mb-2 text-[11px] font-medium">{t("timeline")}</p>
        <ol className="space-y-2.5 border-l border-line pl-3 text-[11px]">
          {shown.map((what, i) => (
            <li key={`${tick}-${what}`} className={`relative ${i === 0 ? "live-in" : "live-shift"}`}>
              <span className={`absolute top-1 -left-[15.5px] h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-positive" : "bg-ink"}`} />
              <p>{what}</p>
              <p className="text-[10px] text-muted">{times[i]}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

// Email: the EN/FR switch flips, and the subject and preview swap with it.
export function LiveEmailMock() {
  const t = useTranslations("Landing.mock");
  const locale = useLocale();
  const [ref, tick] = useTick(3200);
  const other = tick % 2 === 1;
  // Which pill is lit: the page's language first, then the other one.
  const frLit = (locale === "fr") !== other;
  return (
    <div ref={ref}>
      <Card className="w-[380px] overflow-hidden text-ink">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <div className="relative flex rounded-full bg-panel p-0.5 text-[10px] font-medium ring-1 ring-line">
            <span
              className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-white shadow-sm transition-transform duration-500 ease-out ${frLit ? "translate-x-full" : ""}`}
            />
            <span className={`relative w-9 py-0.5 text-center transition-colors ${frLit ? "text-muted" : ""}`}>EN</span>
            <span className={`relative w-9 py-0.5 text-center transition-colors ${frLit ? "" : "text-muted"}`}>FR</span>
          </div>
          <span className="rounded-full bg-ink px-3 py-1 text-[10px] font-medium text-white">{t("schedule")}</span>
        </div>
        <div className="space-y-3 p-4 text-[11px]">
          <div key={`s-${other}`} className="live-fade">
            <p className="text-[10px] text-muted">{t("subject")}</p>
            <p className="mt-0.5 font-medium">{other ? t("subjectOther") : t("subjectValue")}</p>
          </div>
          <p key={`b-${other}`} className="live-fade min-h-[3.4em] leading-relaxed text-ink/80">
            {other ? t("bodyOther") : t("bodyPreview")}
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2 ring-1 ring-line">
            <Users className="h-3.5 w-3.5 text-muted" />
            <span className="truncate">{t("audience")}</span>
          </div>
          <p className="flex items-center gap-1.5 text-positive">
            <Check className="h-3.5 w-3.5" />
            {t("sendsIn")}
          </p>
        </div>
      </Card>
    </div>
  );
}

type Platform = "fb" | "ig" | "wa";

function PlatformBadge({ platform }: { platform: Platform }) {
  if (platform === "fb")
    return <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1877f2] text-[8px] font-bold text-white">f</span>;
  if (platform === "wa")
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#25d366] text-white">
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">
          <path d="M8 1.5a6.5 6.5 0 0 0-5.6 9.8L1.5 14.5l3.3-.9A6.5 6.5 0 1 0 8 1.5zm3.2 8.9c-.1.4-.8.7-1.1.8-.3 0-.6.1-2-.5-1.7-.7-2.8-2.5-2.9-2.6-.1-.1-.7-.9-.7-1.8s.4-1.3.6-1.5c.1-.2.3-.2.4-.2h.3c.1 0 .2 0 .4.3l.5 1.3c0 .1.1.2 0 .3l-.2.3-.3.3c-.1.1-.2.2-.1.4.1.2.5.9 1.1 1.4.8.7 1.4.9 1.6 1 .2.1.3 0 .4-.1l.5-.6c.1-.2.2-.1.4-.1l1.2.6c.2.1.3.1.3.2.1.1.1.4 0 .8z" />
        </svg>
      </span>
    );
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-[5px] bg-gradient-to-tr from-[#f9a03f] via-[#e1306c] to-[#833ab4] text-[8px] font-bold text-white">
      ◎
    </span>
  );
}

// Social: a new message arrives at the top of the inbox and is matched to a
// contact a moment later.
export function LiveInboxMock() {
  const t = useTranslations("Landing.mock");
  const [ref, tick] = useTick();
  const [matched, setMatched] = useState(-1);
  useEffect(() => {
    const id = window.setTimeout(() => setMatched(tick), 900);
    return () => window.clearTimeout(id);
  }, [tick]);
  const pool: { person: Person; platform: Platform; text: string }[] = [
    { person: people.priya, platform: "ig", text: t("m1") },
    { person: people.sam, platform: "wa", text: t("m4") },
    { person: people.owen, platform: "fb", text: t("m2") },
    { person: people.jordan, platform: "wa", text: t("m5") },
    { person: people.dev, platform: "ig", text: t("m3") },
  ];
  const times = [t("justNow"), t("t3"), t("t4")];
  const shown = latest(pool, tick, 3);
  return (
    <div ref={ref}>
      <Card className="w-[380px] overflow-hidden text-ink">
        <p className="border-b border-line px-4 py-2.5 text-[11px] font-medium">{t("inboxAll")}</p>
        <ul>
          {shown.map(({ person, platform, text }, i) => (
            <li
              key={`${tick}-${person.initials}`}
              className={`flex gap-3 border-b border-line/70 px-4 py-3 last:border-0 ${i === 0 ? "live-in bg-panel" : "live-shift"}`}
            >
              <span className="relative">
                <Avatar person={person} size="h-8 w-8 text-[10px]" />
                <span className="absolute -right-1 -bottom-1">
                  <PlatformBadge platform={platform} />
                </span>
              </span>
              <div className="min-w-0 flex-1 text-[11px]">
                <p className="flex justify-between gap-2">
                  <span className="font-medium">{person.name}</span>
                  <span className="text-[10px] text-muted">{times[i]}</span>
                </p>
                <p className="mt-0.5 truncate text-ink/75">{text}</p>
                {i === 0 && (
                  <p className={`mt-1.5 transition-opacity duration-500 ${matched === tick ? "opacity-100" : "opacity-0"}`}>
                    <Tag tone="positive">✓ {t("matched")}</Tag>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// Volunteers: a highlight moves down the team, showing what each role can do.
export function LiveTeamMock() {
  const t = useTranslations("Landing.mock");
  const [ref, tick] = useTick();
  const team = [
    { person: people.jordan, role: t("roles.owner"), can: t("perms.owner") },
    { person: people.priya, role: t("roles.admin"), can: t("perms.admin") },
    { person: people.owen, role: t("roles.staff"), can: t("perms.staff") },
    { person: people.marie, role: t("roles.volunteer"), can: t("perms.volunteer") },
  ];
  const on = tick % team.length;
  return (
    <div ref={ref}>
      <Card className="w-[360px] overflow-hidden text-ink">
        <p className="border-b border-line px-4 py-2.5 text-[11px] font-medium">{t("team")}</p>
        <ul>
          {team.map(({ person, role, can }, i) => (
            <li
              key={person.initials}
              className={`flex items-center gap-3 border-b border-line/70 px-4 py-2.5 text-[11px] transition-colors duration-500 last:border-0 ${i === on ? "bg-panel" : ""}`}
            >
              <Avatar person={person} size="h-7 w-7 text-[9px]" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{person.name}</span>
                {i === on ? (
                  <span key={`${tick}`} className="live-fade block truncate text-[10px] text-ink/70">
                    {can}
                  </span>
                ) : (
                  <span className="text-[10px] text-positive">{t("mfaOn")}</span>
                )}
              </span>
              <Tag>{role}</Tag>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// Consent: one channel at a time changes, and the note says what changed.
export function LiveConsentMock() {
  const t = useTranslations("Landing.mock");
  const [ref, tick] = useTick(3000);
  const states = [
    { label: t("optedIn"), tone: "positive" as const },
    { label: t("optedOut"), tone: "warning" as const },
    { label: t("noAnswer"), tone: "neutral" as const },
  ];
  const channels = [t("channels.email"), t("channels.sms"), t("channels.phone")];
  // Each channel starts in its own state; on every tick one channel moves on.
  const changed = tick === 0 ? -1 : (tick - 1) % channels.length;
  const stateOf = (c: number) => {
    const moves = tick === 0 ? 0 : Math.floor((tick - 1 - c) / channels.length) + 1;
    return states[(c + Math.max(0, moves)) % states.length]!;
  };
  return (
    <div ref={ref}>
      <Card className="w-[340px] overflow-hidden text-ink">
        <p className="border-b border-line px-4 py-2.5 text-[11px] font-medium">{t("consentFor")}</p>
        <ul>
          {channels.map((channel, c) => {
            const s = stateOf(c);
            return (
              <li
                key={channel}
                className={`flex items-center justify-between border-b border-line/70 px-4 py-2.5 text-[11px] transition-colors duration-500 last:border-0 ${c === changed ? "bg-panel" : ""}`}
              >
                {channel}
                <span key={`${c}-${s.label}`} className={c === changed ? "live-pop" : ""}>
                  <Tag tone={s.tone}>{s.label}</Tag>
                </span>
              </li>
            );
          })}
        </ul>
        <p key={changed} className="live-fade bg-panel px-4 py-2.5 text-[10px] text-muted">
          {changed < 0 ? t("consentNote") : t("consentChanged", { channel: channels[changed]! })}
        </p>
      </Card>
    </div>
  );
}

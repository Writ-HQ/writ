"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { CalendarSolid, Check, ClipboardSolid, HomeSolid, MailSolid, Users } from "@/components/ui/icons";
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

// Contacts, laid out like altitude.xyz's bill-pay panel: a large white card
// anchored to the bottom left, running off the left and bottom edges with
// one big rounded corner; two grey pill buttons, a table whose names run
// off the left edge, and a last row still importing. Behind it on the
// right, lanes of tag and source chips drift sideways in turn.

type Chip = { label: string; icon: ReactNode };

function ChipIcon({ tint, children }: { tint: string; children: ReactNode }) {
  return <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-full ${tint}`}>{children}</span>;
}

function Lane({ chips, seconds, reverse }: { chips: Chip[]; seconds: number; reverse?: boolean }) {
  const row = (copy: number) =>
    chips.map((c, i) => (
      <span
        key={`${copy}-${i}`}
        className="mr-2.5 flex h-[38px] shrink-0 items-center gap-2 rounded-full bg-white px-3 text-[12.5px] font-medium whitespace-nowrap text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_12px_-4px_rgb(24_39_75/0.12)]"
      >
        {c.icon}
        {c.label}
      </span>
    ));
  return (
    <div className="flex w-max animate-marquee" style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? "reverse" : "normal" }}>
      {row(0)}
      {row(1)}
    </div>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 animate-spin text-ink/50 motion-reduce:animate-none" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
        <path key={a} d="M8 1.8v2.4" transform={`rotate(${a} 8 8)`} opacity={0.25 + (i / 8) * 0.75} />
      ))}
    </svg>
  );
}

export function ContactsPanel() {
  const t = useTranslations("Landing.mock.contacts");
  const fb = <span className="flex size-[22px] items-center justify-center rounded-full bg-[#1877f2] text-[10px] font-bold text-white">f</span>;
  const ig = <span className="flex size-[22px] items-center justify-center rounded-[7px] bg-gradient-to-tr from-[#f9a03f] via-[#e1306c] to-[#833ab4] text-[10px] font-bold text-white">◎</span>;
  const wa = (
    <span className="flex size-[22px] items-center justify-center rounded-full bg-[#25d366] text-white">
      <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true">
        <path d="M8 1.5a6.5 6.5 0 0 0-5.6 9.8L1.5 14.5l3.3-.9A6.5 6.5 0 1 0 8 1.5zm3.2 8.9c-.1.4-.8.7-1.1.8-.3 0-.6.1-2-.5-1.7-.7-2.8-2.5-2.9-2.6-.1-.1-.7-.9-.7-1.8s.4-1.3.6-1.5c.1-.2.3-.2.4-.2h.3c.1 0 .2 0 .4.3l.5 1.3c0 .1.1.2 0 .3l-.2.3-.3.3c-.1.1-.2.2-.1.4.1.2.5.9 1.1 1.4.8.7 1.4.9 1.6 1 .2.1.3 0 .4-.1l.5-.6c.1-.2.2-.1.4-.1l1.2.6c.2.1.3.1.3.2.1.1.1.4 0 .8z" />
      </svg>
    </span>
  );
  const dot = (tint: string) => <ChipIcon tint={tint}><span className="size-2 rounded-full bg-white/90" /></ChipIcon>;
  const glyph = (tint: string, g: string) => (
    <ChipIcon tint={tint}>
      <span className="text-[10px] font-semibold text-ink/70">{g}</span>
    </ChipIcon>
  );
  const icon = (tint: string, Icon: (p: { className?: string }) => ReactNode) => (
    <ChipIcon tint={tint}>
      <Icon className="size-3 text-ink/70" />
    </ChipIcon>
  );
  const Sign = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M2.5 2.5h11v7h-11zM7.2 9.5h1.6v4.5H7.2z" />
    </svg>
  );
  const lanes: Chip[][] = [
    [
      { label: t("chips.volunteer"), icon: dot("bg-positive") },
      { label: "Facebook", icon: fb },
      { label: t("chips.ward3"), icon: glyph("bg-[#e7e0a9]", "3") },
      { label: t("chips.newsletter"), icon: icon("bg-[#bcd7ec]", MailSolid) },
    ],
    [
      { label: t("chips.lawnSign"), icon: icon("bg-[#f3d3b8]", Sign) },
      { label: "WhatsApp", icon: wa },
      { label: t("chips.french"), icon: glyph("bg-[#d8c6e8]", "Fr") },
      { label: t("chips.canvass"), icon: icon("bg-[#c7d9b0]", HomeSolid) },
    ],
    [
      { label: t("chips.signup"), icon: icon("bg-[#c9e3dc]", ClipboardSolid) },
      { label: "Instagram", icon: ig },
      { label: t("chips.ward7"), icon: glyph("bg-[#e7e0a9]", "7") },
      { label: t("chips.email"), icon: icon("bg-[#bcd7ec]", MailSolid) },
    ],
    [
      { label: t("chips.townHall"), icon: icon("bg-[#f3d3b8]", CalendarSolid) },
      { label: t("chips.volunteer"), icon: dot("bg-positive") },
      { label: "Facebook", icon: fb },
      { label: t("chips.lawnSign"), icon: icon("bg-[#f3d3b8]", Sign) },
    ],
    [
      { label: t("chips.french"), icon: glyph("bg-[#d8c6e8]", "Fr") },
      { label: t("chips.signup"), icon: icon("bg-[#c9e3dc]", ClipboardSolid) },
      { label: "WhatsApp", icon: wa },
      { label: t("chips.ward3"), icon: glyph("bg-[#e7e0a9]", "3") },
    ],
  ];
  const tones = {
    positive: "bg-positive-soft text-positive ring-positive/15",
    warning: "bg-[#fff4e5] text-warning ring-warning/15",
  } as const;
  const rows = [
    { person: people.marie, state: t("states.volunteer"), tone: "positive" as const, when: t("when.today") },
    { person: people.owen, state: t("states.followUp"), tone: "warning" as const, when: t("when.twoDays") },
    { person: people.priya, state: t("states.supporter"), tone: "positive" as const, when: t("when.yesterday") },
    { person: people.dev, state: t("states.duplicate"), tone: "warning" as const, when: t("when.threeDays") },
  ];

  return (
    <div className="absolute inset-0">
      {/* Lanes of chips, behind the card on the right. */}
      <div className="absolute top-[38%] right-0 bottom-0 left-[38%] flex flex-col justify-around overflow-hidden py-2 motion-reduce:[&_*]:animate-none">
        {lanes.map((lane, i) => (
          <Lane key={i} chips={lane} seconds={38 + i * 7} reverse={i % 2 === 1} />
        ))}
      </div>

      {/* The card, running off the left and bottom edges. */}
      <div className="absolute top-[15%] bottom-0 -left-12 w-[calc(66%+3rem)] rounded-tr-[32px] bg-white px-7 pt-6 text-ink shadow-[0_-4px_10px_0_rgb(0_0_0/0.03),0_12px_40px_-8px_rgb(24_39_75/0.18)]">
        <div className="flex justify-end gap-2">
          <span className="flex h-9 items-center gap-2 rounded-full bg-[#f0f0f0] px-3.5 text-[12.5px] font-medium whitespace-nowrap">
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 10.5V2.5M5 5.5l3-3 3 3M2.5 10v3h11v-3" />
            </svg>
            {t("importSheet")}
          </span>
          <span className="flex h-9 items-center gap-1.5 rounded-full bg-[#f0f0f0] px-3.5 text-[12.5px] font-medium whitespace-nowrap">
            <span className="text-[15px] leading-none">+</span>
            {t("addContact")}
          </span>
        </div>
        <div className="mt-6 grid grid-cols-[1fr_auto_auto] items-center gap-x-6 text-[12px]">
          <span />
          <span className="text-muted">{t("status")}</span>
          <span className="text-right text-muted">{t("lastContact")}</span>
          {rows.map((r) => (
            <div key={r.person.initials} className="contents">
              <span className="flex h-[54px] items-center gap-2.5 truncate text-[13px] text-ink/60">
                <Avatar person={r.person} size="h-7 w-7 text-[9px]" />
                {r.person.name}
              </span>
              <span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ${tones[r.tone]}`}>{r.state}</span>
              </span>
              <span className="text-right text-[13px] tabular-nums">{r.when}</span>
            </div>
          ))}
          <span className="h-[54px]" />
          <span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f3f3] px-2.5 py-1 text-[12px] font-medium text-ink/60 ring-1 ring-line">
              <Spinner />
              {t("importing")}
            </span>
          </span>
          <span className="flex justify-end">
            <Spinner />
          </span>
        </div>
      </div>
    </div>
  );
}

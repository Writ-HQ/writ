"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

import { CalendarSolid, Check, ClipboardSolid, HomeSolid, ListSolid, MailSolid } from "@/components/ui/icons";
import { useReducedMotion } from "@/lib/motion";

import { BrandLogo } from "./brand-logos";
import { Avatar, people, type Person } from "./mocks";

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

// Email: the English and French versions of one email as two cards, fanned
// like the team panel, taking turns at the front every few seconds. Each
// says who it goes to and how it did. In the corner, a contact with the
// language they get, changing with the card in front.
export function EmailPanel() {
  const t = useTranslations("Landing.mock");
  const e = useTranslations("Landing.mock.emailPanel");
  const format = useFormatter();
  const locale = useLocale();
  const [ref, tick] = useTick(3200);
  // The page's own language starts in front.
  const frFront = (locale === "fr") !== (tick % 2 === 1);
  // In each message file, subjectValue and bodyPreview are in the page's
  // language and subjectOther and bodyOther in the other one.
  const own = { subject: t("subjectValue"), body: t("bodyPreview") };
  const other = { subject: t("subjectOther"), body: t("bodyOther") };
  const versions = {
    en: { ...(locale === "fr" ? other : own), title: e("english"), sent: 703, opened: 0.58, out: 3 },
    fr: { ...(locale === "fr" ? own : other), title: e("french"), sent: 581, opened: 0.63, out: 2 },
  };
  const card = (lang: "en" | "fr") => {
    const v = versions[lang];
    const front = (lang === "fr") === frFront;
    return (
      <div
        key={lang}
        className={`absolute w-[56%] min-w-[320px] rounded-[26px] bg-white p-2.5 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          front ? "top-[38%] left-[36%] z-10 shadow-[0_14px_44px_-10px_rgb(24_39_75/0.28)]" : "top-[9%] left-[10%] z-0 shadow-[0_10px_40px_-10px_rgb(24_39_75/0.16)]"
        }`}
      >
        <div className="rounded-[18px] bg-panel px-6 pt-5 pb-4">
          <p className="flex items-center gap-2.5 text-[13px] text-muted">
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-medium text-white">{lang.toUpperCase()}</span>
            {v.title}
          </p>
          <p className="mt-3 truncate text-[24px] leading-8 tracking-[-0.03em]">{v.subject}</p>
          <p className="mt-1.5 line-clamp-2 text-[15px] leading-[21px] text-ink/65">{v.body}</p>
          <div className="mt-4 border-t border-dashed border-ink/15 pt-3">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-[15px]">
              <dt className="text-muted">{e("sentTo")}</dt>
              <dd className="truncate">{e("people", { count: v.sent })}</dd>
              <dt className="text-muted">{e("opened")}</dt>
              <dd className="truncate">{format.number(v.opened, { style: "percent" })}</dd>
              <dt className="text-muted">{e("unsubscribed")}</dt>
              <dd className="truncate">{format.number(v.out)}</dd>
            </dl>
          </div>
        </div>
      </div>
    );
  };
  const who = frFront ? { person: people.marie, lang: "FR" } : { person: people.owen, lang: "EN" };
  return (
    <div ref={ref} className="absolute inset-0 text-ink">
      {card("en")}
      {card("fr")}
      {/* A contact and the language they get. */}
      <div className="absolute bottom-[7%] left-[5%] z-20 flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-2 pl-1.5 shadow-[0_8px_24px_-10px_rgb(24_39_75/0.3)]">
        <span key={who.lang} className="live-fade flex items-center gap-2.5">
          <MemberTile person={who.person} size="size-7 text-[10px] rounded-full" />
          <span className="text-[15px] whitespace-nowrap">{who.person.name}</span>
          <svg viewBox="0 0 16 16" className="size-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
          <span className="rounded-full bg-ink px-2.5 py-1 text-[12px] leading-4 font-medium text-white">{who.lang}</span>
        </span>
      </div>
    </div>
  );
}

type Platform = "facebook" | "instagram" | "whatsapp";

/** A platform's own mark in its own colours. */
function PlatformMark({ platform, size = 18 }: { platform: Platform; size?: number }) {
  if (platform === "instagram")
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-[28%] text-white"
        style={{ width: size, height: size, background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)" }}
      >
        <BrandLogo name="instagram" style={{ width: size * 0.64, height: size * 0.64 }} />
      </span>
    );
  return (
    <BrandLogo
      name={platform}
      className={`shrink-0 ${platform === "facebook" ? "text-[#0866FF]" : "text-[#25D366]"}`}
      style={{ width: size, height: size }}
    />
  );
}

/** A status pill at the large mock-up size. */
function Status({ children, tone = "positive" }: { children: ReactNode; tone?: "positive" | "warning" | "neutral" }) {
  const tones = {
    positive: "bg-positive-soft text-positive ring-positive/10",
    warning: "bg-[#fff4e5] text-warning ring-warning/10",
    neutral: "bg-panel text-ink/60 ring-line",
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[13px] leading-4 font-medium whitespace-nowrap ring-1 ${tones[tone]}`}>{children}</span>;
}

// Social, laid out after the reference's invoicing picture: a card near the
// top with one conversation, where it came from and the contact it was
// matched to; below it, the inbox in a large card running off the left and
// bottom edges, its messages' first letters cut off by the left edge. The newest message has a Reply button; the rest are
// answered. Every 2.8s the matched contact fades in again, as it would
// when a message arrives.
export function SocialPanel() {
  const t = useTranslations("Landing.mock");
  const s = useTranslations("Landing.mock.social");
  const [ref, tick] = useTick();
  const [matched, setMatched] = useState(-1);
  useEffect(() => {
    const id = window.setTimeout(() => setMatched(tick), 700);
    return () => window.clearTimeout(id);
  }, [tick]);
  const shown = matched === tick;
  const rows: { text: string; person: Person; platform: Platform; when: string; replied: boolean }[] = [
    { text: t("m1"), person: people.priya, platform: "instagram", when: t("t1"), replied: false },
    { text: t("m2"), person: people.owen, platform: "facebook", when: t("t3"), replied: true },
    { text: t("m4"), person: people.sam, platform: "whatsapp", when: t("t4"), replied: true },
    { text: t("m5"), person: people.jordan, platform: "whatsapp", when: t("t5"), replied: true },
    { text: t("m3"), person: people.dev, platform: "instagram", when: t("t5"), replied: true },
  ];
  const label = "text-[11px] leading-4 font-medium tracking-[0.02em] text-muted uppercase";

  return (
    <div ref={ref} className="absolute inset-0 text-ink">
      {/* The conversation card. */}
      <div className="absolute top-[12%] left-[17.5%] w-[65%] bg-white shadow-[0_8px_24px_-12px_rgb(24_39_75/0.18)]">
        <div className="flex items-start gap-8 border-b border-line px-[6%] py-3">
          <div className="min-w-0 flex-1">
            <p className={label}>{s("conversation")}</p>
            <p className="mt-0.5 text-[12.5px] font-medium">C-00418</p>
          </div>
          <div>
            <p className={label}>{s("received")}</p>
            <p className="mt-0.5 text-[12.5px] font-medium whitespace-nowrap">{s("receivedValue")}</p>
          </div>
          <div className="max-sm:hidden">
            <p className={label}>{s("channel")}</p>
            <p className="mt-0.5 text-[12.5px] font-medium">Instagram</p>
          </div>
        </div>
        <div className="grid grid-cols-2">
          <div className="border-r border-line px-[12%] pt-3.5 pb-4">
            <p className={label}>{s("from")}</p>
            <span className="mt-2 flex size-10 items-center justify-center rounded-[8px] bg-[#fbe3ef]">
              <PlatformMark platform="instagram" size={22} />
            </span>
            <p className="mt-3 truncate text-[17px] leading-6 tracking-[-0.02em]">@priya.lakeview</p>
            <p className="truncate text-[12px] text-muted">{s("directMessage")}</p>
          </div>
          <div className="px-[12%] pt-3.5 pb-4">
            <p className={label}>{s("matchedTo")}</p>
            <div className={`transition-opacity duration-500 ${shown ? "opacity-100" : "opacity-0"} motion-reduce:opacity-100`}>
              <span className={`mt-2 flex size-10 items-center justify-center rounded-[8px] text-[13px] font-semibold text-ink/70 ${people.priya.tint}`}>
                {people.priya.initials}
              </span>
              <p className="mt-3 truncate text-[17px] leading-6 tracking-[-0.02em]">{people.priya.name}</p>
              <p className="truncate text-[12px] text-muted">{s("contactMeta")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* The inbox, running off the left and bottom edges. */}
      <div className="absolute top-[45%] bottom-0 -left-12 w-[calc(94%+3rem)] rounded-tr-[32px] bg-white pt-3 pr-5 pl-6 shadow-[0_-4px_10px_0_rgb(0_0_0/0.03),0_12px_40px_-8px_rgb(24_39_75/0.18)]">
        <ul>
          {rows.map(({ text, person, platform, when, replied }) => (
            <li key={person.initials + platform} className="grid h-[62px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-5 text-[14px] sm:grid-cols-[minmax(0,1fr)_8.5rem_auto]">
              <span className="truncate text-ink/80">{text}</span>
              <span className="flex min-w-0 items-center gap-2 max-sm:hidden">
                <PlatformMark platform={platform} />
                <span className="truncate font-medium">{person.name}</span>
              </span>
              <span className="flex items-center gap-2.5 whitespace-nowrap">
                <span className="text-muted">{when}</span>
                {replied ? (
                  <Status>{s("replied")}</Status>
                ) : (
                  <span className="rounded-full px-3.5 py-1.5 text-[13px] leading-4 font-medium ring-1 ring-line">{s("reply")}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Volunteers, laid out after the reference's accounts picture: a card with
// the team, one volunteer selected and the two lists she is assigned
// opened under her; over it, two role cards, staff behind and volunteer in
// front, each saying what that role can and cannot do.

/** A member's initials on a rounded square tile. */
function MemberTile({ person, size = "size-9 text-[12px]" }: { person: Person; size?: string }) {
  return <span className={`flex shrink-0 items-center justify-center rounded-[9px] font-semibold text-ink/70 ${person.tint} ${size}`}>{person.initials}</span>;
}

function Allowed({ yes }: { yes: boolean }) {
  return yes ? (
    <Check strokeWidth={2} className="size-[18px] shrink-0 text-positive" />
  ) : (
    <svg viewBox="0 0 16 16" className="size-[18px] shrink-0 text-ink/35" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" />
    </svg>
  );
}

function RoleCard({
  role,
  member,
  rows,
  className,
}: {
  role: string;
  member: Person;
  rows: { label: string; value: ReactNode; yes: boolean }[];
  className: string;
}) {
  const t = useTranslations("Landing.mock");
  const a = useTranslations("Landing.mock.access");
  return (
    <div className={`absolute rounded-[26px] bg-white p-2.5 shadow-[0_10px_40px_-10px_rgb(24_39_75/0.22)] ${className}`}>
      <div className="rounded-[18px] bg-panel px-6 pt-5 pb-4">
        <p className="flex items-center justify-between gap-3 text-[13px] text-muted">
          {a("role")}
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-positive">
            <Check strokeWidth={2.2} className="size-3.5" />
            {t("mfaOn")}
          </span>
        </p>
        <p className="mt-2 text-[26px] leading-8 tracking-[-0.03em]">{role}</p>
        <div className="mt-4 border-t border-dashed border-ink/15 pt-3">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2.5 text-[15px]">
            <dt className="text-muted">{a("member")}</dt>
            <dd className="flex min-w-0 items-center gap-2">
              <MemberTile person={member} size="size-5 text-[8px] rounded-[5px]" />
              <span className="truncate">{member.name}</span>
            </dd>
            <Allowed yes />
            {rows.map(({ label, value, yes }) => (
              <Fragment key={label}>
                <dt className="text-muted">{label}</dt>
                <dd className="truncate">{value}</dd>
                <Allowed yes={yes} />
              </Fragment>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export function TeamPanel() {
  const t = useTranslations("Landing.mock");
  const a = useTranslations("Landing.mock.access");
  const lists = [
    { name: a("canvass"), count: a("contacts", { count: 412 }) },
    { name: a("phoneBank"), count: a("contacts", { count: 186 }) },
  ];
  return (
    <div className="absolute inset-0 text-ink">
      {/* The team, with Marie selected and her lists open. */}
      <div className="absolute top-[10%] left-[11.5%] w-[50%] min-w-[300px] rounded-[26px] bg-white p-2.5 shadow-[0_10px_40px_-10px_rgb(24_39_75/0.18)]">
        <ul>
          {[
            { person: people.jordan, role: t("roles.owner") },
            { person: people.owen, role: t("roles.staff") },
          ].map(({ person, role }) => (
            <li key={person.initials} className="flex items-center gap-3.5 px-3 py-2.5">
              <MemberTile person={person} />
              <span className="min-w-0 flex-1 truncate text-[21px] tracking-[-0.025em]">{person.name}</span>
              <span className="text-[13px] text-muted">{role}</span>
            </li>
          ))}
          <li className="flex items-center gap-3.5 rounded-[14px] bg-panel px-3 py-3">
            <MemberTile person={people.marie} />
            <span className="min-w-0 flex-1 truncate text-[21px] tracking-[-0.025em]">{people.marie.name}</span>
            <span className="text-[13px] text-muted">{t("roles.volunteer")}</span>
          </li>
        </ul>
        <ul className="mt-1 ml-[30px] space-y-2.5 border-l border-line pt-2 pb-3 pl-6">
          {lists.map(({ name, count }) => (
            <li key={name} className="flex items-center gap-2.5 text-[16px]">
              <ListSolid className="size-[18px] shrink-0 text-ink/70" />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="pr-3 text-muted">{count}</span>
            </li>
          ))}
          <li className="text-[15px] text-faint">{a("nothingElse")}</li>
        </ul>
      </div>

      <RoleCard
        role={t("roles.staff")}
        member={people.owen}
        className="top-[50%] left-[31%] w-[53%] min-w-[320px]"
        rows={[
          { label: a("lists"), value: a("allLists"), yes: true },
          { label: a("exports"), value: a("notAllowed"), yes: false },
        ]}
      />
      <RoleCard
        role={t("roles.volunteer")}
        member={people.marie}
        className="top-[40%] left-[40%] w-[51%] min-w-[320px]"
        rows={[
          { label: a("lists"), value: t("assigned"), yes: true },
          { label: a("exports"), value: a("notAllowed"), yes: false },
        ]}
      />
    </div>
  );
}

// Consent, laid out like the team panel: a card with one contact's consent
// per channel; over its corner, the record of the latest change: what it
// is now, where it came from and when. Every few seconds one channel
// changes, its row lights up and the record's values fade to the new
// change; the card and its labels stay put.
export function ConsentPanel() {
  const t = useTranslations("Landing.mock");
  const c = useTranslations("Landing.mock.consentPanel");
  const [ref, tick] = useTick(3000);
  const channels = [t("channels.email"), t("channels.sms"), t("channels.phone")];
  type State = "in" | "out" | "none";
  // Where each channel starts. On every tick one channel, in turn, flips
  // between opted in and opted out (a channel never asked is opted in).
  const start: State[] = ["in", "out", "none"];
  const changed = tick === 0 ? 0 : (tick - 1) % channels.length;
  const stateOf = (ch: number): State => {
    const flips = tick === 0 ? 0 : Math.max(0, Math.floor((tick - 1 - ch) / channels.length) + 1);
    if (flips === 0) return start[ch]!;
    const first: State = start[ch] === "in" ? "out" : "in";
    return flips % 2 === 1 ? first : first === "in" ? "out" : "in";
  };
  const label = { in: t("optedIn"), out: t("optedOut"), none: t("noAnswer") };
  const tone = { in: "positive", out: "warning", none: "neutral" } as const;
  const now = stateOf(changed);
  const source = now === "in" ? c("sourceForm") : c("sourceUnsubscribe");

  return (
    <div ref={ref} className="absolute inset-0 text-ink">
      {/* The contact's consent, channel by channel. */}
      <div className="absolute top-[9%] left-[11.5%] w-[52%] min-w-[300px] rounded-[26px] bg-white p-2.5 shadow-[0_10px_40px_-10px_rgb(24_39_75/0.18)]">
        <div className="flex items-center gap-3.5 px-3 pt-2 pb-3">
          <MemberTile person={people.marie} />
          <span className="min-w-0 flex-1 truncate text-[21px] tracking-[-0.025em]">{people.marie.name}</span>
          <span className="text-[13px] text-muted">{c("consent")}</span>
        </div>
        <ul>
          {channels.map((channel, ch) => {
            const st = stateOf(ch);
            return (
              <li
                key={channel}
                className={`flex items-center justify-between gap-3 rounded-[14px] px-3 py-3 text-[17px] transition-colors duration-500 ${tick > 0 && ch === changed ? "bg-panel" : ""}`}
              >
                {channel}
                <span key={`${ch}-${st}`} className={tick > 0 && ch === changed ? "live-pop" : ""}>
                  <Status tone={tone[st]}>{label[st]}</Status>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* The record of the latest change. */}
      <div className="absolute top-[49%] left-[38%] w-[54%] min-w-[320px] rounded-[26px] bg-white p-2.5 shadow-[0_10px_40px_-10px_rgb(24_39_75/0.22)]">
        <div className="rounded-[18px] bg-panel px-6 pt-5 pb-4">
          <p className="flex items-center justify-between gap-3 text-[13px] text-muted">
            {c("latest")}
            <span key={`c-${tick}`} className="live-fade font-medium text-ink/70">{channels[changed]}</span>
          </p>
          <p key={`s-${tick}`} className="live-fade mt-2 text-[26px] leading-8 tracking-[-0.03em]">{label[now]}</p>
          <div className="mt-4 border-t border-dashed border-ink/15 pt-3">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2.5 text-[15px]">
              <dt className="text-muted">{c("source")}</dt>
              <dd key={`src-${tick}`} className="live-fade truncate">{tick === 0 ? c("sourceForm") : source}</dd>
              <Allowed yes />
              <dt className="text-muted">{c("recorded")}</dt>
              <dd key={`at-${tick}`} className="live-fade truncate">{tick === 0 ? t("t5") : t("justNow")}</dd>
              <Allowed yes />
              <dt className="text-muted">{c("shared")}</dt>
              <dd className="truncate">{c("never")}</dd>
              <Allowed yes={false} />
            </dl>
          </div>
        </div>
      </div>
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
  // The platforms' own marks in their own colours (shapes from Simple
  // Icons, see brand-logos.tsx): Facebook's blue disc, WhatsApp's green
  // bubble, and Instagram's glyph on its gradient tile.
  const fb = <BrandLogo name="facebook" className="size-[22px] shrink-0 text-[#0866FF]" />;
  const wa = <BrandLogo name="whatsapp" className="size-[22px] shrink-0 text-[#25D366]" />;
  const ig = (
    <span
      className="flex size-[22px] shrink-0 items-center justify-center rounded-[6px] text-white"
      style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)" }}
    >
      <BrandLogo name="instagram" className="size-[14px]" />
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

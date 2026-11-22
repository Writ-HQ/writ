import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Chat, Check, Home, Inbox, ListIcon, Mail, Users } from "@/components/ui/icons";

// Product mock-ups that stand in for screenshots until the real dashboard
// exists. Every name, place and number in them is fictional. They are
// pictures: hidden from screen readers, which get a single description
// from the section that contains them.

const people = {
  marie: { name: "Marie Gagnon", initials: "MG", tint: "bg-[#c7d9b0]" },
  owen: { name: "Owen Clarke", initials: "OC", tint: "bg-[#d8c6e8]" },
  priya: { name: "Priya Nair", initials: "PN", tint: "bg-[#f3d3b8]" },
  dev: { name: "Dev Sharma", initials: "DS", tint: "bg-[#bcd7ec]" },
  sam: { name: "Sam Taylor", initials: "ST", tint: "bg-[#e7e0a9]" },
  jordan: { name: "Jordan Lee", initials: "JL", tint: "bg-[#c9e3dc]" },
} as const;

type Person = (typeof people)[keyof typeof people];

function Avatar({ person, size = "h-6 w-6 text-[9px]" }: { person: Person; size?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink/70 ${person.tint} ${size}`}>
      {person.initials}
    </span>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    // The reference's frame: a 6px corner and a three-layer shadow.
    <div
      className={`rounded-[6px] bg-white shadow-[0_-5.4px_9.7px_0_rgb(0_0_0/0.03),0_8.6px_19.3px_-6.4px_rgb(24_39_75/0.12),0_12.9px_45px_-4.3px_rgb(24_39_75/0.12)] ${className}`}
    >
      {children}
    </div>
  );
}

function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "positive" | "warning" }) {
  const tones = {
    neutral: "bg-panel text-ink/70 ring-1 ring-line",
    positive: "bg-positive-soft text-positive",
    warning: "bg-[#fff4e5] text-warning",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>{children}</span>;
}

// The hero: a dashboard with a sidebar, three figures and recent activity.
export function DashboardMock() {
  const t = useTranslations("Landing.mock");
  const nav = [
    { label: t("nav.overview"), icon: Home, active: true },
    { label: t("nav.contacts"), icon: Users },
    { label: t("nav.lists"), icon: ListIcon },
    { label: t("nav.email"), icon: Mail },
    { label: t("nav.inbox"), icon: Inbox },
    { label: t("nav.volunteers"), icon: Chat },
  ];
  const activity = [
    { person: people.marie, what: t("a1"), when: t("t1"), tone: "positive" as const },
    { person: people.owen, what: t("a2"), when: t("t2") },
    { person: people.priya, what: t("a3"), when: t("t3") },
    { person: people.dev, what: t("a4"), when: t("t4") },
    { person: people.sam, what: t("a5"), when: t("t5"), tone: "warning" as const },
  ];

  return (
    <Card className="flex h-[530px] w-[820px] overflow-hidden text-ink">
      <aside className="flex w-[200px] shrink-0 flex-col border-r border-line bg-panel/60 p-3">
        <div className="mb-4 flex items-center gap-2 rounded-[14px] bg-white p-2 ring-[0.5px] ring-[#e5e5e5]">
          <span className="h-5 w-5 rounded-[7.5px] bg-[#c7d9b0]" />
          <span className="truncate text-[11px] font-medium">{t("campaign")}</span>
        </div>
        <ul className="space-y-0.5">
          {nav.map(({ label, icon: Icon, active }) => (
            <li
              key={label}
              className={`flex items-center gap-2 rounded-[14px] px-2.5 py-1.5 text-[11px] ${active ? "bg-white font-medium ring-[0.5px] ring-[#e5e5e5]" : "text-ink/70"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-center gap-2 px-2 pb-2 text-[11px] text-ink/70">
          <Avatar person={people.jordan} size="h-5 w-5 text-[8px]" />
          {people.jordan.name}
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-5">
        <p className="mb-4 text-sm font-medium">{t("greeting")}</p>
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-[14px] border-[0.5px] border-[#e5e5e5] p-3">
            <p className="text-[10px] text-muted">{t("supporters")}</p>
            <p className="mt-1 text-2xl tracking-tight">{t("supportersValue")}</p>
            <p className="mt-1 text-[10px] text-positive">{t("supportersDelta")}</p>
          </div>
          <div className="rounded-[14px] border-[0.5px] border-[#e5e5e5] p-3">
            <p className="text-[10px] text-muted">{t("doors")}</p>
            <p className="mt-1 text-2xl tracking-tight">{t("doorsValue")}</p>
            <div className="mt-2 h-1 rounded-full bg-line">
              <div className="h-1 w-3/5 rounded-full bg-ink" />
            </div>
          </div>
          <div className="rounded-[14px] border-[0.5px] border-[#e5e5e5] p-3">
            <p className="text-[10px] text-muted">{t("volunteersActive")}</p>
            <p className="mt-1 text-2xl tracking-tight">{t("volunteersValue")}</p>
            <div className="mt-1.5 flex -space-x-1.5">
              {[people.marie, people.owen, people.priya, people.dev].map((p) => (
                <Avatar key={p.initials} person={p} size="h-4 w-4 text-[6px] ring-1 ring-white" />
              ))}
            </div>
          </div>
        </div>
        <p className="mb-2 text-[11px] font-medium">{t("activity")}</p>
        <table className="w-full text-left text-[11px]">
          <thead className="text-[10px] text-muted">
            <tr className="border-b border-line">
              <th className="py-1.5 font-normal">{t("colPerson")}</th>
              <th className="py-1.5 font-normal">{t("colWhat")}</th>
              <th className="py-1.5 text-right font-normal">{t("colWhen")}</th>
            </tr>
          </thead>
          <tbody>
            {activity.map(({ person, what, when, tone }) => (
              <tr key={person.initials} className="border-b border-line/70 last:border-0">
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <Avatar person={person} />
                    {person.name}
                  </span>
                </td>
                <td className="py-2 text-ink/80">{tone ? <Tag tone={tone}>{what}</Tag> : what}</td>
                <td className="py-2 text-right text-muted">{when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Contacts: one person's record, with household, tags and timeline.
export function ContactMock() {
  const t = useTranslations("Landing.mock");
  return (
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
        {[
          [t("tl1"), t("t2")],
          [t("tl2"), t("t5")],
          [t("tl3"), t("t5")],
        ].map(([what, when]) => (
          <li key={what} className="relative">
            <span className="absolute top-1 -left-[15.5px] h-1.5 w-1.5 rounded-full bg-ink" />
            <p>{what}</p>
            <p className="text-[10px] text-muted">{when}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// Email: a bilingual composer.
export function EmailMock() {
  const t = useTranslations("Landing.mock");
  return (
    <Card className="w-[380px] overflow-hidden text-ink">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex gap-1 rounded-full bg-panel p-0.5 text-[10px] font-medium ring-1 ring-line">
          <span className="rounded-full bg-white px-2.5 py-0.5 shadow-sm">EN</span>
          <span className="px-2.5 py-0.5 text-muted">FR</span>
        </div>
        <span className="rounded-full bg-ink px-3 py-1 text-[10px] font-medium text-white">{t("schedule")}</span>
      </div>
      <div className="space-y-3 p-4 text-[11px]">
        <div>
          <p className="text-[10px] text-muted">{t("subject")}</p>
          <p className="mt-0.5 font-medium">{t("subjectValue")}</p>
        </div>
        <p className="leading-relaxed text-ink/80">{t("bodyPreview")}</p>
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
  );
}

function PlatformBadge({ platform }: { platform: "fb" | "ig" }) {
  return platform === "fb" ? (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1877f2] text-[8px] font-bold text-white">f</span>
  ) : (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-[5px] bg-gradient-to-tr from-[#f9a03f] via-[#e1306c] to-[#833ab4] text-[8px] font-bold text-white">
      ◎
    </span>
  );
}

// Social: an inbox with messages from both platforms, matched to contacts.
export function InboxMock() {
  const t = useTranslations("Landing.mock");
  const messages = [
    { person: people.priya, platform: "ig" as const, text: t("m1"), when: t("t1"), matched: true },
    { person: people.owen, platform: "fb" as const, text: t("m2"), when: t("t3") },
    { person: people.dev, platform: "ig" as const, text: t("m3"), when: t("t4") },
  ];
  return (
    <Card className="w-[380px] overflow-hidden text-ink">
      <p className="border-b border-line px-4 py-2.5 text-[11px] font-medium">{t("inboxAll")}</p>
      <ul>
        {messages.map(({ person, platform, text, when, matched }) => (
          <li key={person.initials} className={`flex gap-3 border-b border-line/70 px-4 py-3 last:border-0 ${matched ? "bg-panel" : ""}`}>
            <span className="relative">
              <Avatar person={person} size="h-8 w-8 text-[10px]" />
              <span className="absolute -right-1 -bottom-1">
                <PlatformBadge platform={platform} />
              </span>
            </span>
            <div className="min-w-0 flex-1 text-[11px]">
              <p className="flex justify-between gap-2">
                <span className="font-medium">{person.name}</span>
                <span className="text-[10px] text-muted">{when}</span>
              </p>
              <p className="mt-0.5 truncate text-ink/75">{text}</p>
              {matched && (
                <p className="mt-1.5">
                  <Tag tone="positive">✓ {t("matched")}</Tag>
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Volunteers: a team list with roles.
export function TeamMock() {
  const t = useTranslations("Landing.mock");
  const team = [
    { person: people.jordan, role: t("roles.owner") },
    { person: people.priya, role: t("roles.admin") },
    { person: people.owen, role: t("roles.staff") },
    { person: people.marie, role: t("roles.volunteer"), lists: t("assigned") },
  ];
  return (
    <Card className="w-[360px] overflow-hidden text-ink">
      <p className="border-b border-line px-4 py-2.5 text-[11px] font-medium">{t("team")}</p>
      <ul>
        {team.map(({ person, role, lists }) => (
          <li key={person.initials} className="flex items-center gap-3 border-b border-line/70 px-4 py-2.5 text-[11px] last:border-0">
            <Avatar person={person} size="h-7 w-7 text-[9px]" />
            <span className="flex-1">
              <span className="block font-medium">{person.name}</span>
              <span className="text-[10px] text-positive">{t("mfaOn")}</span>
            </span>
            {lists && <span className="text-[10px] text-muted">{lists}</span>}
            <Tag>{role}</Tag>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Consent: one person's consent by channel.
export function ConsentMock() {
  const t = useTranslations("Landing.mock");
  const rows = [
    { channel: t("channels.email"), state: t("optedIn"), tone: "positive" as const },
    { channel: t("channels.sms"), state: t("optedOut"), tone: "warning" as const },
    { channel: t("channels.phone"), state: t("noAnswer"), tone: "neutral" as const },
  ];
  return (
    <Card className="w-[340px] overflow-hidden text-ink">
      <p className="border-b border-line px-4 py-2.5 text-[11px] font-medium">{t("consentFor")}</p>
      <ul>
        {rows.map(({ channel, state, tone }) => (
          <li key={channel} className="flex items-center justify-between border-b border-line/70 px-4 py-2.5 text-[11px] last:border-0">
            {channel}
            <Tag tone={tone}>{state}</Tag>
          </li>
        ))}
      </ul>
      <p className="bg-panel px-4 py-2.5 text-[10px] text-muted">{t("consentNote")}</p>
    </Card>
  );
}

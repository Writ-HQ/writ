import { useTranslations } from "next-intl";
import type { ComponentType, SVGProps } from "react";

import {
  ArrowRight,
  Building,
  Chat,
  Check,
  Globe,
  KeyRound,
  Layers,
  Ledger,
  ListIcon,
  Lock,
  Mail,
  MapleLeaf,
  Plus,
  Shield,
  Users,
} from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";

import { Container, SectionTitle } from "./container";
import { ConsentMock, ContactMock, EmailMock, InboxMock, TeamMock } from "./mocks";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

// Three facts in a row, between hairlines.
export function Stats() {
  const t = useTranslations("Landing.stats");
  const stats: { key: "languages" | "canada" | "place"; icon: IconType }[] = [
    { key: "languages", icon: Globe },
    { key: "canada", icon: MapleLeaf },
    { key: "place", icon: Layers },
  ];
  return (
    <Container>
      <dl className="grid border-y border-line sm:grid-cols-3">
        {stats.map(({ key, icon: Icon }) => (
          <div key={key} className="border-line py-10 not-first:border-t sm:px-8 sm:not-first:border-t-0 sm:not-first:border-l sm:first:pl-0">
            <Icon className="h-5 w-5 text-ink/70" />
            <dt className="sr-only">{t(`${key}.unit`)}</dt>
            <dd className="mt-6">
              <span className="text-[52px] leading-none tracking-[-0.04em] lg:text-[60px]">{t(`${key}.value`)}</span>{" "}
              <span className="text-xl tracking-[-0.02em]">{t(`${key}.unit`)}</span>
            </dd>
            <dd className="mt-4 max-w-[280px] text-[13px] leading-snug text-ink/80">{t(`${key}.note`)}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}

// The six parts of the product, in a grid.
export function Overview() {
  const t = useTranslations("Landing.overview");
  const items: { key: "contacts" | "lists" | "email" | "social" | "volunteers" | "consent"; icon: IconType; href: string }[] = [
    { key: "contacts", icon: Users, href: "#contacts" },
    { key: "lists", icon: ListIcon, href: "#contacts" },
    { key: "email", icon: Mail, href: "#email" },
    { key: "social", icon: Chat, href: "#social" },
    { key: "volunteers", icon: Layers, href: "#volunteers" },
    { key: "consent", icon: Shield, href: "#consent" },
  ];
  return (
    <section id="overview" className="pt-32 pb-8 sm:pt-40">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* A small stack of cards on sky, in place of an illustration. */}
          <div aria-hidden="true" className="bg-sky relative h-[88px] w-[104px] shrink-0 overflow-hidden rounded-[6px]">
            <span className="absolute top-4 left-4 h-9 w-14 rounded-md bg-white/90 shadow-sm" />
            <span className="absolute top-8 left-9 h-9 w-14 rounded-md bg-white shadow-md" />
          </div>
          <SectionTitle>
            {t("title1")}
            <br />
            {t("title2")}
          </SectionTitle>
        </div>
        <ul className="mt-14 grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ key, icon: Icon, href }) => (
            <li
              key={key}
              className="border-b border-line py-7 sm:px-6 sm:odd:pl-0 sm:even:border-l lg:px-8 lg:odd:pl-8 lg:even:border-l-0 lg:[&:not(:nth-child(3n+1))]:border-l lg:[&:nth-child(3n+1)]:pl-0"
            >
              <a href={href} className="group flex items-center gap-2 text-lg tracking-[-0.01em]">
                <Icon className="h-4 w-4 text-ink/70" />
                {t(`${key}.title`)}
                <ArrowRight className="h-3.5 w-3.5 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </a>
              <p className="mt-2 max-w-[340px] text-[13px] leading-snug text-ink/80">{t(`${key}.desc`)}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

type FeatureKey = "contacts" | "email" | "social" | "volunteers" | "consent";

const features: { key: FeatureKey; icon: IconType; bullets: string[]; Mock: ComponentType }[] = [
  { key: "contacts", icon: Users, bullets: ["b1", "b2", "b3", "b4", "b5"], Mock: ContactMock },
  { key: "email", icon: Mail, bullets: ["b1", "b2", "b3", "b4", "b5"], Mock: EmailMock },
  { key: "social", icon: Chat, bullets: ["b1", "b2", "b3", "b4"], Mock: InboxMock },
  { key: "volunteers", icon: Layers, bullets: ["b1", "b2", "b3", "b4"], Mock: TeamMock },
  { key: "consent", icon: Shield, bullets: ["b1", "b2", "b3", "b4"], Mock: ConsentMock },
];

// One product area: text on one side, a mock-up on sky on the other,
// alternating sides down the page.
function Feature({ featureKey, icon: Icon, bullets, Mock, flip }: { featureKey: FeatureKey; icon: IconType; bullets: string[]; Mock: ComponentType; flip: boolean }) {
  const t = useTranslations(`Landing.features.${featureKey}`);
  return (
    <section id={featureKey} className="py-14 lg:py-16">
      <Container>
        <div className="grid items-center gap-10 border-t border-line pt-14 lg:grid-cols-2 lg:gap-16 lg:pt-16">
          <div className={flip ? "lg:order-2" : ""}>
            <p className="flex items-center gap-2.5 text-[13px]">
              <span className="bg-sky flex h-6 w-6 items-center justify-center rounded-[5px]">
                <Icon className="h-3.5 w-3.5" />
              </span>
              {t("eyebrow")}
            </p>
            <SectionTitle className="mt-6 max-w-[540px]">{t("title")}</SectionTitle>
            <ul className="mt-8 space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-[14px] leading-snug">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {t(b as "b1")}
                </li>
              ))}
            </ul>
            <div className="mt-9">
              <Pill variant="outline" size="sm">
                {t("cta")}
              </Pill>
            </div>
          </div>
          <div aria-hidden="true" className="bg-sky relative flex h-[340px] items-center justify-center overflow-hidden rounded-[6px] sm:h-[420px]">
            <div className="scale-[0.8] sm:scale-100">
              <Mock />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Features() {
  return (
    <>
      {features.map(({ key, icon, bullets, Mock }, i) => (
        <Feature key={key} featureKey={key} icon={icon} bullets={bullets} Mock={Mock} flip={i % 2 === 1} />
      ))}
    </>
  );
}

// Who it is for. Cards rather than customer quotes: there are no
// customers yet, and no quote is invented.
export function BuiltFor() {
  const t = useTranslations("Landing.builtFor");
  const cards: { key: "candidates" | "ridings" | "advocacy"; icon: IconType; className: string; inverse?: boolean }[] = [
    {
      key: "candidates",
      icon: Users,
      className: "bg-ink-soft text-white bg-[radial-gradient(ellipse_80%_60%_at_80%_100%,rgb(255_255_255/0.14),transparent_70%)]",
      inverse: true,
    },
    { key: "ridings", icon: Building, className: "bg-mist" },
    { key: "advocacy", icon: Chat, className: "bg-sky" },
  ];
  return (
    <section id="built-for" className="py-28 sm:py-36">
      <Container>
        <SectionTitle className="mx-auto max-w-[640px] text-center">
          {t("title1")}
          <br />
          {t("title2")}
        </SectionTitle>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {cards.map(({ key, icon: Icon, className, inverse }) => (
            <article key={key} className={`flex min-h-[380px] flex-col justify-between rounded-[6px] p-7 lg:min-h-[440px] ${className}`}>
              <div>
                <Icon className="h-6 w-6 opacity-80" />
                <h3 className="mt-6 text-[28px] leading-none tracking-[-0.03em]">{t(`${key}.title`)}</h3>
                <p className={`mt-4 max-w-[340px] text-[14px] leading-snug ${inverse ? "text-white/80" : "text-ink/80"}`}>{t(`${key}.desc`)}</p>
              </div>
              <div className="mt-10">
                <Pill variant={inverse ? "outline-inverse" : "outline"} size="sm">
                  {t(`${key}.cta`)}
                </Pill>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

// How the data is protected, in a ruled grid.
export function Security() {
  const t = useTranslations("Landing.security");
  const items: { key: "isolated" | "canada" | "mfa" | "audit"; icon: IconType }[] = [
    { key: "isolated", icon: Lock },
    { key: "canada", icon: MapleLeaf },
    { key: "mfa", icon: KeyRound },
    { key: "audit", icon: Ledger },
  ];
  return (
    <section id="security" className="pb-28 sm:pb-36">
      <Container>
        <div className="grid border border-line lg:grid-cols-[1fr_1.1fr]">
          <div className="grid grid-rows-[auto_auto_1fr] border-b border-line lg:border-r lg:border-b-0">
            <div aria-hidden="true" className="bg-sky h-36 border-b border-line sm:h-44" />
            <div className="grid grid-cols-[48px_1fr_48px] border-b border-line sm:grid-cols-[96px_1fr_96px]">
              <span aria-hidden="true" className="border-r border-line" />
              <SectionTitle className="px-6 py-10 sm:text-[48px]">
                {t("title1")}
                <br />
                {t("title2")}
              </SectionTitle>
              <span aria-hidden="true" className="border-l border-line" />
            </div>
            <div aria-hidden="true" className="grid min-h-24 grid-cols-[96px_1fr] sm:grid-cols-[160px_1fr]">
              <span className="border-r border-line" />
              <span />
            </div>
          </div>
          <ul>
            {items.map(({ key, icon: Icon }) => (
              <li key={key} className="mx-6 border-b border-line py-9 last:border-0 sm:mx-10">
                <h3 className="flex items-center gap-3 text-lg tracking-[-0.01em]">
                  <Icon className="h-5 w-5 shrink-0 text-ink/70" />
                  {t(`${key}.title`)}
                </h3>
                <p className="mt-2 max-w-[440px] pl-8 text-[13px] leading-snug text-ink/80">{t(`${key}.desc`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

// Questions and answers. Native disclosure elements: they open and close
// without JavaScript and are announced correctly by screen readers.
export function Faq() {
  const t = useTranslations("Landing.faq");
  const questions = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;
  return (
    <section id="faq" className="pb-28 sm:pb-36">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <SectionTitle className="sm:text-[32px]">
              {t("title1")}
              <br />
              {t("title2")}
            </SectionTitle>
            <p className="mt-6 max-w-[320px] text-[13px] leading-snug text-ink/80">{t("subtitle")}</p>
            <div className="mt-6">
              <Pill variant="outline" size="sm">
                {t("cta")}
              </Pill>
            </div>
          </div>
          <div className="border-t border-line lg:border-t-0">
            {questions.map((q) => (
              <details key={q} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15px] [&::-webkit-details-marker]:hidden">
                  {t(`${q}.q`)}
                  <Plus className="h-4 w-4 shrink-0 transition-transform group-open:rotate-45" />
                </summary>
                <p className="max-w-[640px] pb-6 text-[14px] leading-relaxed text-ink/75">{t(`${q}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Closing() {
  const t = useTranslations("Landing.closing");
  return (
    <section className="bg-sky-band">
      <Container className="flex flex-col gap-10 py-24 lg:flex-row lg:items-center lg:justify-between lg:py-28">
        <SectionTitle className="sm:text-[52px]">
          {t("title1")}
          <br />
          {t("title2")}
        </SectionTitle>
        <div className="flex flex-wrap gap-3 lg:mr-[12%]">
          <Pill variant="slate" size="lg">
            {t("waitlist")}
          </Pill>
          <Pill variant="outline-light" size="lg" className="bg-white/30">
            {t("demo")}
          </Pill>
        </div>
      </Container>
    </section>
  );
}

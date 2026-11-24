import { useTranslations } from "next-intl";
import type { ComponentType, SVGProps } from "react";

import {
  BoltSolid,
  BriefcaseSolid,
  BrowserSolid,
  BuildingSolid,
  CalendarSolid,
  ChatSolid,
  Check,
  GlobeSolid,
  KeySolid,
  LayersSolid,
  LedgerSolid,
  ListSolid,
  LockSolid,
  MailSolid,
  MapleLeafRed,
  PhoneSolid,
  Plus,
  ShieldSolid,
  StarSolid,
  UsersSolid,
} from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";

import { CampaignBox } from "./campaign-box";
import { Container, SectionTitle } from "./container";
import { CountUp } from "./count-up";
import { MockReveal } from "./mock-reveal";
import { ConsentPanel, ContactsPanel, EmailPanel, SocialPanel, TeamPanel } from "./live-mocks";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

// Three facts in a row, between hairlines.
export function Stats() {
  const t = useTranslations("Landing.stats");
  const stats: { key: "languages" | "canada" | "place"; icon: IconType }[] = [
    { key: "languages", icon: GlobeSolid },
    { key: "canada", icon: MapleLeafRed },
    { key: "place", icon: LayersSolid },
  ];
  return (
    <Container>
      <dl className="grid border-y border-line sm:grid-cols-3">
        {stats.map(({ key, icon: Icon }) => (
          <div key={key} className="border-line py-10 not-first:border-t sm:px-8 sm:not-first:border-t-0 sm:not-first:border-l sm:first:pl-0">
            <Icon className="h-6 w-6 text-ink" />
            <dt className="sr-only">{t(`${key}.unit`)}</dt>
            <dd className="mt-6">
              <span className="text-[52px] leading-none tracking-[-0.04em] lg:text-[60px]">
                <CountUp value={t(`${key}.value`)} />
              </span>{" "}
              <span className="text-xl tracking-[-0.02em]">{t(`${key}.unit`)}</span>
            </dd>
            <dd className="mt-4 max-w-[280px] text-[13px] leading-snug text-ink/80">{t(`${key}.note`)}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}

// The six parts of the product. Measurements from the reference: 128px
// above and below; a 135x138 picture, 24px gap and the heading centred
// beside it; 32px down to a frame with 6% hairlines top and bottom and 32px
// inside; two rows of three, 32px between rows and 31px between columns,
// with hairline dividers; each item a 20px title and a 16px/21px
// description, 8px apart, inside 16px of padding.
export function Overview() {
  const t = useTranslations("Landing.overview");
  type Key =
    | "contacts"
    | "lists"
    | "email"
    | "social"
    | "volunteers"
    | "consent"
    | "texts"
    | "appointments"
    | "automations"
    | "reviews"
    | "websites"
    | "casework";
  // Items with a section further down link to it; the rest have none yet.
  const rows: { key: Key; icon: IconType; href?: string }[][] = [
    [
      { key: "contacts", icon: UsersSolid, href: "#contacts" },
      { key: "lists", icon: ListSolid, href: "#contacts" },
      { key: "email", icon: MailSolid, href: "#email" },
    ],
    [
      { key: "social", icon: ChatSolid, href: "#social" },
      { key: "volunteers", icon: LayersSolid, href: "#volunteers" },
      { key: "consent", icon: ShieldSolid, href: "#consent" },
    ],
    [
      { key: "texts", icon: PhoneSolid },
      { key: "appointments", icon: CalendarSolid },
      { key: "automations", icon: BoltSolid },
    ],
    [
      { key: "reviews", icon: StarSolid },
      { key: "websites", icon: BrowserSolid },
      { key: "casework", icon: BriefcaseSolid },
    ],
  ];
  return (
    <section id="overview" className="py-24 lg:py-32">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* A box of a campaign's everyday tools (campaign-box.tsx). */}
          <CampaignBox className="h-[120px] w-[120px] shrink-0 sm:h-[150px] sm:w-[150px]" />
          <SectionTitle>
            {t("title1")}
            <br />
            {t("title2")}
          </SectionTitle>
        </div>

        <div className="mt-8 border-y border-black/[0.06] py-8">
          {rows.map((row, r) => (
            <div key={r}>
              {r > 0 && <div aria-hidden="true" className="my-4 hidden h-px bg-black/[0.06] lg:block" />}
              <ul className="-mx-4 grid lg:grid-cols-3">
                {row.map(({ key, icon: Icon, href }, c) => (
                  <li key={key} className={`border-black/[0.06] max-lg:not-first:border-t lg:px-[15.5px] lg:first:pl-0 lg:last:pr-0 ${c > 0 ? "lg:border-l" : ""}`}>
                    {(() => {
                      // On hover: a soft tile behind, the icon lifts and tilts,
                      // the title nudges right and the text darkens. Still for
                      // people who ask for less motion.
                      const motion = "transition duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none";
                      const body = (
                        <>
                          <span className="flex items-center gap-2 text-xl leading-[23px]">
                            <Icon className={`h-5 w-5 shrink-0 text-ink ${motion} group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:-rotate-6`} />
                            <span className={`${motion} group-hover:translate-x-0.5`}>{t(`${key}.title`)}</span>
                          </span>
                          <span className={`max-w-[380px] text-base leading-[21px] text-ink/80 ${motion} group-hover:text-ink`}>{t(`${key}.desc`)}</span>
                        </>
                      );
                      const tile = `group flex flex-col gap-2 rounded-2xl p-4 transition-colors duration-300 hover:bg-panel motion-reduce:transition-none`;
                      return href ? (
                        <a href={href} className={tile}>
                          {body}
                        </a>
                      ) : (
                        <div className={tile}>{body}</div>
                      );
                    })()}
                  </li>
                ))}
              </ul>
              {r === 0 && <div aria-hidden="true" className="h-px bg-black/[0.06] lg:hidden" />}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

type FeatureKey = "contacts" | "email" | "social" | "volunteers" | "consent";

// Each feature has its own sky behind its picture and on its icon tile.
// `fill`: the picture fills its panel instead of sitting centred in it.
const features: { key: FeatureKey; icon: IconType; bullets: string[]; Mock: ComponentType; sky: string; fill?: boolean }[] = [
  { key: "contacts", icon: UsersSolid, bullets: ["b1", "b2", "b3", "b4", "b5"], Mock: ContactsPanel, sky: "bg-sky", fill: true },
  { key: "email", icon: MailSolid, bullets: ["b1", "b2", "b3", "b4", "b5"], Mock: EmailPanel, sky: "bg-dawn", fill: true },
  { key: "social", icon: ChatSolid, bullets: ["b1", "b2", "b3", "b4"], Mock: SocialPanel, sky: "bg-lavender", fill: true },
  { key: "volunteers", icon: LayersSolid, bullets: ["b1", "b2", "b3", "b4"], Mock: TeamPanel, sky: "bg-sage", fill: true },
  { key: "consent", icon: ShieldSolid, bullets: ["b1", "b2", "b3", "b4"], Mock: ConsentPanel, sky: "bg-dusk", fill: true },
];

// One product area: text on one side, a mock-up on sky on the other,
// alternating sides down the page. Sized from the reference: a hairline
// over the text column only, level with the top of a 544px sky panel; a
// 16px eyebrow 36px below it; a 44px heading on 40px lines; then, pushed
// to the bottom so the button lines up with the panel's foot, 17px
// bullets 8px apart and a 42px outline button.
function Feature({
  featureKey,
  icon: Icon,
  bullets,
  Mock,
  sky,
  fill = false,
  flip,
}: {
  featureKey: FeatureKey;
  icon: IconType;
  bullets: string[];
  Mock: ComponentType;
  sky: string;
  fill?: boolean;
  flip: boolean;
}) {
  const t = useTranslations(`Landing.features.${featureKey}`);
  return (
    <section id={featureKey} className="py-12 lg:py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className={`flex flex-col border-t border-line pt-9 ${flip ? "lg:order-2" : ""}`}>
            <p className="flex items-center gap-3 text-base leading-5">
              <Icon className="h-5 w-5 shrink-0" />
              {t("eyebrow")}
            </p>
            <h2 className="mt-7 max-w-[600px] text-[34px] leading-[34px] font-normal tracking-[-0.035em] text-balance sm:text-[44px] sm:leading-[40px]">
              {t("title")}
            </h2>
            <div className="mt-10 lg:mt-auto lg:pt-12">
              <ul className="space-y-2">
                {bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-[17px] leading-[23px]">
                    <Check strokeWidth={1.75} className="mt-[3px] h-[17px] w-[17px] shrink-0" />
                    {t(b as "b1")}
                  </li>
                ))}
              </ul>
              <div className="mt-9">
                <Pill variant="outline" size="feature">
                  {t("cta")}
                </Pill>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className={`${sky} relative flex h-[340px] items-center justify-center overflow-hidden sm:h-[440px] lg:h-[544px]`}>
            {fill ? (
              <Mock />
            ) : (
              <div className="scale-[0.8] sm:scale-100 lg:scale-110">
                <MockReveal>
                  <Mock />
                </MockReveal>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Features() {
  return (
    <>
      {features.map(({ key, icon, bullets, Mock, sky, fill }, i) => (
        <Feature key={key} featureKey={key} icon={icon} bullets={bullets} Mock={Mock} sky={sky} fill={fill} flip={i % 2 === 1} />
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
      icon: UsersSolid,
      className: "bg-ink-soft text-white bg-[radial-gradient(ellipse_80%_60%_at_80%_100%,rgb(255_255_255/0.14),transparent_70%)]",
      inverse: true,
    },
    { key: "ridings", icon: BuildingSolid, className: "bg-mist" },
    { key: "advocacy", icon: ChatSolid, className: "bg-sky" },
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
                <Icon className="h-6 w-6" />
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

// How the data is protected, in a ruled grid of solid black lines, sized
// from the reference: each side is four 164px rows. Left: sky, then the
// heading between two 123px cells, then a 246px cell, then the same three
// cells again. Right: four items, 20px titles and 14px/18px descriptions,
// with dividers inset 40px.
export function Security() {
  const t = useTranslations("Landing.security");
  const items: { key: "isolated" | "canada" | "mfa" | "audit"; icon: IconType }[] = [
    { key: "isolated", icon: LockSolid },
    { key: "canada", icon: MapleLeafRed },
    { key: "mfa", icon: KeySolid },
    { key: "audit", icon: LedgerSolid },
  ];
  const row = "border-t border-ink lg:h-[164px]";
  return (
    <section id="security" className="pb-24 lg:pb-32">
      <Container>
        <div className="grid border border-ink lg:grid-cols-2">
          <div className="border-b border-ink lg:border-r lg:border-b-0">
            <div aria-hidden="true" className="bg-sky h-36 lg:h-[164px]" />
            <div className={`grid grid-cols-[48px_1fr_48px] sm:grid-cols-[96px_1fr_96px] xl:grid-cols-[123px_1fr_123px] ${row}`}>
              <span aria-hidden="true" className="border-r border-ink" />
              <h2 className="flex min-w-0 items-center overflow-hidden px-6 py-10 text-[40px] leading-[38px] font-normal tracking-[-0.8px] lg:px-6 lg:py-0 lg:text-[44px] lg:leading-[42px] xl:px-[33px] xl:text-[56px] xl:leading-[52px] xl:tracking-[-1.12px]">
                <span>
                  {t("title1")}
                  <br />
                  {t("title2")}
                </span>
              </h2>
              <span aria-hidden="true" className="border-l border-ink" />
            </div>
            <div aria-hidden="true" className={`hidden grid-cols-[192px_1fr] lg:grid xl:grid-cols-[246px_1fr] ${row}`}>
              <span className="border-r border-ink" />
              <span />
            </div>
            <div aria-hidden="true" className={`hidden grid-cols-[96px_1fr_96px] lg:grid xl:grid-cols-[123px_1fr_123px] ${row}`}>
              <span className="border-r border-ink" />
              <span />
              <span className="border-l border-ink" />
            </div>
          </div>
          <ul>
            {items.map(({ key, icon: Icon }) => (
              <li key={key} className="mx-6 flex flex-col justify-center border-b border-ink py-8 last:border-0 sm:mx-10 lg:h-[164px] lg:py-0">
                <div className="grid grid-cols-[20px_1fr] gap-x-[17px] gap-y-2 sm:pl-[35px]">
                  <Icon className="mt-[1px] h-5 w-5" />
                  <h3 className="text-xl leading-[23px] font-normal">{t(`${key}.title`)}</h3>
                  <p className="col-start-2 max-w-[360px] text-sm leading-[18px]">{t(`${key}.desc`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

// Questions and answers, sized from the reference: a 416px column, 64px
// gap; a 32px medium heading; 20px medium questions with 24px above and
// below, between solid black lines. Native disclosure elements sharing one
// name, so opening an answer closes the one that was open; they open
// and close without JavaScript and are announced correctly by screen
// readers.
export function Faq() {
  const t = useTranslations("Landing.faq");
  const questions = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;
  return (
    <section id="faq" className="py-24 lg:py-32">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[416px_1fr] lg:gap-16">
          <div className="flex flex-col items-start gap-8 lg:py-8">
            <h2 className="text-[32px] leading-[35px] font-medium tracking-[-0.64px]">
              {t("title1")}
              <br />
              {t("title2")}
            </h2>
            <p className="text-base leading-[21px]">{t("subtitle")}</p>
            <Pill variant="outline" size="sm" className="h-9">
              {t("cta")}
            </Pill>
          </div>
          <div className="faq-list">
            {questions.map((q) => (
              <details key={q} name="faq" className="faq-item group border-b border-ink last:border-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-xl leading-[23px] font-medium [&::-webkit-details-marker]:hidden">
                  {t(`${q}.q`)}
                  <Plus className="h-3 w-3 shrink-0 transition-transform group-open:rotate-45" strokeWidth={2.5} />
                </summary>
                <p className="max-w-[680px] pb-6 text-base leading-[21px] text-ink/80">{t(`${q}.a`)}</p>
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
          <Pill variant="slate" size="lg" href="/waitlist">
            {t("start")}
          </Pill>
          <Pill variant="outline-light" size="lg" className="bg-white/30">
            {t("demo")}
          </Pill>
        </div>
      </Container>
    </section>
  );
}

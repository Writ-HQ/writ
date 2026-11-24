"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Container } from "@/components/landing/container";

import { Field } from "./field";
import { Horizon } from "./horizon";

// The manifesto, laid out as on the tokensupply-landing project: a
// dictionary entry for Writ, then a narrow column of paragraphs that come
// into focus as they scroll in, four beliefs with one word in italics, and
// the ending: a field pinned behind the page rises as you scroll
// (field.tsx) and the closing words gather out of sparkles (horizon.tsx).
// The site header stays, with no footer; dots beside the column mark your
// place. The words are in messages (Manifesto), in English and French.

const BODY = "text-pretty text-[18px] leading-[29px] tracking-[-0.005em] md:text-[20px] md:leading-[32px]";
const TITLE = "text-balance text-[20px] font-normal leading-7 tracking-[-0.02em] text-ink md:text-[24px] md:leading-8";
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const FOCUS = "transition-[opacity,filter] duration-800 motion-reduce:transition-none";
const BLURRED = "opacity-15 blur-[5px] motion-reduce:opacity-100 motion-reduce:blur-none";

/** How many paragraphs each part has, by key under Manifesto.parts. */
const PARTS = [
  { key: "p1", paragraphs: ["s1", "s2", "s3", "s4", "s5"] },
  { key: "p2", paragraphs: ["s1", "s2", "s3"] },
  { key: "p3", paragraphs: ["s1", "s2", "s3", "s4"] },
] as const;
const BELIEFS = ["b1", "b2", "b3", "b4"] as const;

/** True once the element has come into view (once). */
function useSeen<T extends Element>(margin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return { ref, seen };
}

/** A paragraph that sharpens from a soft blur as it scrolls into view. */
function Para({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { ref, seen } = useSeen<HTMLParagraphElement>();
  return (
    <p ref={ref} className={`${FOCUS} ${EASE} ${seen ? "opacity-100 blur-none" : BLURRED} ${className}`}>
      {children}
    </p>
  );
}

/** The opening: Writ as a dictionary entry, its meaning coming into focus last. */
function Entry() {
  const t = useTranslations("Manifesto");
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className={`transition-[opacity,translate] duration-700 motion-reduce:transition-none ${EASE} ${on ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
      <p className="text-[13px] leading-5 font-normal text-ink/50 md:text-[14px]">{t("eyebrow")}</p>
      <h1 className="mt-10 text-[22px] leading-[32px] tracking-[-0.025em] text-ink min-[380px]:text-[26px] min-[380px]:leading-[36px] md:mt-14 md:text-[34px] md:leading-[44px] lg:w-[760px] lg:text-[40px] lg:leading-[52px]">
        <span className="block">
          <span className="font-normal">{t("entry.word")}</span>{" "}
          {/* The sound and the word class stay together on one line. */}
          <span className="font-normal tracking-[-0.01em] whitespace-nowrap text-ink/75">
            {t("entry.sound")} <em className="italic">{t("entry.kind")}</em>
          </span>
        </span>
        <span className="block font-normal">{t("entry.meaning")}</span>
        <span
          className={`block font-normal transition-[opacity,filter] delay-[800ms] duration-[1400ms] motion-reduce:transition-none ${EASE} ${on ? "opacity-100 blur-none" : "opacity-0 blur-[14px]"}`}
        >
          {t("entry.reveal")}
        </span>
      </h1>
    </div>
  );
}

function BeliefLine({ id }: { id: (typeof BELIEFS)[number] }) {
  const t = useTranslations(`Manifesto.beliefs.${id}`);
  const { ref, seen } = useSeen<HTMLLIElement>();
  return (
    <li ref={ref} className={`${FOCUS} ${EASE} ${seen ? "opacity-100 blur-none" : BLURRED}`}>
      <p className="text-[20px] leading-[30px] text-pretty text-ink md:text-[22px] md:leading-[32px]">
        {t("before")}
        <em className="italic">{t("em")}</em>
        {t("after")}
      </p>
      <p className="mt-1 text-[16px] leading-[26px] text-pretty text-ink/55 md:text-[17px] md:leading-[27px]">{t("because")}</p>
    </li>
  );
}

/** A dot for each part beside the column, filled once you reach it. Laptops and up only. */
function Progress({ parts, active, shown }: { parts: number; active: number; shown: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed top-1/2 left-[calc(50%-320px-72px)] z-10 hidden -translate-y-1/2 flex-col gap-2.5 transition-opacity duration-500 lg:flex ${shown ? "opacity-100" : "opacity-0"}`}
    >
      {Array.from({ length: parts }, (_, i) => (
        <span key={i} className={`size-[9px] rounded-full border transition-colors duration-300 ${i <= active ? "border-transparent bg-ink/30" : "border-ink/25 bg-transparent"}`} />
      ))}
    </div>
  );
}

/** Which part is at the middle of the screen, and whether the reading column is on screen at all. */
function useReading(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const column = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const middle = { rootMargin: "-50% 0px -50% 0px" };
    const parts = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(refs.current.indexOf(e.target as HTMLElement));
    }, middle);
    refs.current.forEach((el) => el && parts.observe(el));
    const wrap = new IntersectionObserver(([e]) => setShown(e?.isIntersecting ?? false), middle);
    if (column.current) wrap.observe(column.current);
    return () => {
      parts.disconnect();
      wrap.disconnect();
    };
  }, [count]);
  const mark = (i: number) => (el: HTMLElement | null) => {
    refs.current[i] = el;
  };
  return { column, mark, active, shown };
}

export function ManifestoPage() {
  const t = useTranslations("Manifesto");
  const count = PARTS.length + 1;
  const { column, mark, active, shown } = useReading(count);
  const reading = useRef<HTMLDivElement>(null);
  const ending = useRef<HTMLElement>(null);
  return (
    <div>
      <Field reading={reading} ending={ending} />
      {/* Everything above the ending, over the field. */}
      <div ref={reading} className="relative z-10">
        <Container className="pt-34 pb-16 md:pt-36 md:pb-24">
          <div className="mx-auto max-w-[640px]">
            <Entry />
            <div ref={column} className="mt-24 md:mt-28">
              {PARTS.map((part, i) => (
                <section key={part.key} ref={mark(i)} aria-labelledby={`part-${i}`} className={i > 0 ? "mt-20 md:mt-28" : ""}>
                  <h2 id={`part-${i}`} className={TITLE}>
                    {t(`parts.${part.key}.title`)}
                  </h2>
                  <div className={`${BODY} mt-6 flex flex-col gap-4 text-ink/85 md:mt-8 md:gap-5`}>
                    {part.paragraphs.map((p) => (
                      <Para key={p}>{t(`parts.${part.key}.${p}` as "parts.p1.s1")}</Para>
                    ))}
                  </div>
                  {/* The last part ends on "It means:", and the beliefs follow it. */}
                  {i === PARTS.length - 1 && (
                    <ul className="mt-10 flex flex-col gap-7 md:mt-12 md:gap-8">
                      {BELIEFS.map((b) => (
                        <BeliefLine key={b} id={b} />
                      ))}
                    </ul>
                  )}
                </section>
              ))}
              <section ref={mark(PARTS.length)} aria-labelledby="part-close" className="mt-20 md:mt-28">
                <h2 id="part-close" className={TITLE}>
                  {t("close.title")}
                </h2>
                <div className={`${BODY} mt-6 flex flex-col gap-4 text-ink/85 md:mt-8 md:gap-5`}>
                  <Para>{t("close.s1")}</Para>
                  <Para>{t("close.s2")}</Para>
                </div>
                <Para className="mt-10 text-[15px] leading-6 text-ink/55">{t("close.sign")}</Para>
              </section>
            </div>
          </div>
        </Container>
      </div>
      <Horizon section={ending} />
      <Progress parts={count} active={active} shown={shown} />
    </div>
  );
}

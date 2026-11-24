import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Container } from "@/components/landing/container";
import { ChevronDown } from "@/components/ui/icons";
import { facts } from "@/content/legal/facts";
import type { Block, FactKey, LegalDoc, LegalSlug } from "@/content/legal/types";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

// A legal page, laid out like the reference: a "Related" list of the other
// legal pages on the left, sticky on large screens; on the right a large
// title, the date it last changed, an introduction, an optional "short
// version" in a tinted box, and numbered sections.

const TOKEN = /\{(\w+)\}/g;

/** Text with {tokens} filled in from facts.ts; unknown facts show as a highlighted blank. */
function Filled({ text }: { text: string }) {
  const t = useTranslations("Legal.missing");
  const locale = useLocale() as Locale;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const key = m[1] as FactKey;
    parts.push(text.slice(last, m.index));
    const fact = facts[key];
    const value = fact == null ? null : typeof fact === "string" ? fact : fact[locale];
    parts.push(
      value ?? (
        <mark key={m.index} className="rounded-[4px] bg-star/15 px-1 text-ink">
          [{t(key)}]
        </mark>
      ),
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function BlockView({ block }: { block: Block }) {
  if (typeof block === "string") {
    return (
      <p>
        <Filled text={block} />
      </p>
    );
  }
  if ("list" in block) {
    return (
      <ul className="list-disc space-y-2 pl-6 marker:text-faint">
        {block.list.map((item) => (
          <li key={item} className="pl-1">
            <Filled text={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
      <table className="w-full min-w-[560px] border-collapse text-left text-[15px] leading-[22px]">
        <thead>
          <tr>
            {block.table.head.map((h) => (
              <th key={h} className="border-b border-line bg-panel px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map((row, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top text-ink/80">
                  <Filled text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalPage({
  slug,
  doc,
  related,
  updated,
}: {
  slug: LegalSlug;
  doc: LegalDoc;
  /** Every legal page, in order, with its title. */
  related: { slug: LegalSlug; title: string }[];
  /** YYYY-MM-DD. */
  updated: string;
}) {
  const t = useTranslations("Legal");
  const format = useFormatter();
  const date = format.dateTime(new Date(`${updated}T12:00:00Z`), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <Container>
      <div className="grid gap-12 py-16 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-20 lg:py-24">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[13px] tracking-[0.08em] text-muted uppercase">{t("related")}</p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 lg:flex-col lg:gap-5">
            {related
              .filter((r) => r.slug !== slug)
              .map((r) => (
                <li key={r.slug}>
                  <Link href={`/${r.slug}`} className="group inline-flex items-center gap-2 text-[17px] text-ink/70 transition-colors hover:text-ink">
                    {r.title}
                    <ChevronDown className="size-3.5 -rotate-90 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
          </ul>
        </aside>

        <article className="max-w-[760px] min-w-0">
          <h1 className="text-[40px] leading-[1.05] font-normal tracking-[-0.035em] sm:text-[56px]">{doc.title}</h1>
          <p className="mt-4 text-[15px] text-muted">{t("updated", { date })}</p>

          <div className="mt-12 space-y-6 text-[18px] leading-[30px] text-ink/80">
            {doc.intro.map((p) => (
              <p key={p}>
                <Filled text={p} />
              </p>
            ))}
          </div>

          {doc.short && (
            <section className="mt-16">
              <h2 className="text-[28px] leading-tight font-normal tracking-[-0.02em] sm:text-[32px]">1. {t("shortTitle")}</h2>
              <ul className="mt-6 list-disc space-y-3 rounded-[20px] bg-panel py-7 pr-8 pl-12 text-[18px] leading-[30px] text-ink/80 ring-1 ring-line marker:text-faint">
                {doc.short.map((item) => (
                  <li key={item} className="pl-1">
                    <Filled text={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {doc.sections.map((s, i) => (
            <section key={s.title} className="mt-16">
              <h2 className="text-[28px] leading-tight font-normal tracking-[-0.02em] sm:text-[32px]">
                {i + (doc.short ? 2 : 1)}. {s.title}
              </h2>
              <div className="mt-6 space-y-5 text-[18px] leading-[30px] text-ink/80">
                {s.body.map((b, j) => (
                  <BlockView key={j} block={b} />
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
    </Container>
  );
}

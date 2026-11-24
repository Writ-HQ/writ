import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/landing/footer";
import { AnnouncementBar, Navbar } from "@/components/landing/header";
import { LegalPage } from "@/components/legal/legal-page";
import { legalDocs } from "@/content/legal";
import { LEGAL_UPDATED } from "@/content/legal/facts";
import { LEGAL_DOCS, type LegalSlug } from "@/content/legal/types";
import { routing, type Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string; doc: string }> };

// The legal pages, at /en/privacy, /fr/terms and so on. Anything else at
// this level is a 404.
const isDoc = (s: string): s is LegalSlug => (LEGAL_DOCS as readonly string[]).includes(s);
const isLocale = (s: string): s is Locale => (routing.locales as readonly string[]).includes(s);

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ doc }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!isDoc(doc) || !isLocale(locale)) return {};
  const d = legalDocs[locale][doc];
  return { title: `${d.title} — Writ`, description: d.description };
}

export default async function LegalDocPage({ params }: Props) {
  const { locale, doc } = await params;
  if (!isDoc(doc) || !isLocale(locale)) notFound();
  const docs = legalDocs[locale];
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <LegalPage slug={doc} doc={docs[doc]} related={LEGAL_DOCS.map((s) => ({ slug: s, title: docs[s].title }))} updated={LEGAL_UPDATED} />
      </main>
      <Footer />
    </>
  );
}

import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { PageTitle } from "@/components/dashboard/kit";
import { sections } from "@/components/dashboard/sections";

type Props = { params: Promise<{ locale: string; section: string }> };

// The sections other than the overview, until each is built: the shell
// and a title, so the sidebar's links lead somewhere. Anything not in the
// sidebar is a 404.
const keys = sections.map((s) => s.key).filter((k) => k !== "overview");
type Key = (typeof keys)[number];
const isSection = (s: string): s is Key => (keys as string[]).includes(s);

export function generateStaticParams() {
  return keys.map((section) => ({ section }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  if (!isSection(section)) return {};
  const t = await getTranslations("Dashboard.nav");
  return { title: `${t(section)} — Writ` };
}

export default async function SectionPage({ params }: Props) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  return <Placeholder section={section} />;
}

function Placeholder({ section }: { section: Key }) {
  const t = useTranslations("Dashboard");
  return (
    <div>
      <PageTitle title={t(`nav.${section}`)} description={t("soon")} />
      <div className="mt-6 flex h-64 items-center justify-center rounded-2xl border border-dashed border-line text-[13.5px] text-faint">
        {t("soon")}
      </div>
    </div>
  );
}

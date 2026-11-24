import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Overview } from "@/components/dashboard/overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.nav");
  return { title: `${t("overview")} — Writ` };
}

export default function OverviewPage() {
  return <Overview />;
}

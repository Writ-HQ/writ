import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Navbar } from "@/components/landing/header";
import { ManifestoPage } from "@/components/manifesto/manifesto-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Manifesto");
  return { title: `${t("metaTitle")} — Writ`, description: t("metaDescription") };
}

// The manifesto: the site header, then the page, which ends inside its
// full-screen colour field with no footer.
export default function Manifesto() {
  return (
    <>
      <Navbar />
      <main>
        <ManifestoPage />
      </main>
    </>
  );
}

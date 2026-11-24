import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ComponentType, SVGProps } from "react";

import { ContactForm } from "@/components/contact/contact-form";
import { Container } from "@/components/landing/container";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/header";
import { ArrowRight, ChatSolid, LockSolid, MailSolid, NewspaperSolid } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { topicFrom, type Topic } from "@/lib/contact";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contact");
  return { title: `${t("metaTitle")} — Writ`, description: t("metaDescription") };
}

type Props = { searchParams: Promise<{ topic?: string | string[] }> };

// Contact: the site header and footer around two columns, what to write
// about on the left and the form on a sky panel on the right. A link can
// choose the form's topic, as the "See a demo" buttons do
// (/contact?topic=demo). Messages are saved by ./actions.ts.
export default async function ContactPage({ searchParams }: Props) {
  const topic = topicFrom((await searchParams).topic);
  return (
    <>
      <Navbar />
      <main>
        <ContactBody topic={topic} />
      </main>
      <Footer />
    </>
  );
}

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

function ContactBody({ topic }: { topic?: Topic }) {
  const t = useTranslations("Contact");
  const reasons: { key: "demo" | "privacy" | "press"; icon: IconType }[] = [
    { key: "demo", icon: ChatSolid },
    { key: "privacy", icon: LockSolid },
    { key: "press", icon: NewspaperSolid },
  ];
  return (
    <section className="py-12 lg:py-20">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col border-t border-line pt-9">
            <p className="flex items-center gap-3 text-base leading-5">
              <MailSolid className="size-5 shrink-0" />
              {t("eyebrow")}
            </p>
            <h1 className="mt-7 max-w-[560px] text-[34px] leading-[34px] font-normal tracking-[-0.035em] text-balance sm:text-[48px] sm:leading-[46px]">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-[460px] text-[17px] leading-[24px] text-ink/70">{t("subtitle")}</p>

            <ul className="mt-12 lg:mt-auto lg:pt-12">
              {reasons.map(({ key, icon: Icon }) => (
                <li key={key} className="border-t border-line first:border-t-0">
                  <Link
                    href={{ pathname: "/contact", query: { topic: key } }}
                    scroll={false}
                    aria-current={topic === key ? "true" : undefined}
                    className="group flex items-start gap-4 py-5"
                  >
                    <Icon className="mt-0.5 size-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] leading-[23px] font-medium">{t(`reasons.${key}.title`)}</span>
                      <span className="mt-1 block text-[15px] leading-[21px] text-muted">{t(`reasons.${key}.body`)}</span>
                    </span>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-sky relative flex items-center justify-center px-4 py-10 sm:px-10 sm:py-14">
            <div className="w-full max-w-[540px] rounded-[26px] bg-white p-6 shadow-[0_10px_40px_-10px_rgb(24_39_75/0.18)] sm:p-8">
              {/* Remounted when a link above changes the topic, so the
                  dropdown follows it. */}
              <ContactForm key={topic ?? "none"} topic={topic} />
              <p className="mt-6 text-[13px] leading-5 text-muted">
                {t.rich("privacy", {
                  link: (chunks) => (
                    <Link href="/privacy" className="font-medium text-ink underline-offset-4 hover:underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

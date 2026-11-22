import { Footer } from "@/components/landing/footer";
import { AnnouncementBar, Navbar } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { BuiltFor, Closing, Faq, Features, Overview, Security, Stats } from "@/components/landing/sections";

// The public landing page. Every call to action is a button that is not
// wired to anything yet.
export default function LandingPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Overview />
        <Features />
        <BuiltFor />
        <Security />
        <Faq />
        <Closing />
      </main>
      <Footer />
    </>
  );
}

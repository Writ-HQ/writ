import type { LogoKey } from "@/components/landing/brand-logos";

// The names in the landing page's moving band: the platforms campaigns connect, and the open-source projects Writ runs on.
// Every entry must be true of Writ today or of a feature the page
// describes; add or remove names here, not in the component. A logo is
// shown only where brand-logos.tsx has one (see subprocessors.ts).
// AWS and Zitadel are left out of the band by choice; they are still in
// subprocessors.ts. X (Twitter) is listed ahead of its integration, which
// is not built yet (docs/before-launch.md).

export type BandItem = {
  /** The name as its owner writes it. Not translated. */
  name: string;
  /** Key under Landing.band.purposes: what it does for Writ. Not shown in
   *  the band, kept for a fuller list such as a privacy page. */
  purpose: "hosting" | "signIn" | "social" | "database" | "web";
  /** Shown before the name, where the owner's guidelines allow a logo. */
  logo?: LogoKey;
};

export const builtWith: BandItem[] = [
  { name: "Facebook", purpose: "social", logo: "facebook" },
  { name: "Instagram", purpose: "social", logo: "instagram" },
  { name: "X (Twitter)", purpose: "social", logo: "x" },
  { name: "PostgreSQL", purpose: "database", logo: "postgresql" },
  { name: "Next.js", purpose: "web", logo: "nextjs" },
];

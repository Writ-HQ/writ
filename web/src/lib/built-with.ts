import type { LogoKey } from "@/components/landing/brand-logos";

import { subprocessors } from "./subprocessors";

// The names in the landing page's moving band: the subprocessors, the
// platforms campaigns connect, and the open-source projects Writ runs on.
// Every entry must be true of Writ today or of a feature the page
// describes; add or remove names here, not in the component. Names, not
// logos only where brand-logos.tsx has one (see subprocessors.ts).

export type BandItem = {
  /** The name as its owner writes it. Not translated. */
  name: string;
  /** Key under Landing.band.purposes. */
  purpose: "hosting" | "signIn" | "social" | "database" | "web";
  /** Shown before the name, where the owner's guidelines allow a logo. */
  logo?: LogoKey;
};

export const builtWith: BandItem[] = [
  ...subprocessors,
  { name: "Facebook", purpose: "social", logo: "facebook" },
  { name: "Instagram", purpose: "social", logo: "instagram" },
  { name: "PostgreSQL", purpose: "database", logo: "postgresql" },
  { name: "Next.js", purpose: "web", logo: "nextjs" },
];

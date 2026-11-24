import { subprocessors } from "./subprocessors";

// The names in the landing page's moving band: the subprocessors, the
// platforms campaigns connect, and the open-source projects Writ runs on.
// Every entry must be true of Writ today or of a feature the page
// describes; add or remove names here, not in the component. Names, not
// logos (see subprocessors.ts).

export type BandItem = {
  /** The name as its owner writes it. Not translated. */
  name: string;
  /** Key under Landing.band.purposes. */
  purpose: "hosting" | "signIn" | "social" | "database" | "web";
};

export const builtWith: BandItem[] = [
  ...subprocessors,
  { name: "Facebook", purpose: "social" },
  { name: "Instagram", purpose: "social" },
  { name: "PostgreSQL", purpose: "database" },
  { name: "Next.js", purpose: "web" },
];

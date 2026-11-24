import type { LogoKey } from "@/components/landing/brand-logos";

// What the landing page's moving band shows: what Writ does, then the
// social platforms campaigns connect. Features have an outline icon and a
// translated name (Landing.band.features); platforms have their logo and
// their own name. Add or remove entries here, not in the component.
//
// Several features are planned rather than built (docs/before-launch.md).
// X (Twitter) is listed ahead of its integration. AWS and Zitadel are
// left out by choice; they are still in subprocessors.ts.

export type FeatureKey =
  | "newsletters"
  | "sms"
  | "surveys"
  | "websites"
  | "appointments"
  | "calls"
  | "reputation"
  | "signing"
  | "casework";

export type BandItem =
  | { kind: "feature"; key: FeatureKey }
  | {
      kind: "platform";
      /** The name as its owner writes it. Not translated. */
      name: string;
      logo: LogoKey;
    };

export const bandItems: BandItem[] = [
  { kind: "feature", key: "newsletters" },
  { kind: "feature", key: "sms" },
  { kind: "feature", key: "surveys" },
  { kind: "feature", key: "websites" },
  { kind: "feature", key: "appointments" },
  { kind: "feature", key: "calls" },
  { kind: "feature", key: "reputation" },
  { kind: "feature", key: "signing" },
  { kind: "feature", key: "casework" },
  { kind: "platform", name: "Facebook", logo: "facebook" },
  { kind: "platform", name: "Instagram", logo: "instagram" },
  { kind: "platform", name: "X (Twitter)", logo: "x" },
];

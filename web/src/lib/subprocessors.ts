// The companies that handle campaign data on Writ's behalf: its
// subprocessors. This is the one list; the landing page shows it, and a
// privacy page will list it in full.
//
// Only companies actually in use belong here. Add one when it starts
// handling data, and remove it when it stops; Zitadel leaves this list
// once it is self-hosted in Canada (docs/before-launch.md). Meta is not a
// subprocessor: campaigns connect their own Facebook and Instagram
// accounts.
//
// The landing page shows names, not logos. A company's logo may be used
// only from its official brand files and within its guidelines, and AWS
// does not allow its logo on third-party sites without permission apart
// from the "Powered by AWS" badge.

export type Subprocessor = {
  /** The company's own name for itself. Not translated. */
  name: string;
  /** Key under Landing.band.purposes for what it does for Writ. */
  purpose: "hosting" | "signIn";
};

export const subprocessors: Subprocessor[] = [
  { name: "Amazon Web Services", purpose: "hosting" },
  { name: "Zitadel", purpose: "signIn" },
];

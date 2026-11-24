import type { ReactNode } from "react";

// Product mock-ups that stand in for screenshots until the real dashboard
// exists. Every name, place and number in them is fictional. They are
// pictures: hidden from screen readers, which get a single description
// from the section that contains them.

export const people = {
  marie: { name: "Marie Gagnon", initials: "MG", tint: "bg-[#c7d9b0]" },
  owen: { name: "Owen Clarke", initials: "OC", tint: "bg-[#d8c6e8]" },
  priya: { name: "Priya Nair", initials: "PN", tint: "bg-[#f3d3b8]" },
  dev: { name: "Dev Sharma", initials: "DS", tint: "bg-[#bcd7ec]" },
  sam: { name: "Sam Taylor", initials: "ST", tint: "bg-[#e7e0a9]" },
  jordan: { name: "Jordan Lee", initials: "JL", tint: "bg-[#c9e3dc]" },
} as const;

export type Person = (typeof people)[keyof typeof people];

export function Avatar({ person, size = "h-6 w-6 text-[9px]" }: { person: Person; size?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink/70 ${person.tint} ${size}`}>
      {person.initials}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    // The reference's frame: a 6px corner and a three-layer shadow.
    <div
      className={`rounded-[6px] bg-white shadow-[0_-5.4px_9.7px_0_rgb(0_0_0/0.03),0_8.6px_19.3px_-6.4px_rgb(24_39_75/0.12),0_12.9px_45px_-4.3px_rgb(24_39_75/0.12)] ${className}`}
    >
      {children}
    </div>
  );
}

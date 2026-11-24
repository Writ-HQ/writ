import type { SVGProps } from "react";

// The Writ mark: a W drawn as if with a broad pen, heavy on the strokes
// that go down and hairline-thin on the strokes that come back up, the
// contrast of handwriting. Four bands that overlap where they meet, so it
// is one solid shape in a single colour (currentColor).
//
// Keep in step with src/app/icon.svg, the browser-tab icon.
export const markPaths = [
  // Down, heavy.
  "M1.4 4h4.2l4.3 16H5.7z",
  // Up to the middle point, thin.
  "M8.2 20h2L13 9h-2z",
  // Down, heavy.
  "M11 9h4.2L18 20h-4.2z",
  // Up, thin.
  "M16 20h2L22.6 4h-2z",
];

type WritMarkProps = SVGProps<SVGSVGElement> & {
  // A full stop after the W, sitting on its baseline. Used in the logo;
  // the footer tile and the browser-tab icon show the W alone.
  withDot?: boolean;
};

export function WritMark({ withDot = false, ...props }: WritMarkProps) {
  return (
    <svg
      viewBox={withDot ? "1 3 26.6 18" : "1 3 22 18"}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {markPaths.map((d) => (
        <path key={d} d={d} />
      ))}
      {withDot && <circle cx="25" cy="18.4" r="1.6" />}
    </svg>
  );
}

type LogoProps = {
  className?: string;
};

// The mark beside the wordmark, as one unit. Colour follows the text
// colour, so it works on light and dark backgrounds alike. Screen readers
// read "Writ" from the wordmark.
export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <WritMark withDot className="h-[20px] w-auto shrink-0" />
      <span className="font-serif text-[30px] leading-6 font-normal tracking-[-0.01em]">Writ</span>
    </span>
  );
}

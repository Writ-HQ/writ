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

export function WritMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="1 3 22 18" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      {markPaths.map((d) => (
        <path key={d} d={d} />
      ))}
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
      <WritMark className="h-[20px] w-auto shrink-0" />
      <span className="text-[24px] leading-6 font-medium tracking-[-0.03em]">Writ</span>
    </span>
  );
}

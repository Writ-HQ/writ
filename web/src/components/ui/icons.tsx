import type { SVGProps } from "react";

// Small line icons, drawn on a 24-unit grid with a 1.5 stroke. They are
// decorative: every one sits next to text that says the same thing.

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const ChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const Check = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const Plus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const Globe = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9Z" />
  </Icon>
);

export const MapleLeaf = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l1.6 3.4 2.2-1-.5 4 3-1.4-.9 2.6 2.6.9-4.2 3.6.6 1.9-4.4-.7V21h-1v-4.7l-4.4.7.6-1.9L3 11.5l2.6-.9-.9-2.6 3 1.4-.5-4 2.2 1Z" />
  </Icon>
);

/**
 * The maple leaf as on the flag: solid red, 11 points. Not a line icon,
 * so it carries its own colour and ignores currentColor.
 */
export const MapleLeafRed = (p: IconProps) => (
  <svg viewBox="155 152 890 890" aria-hidden="true" focusable="false" {...p}>
    <path
      fill="#E8112D"
      d="M600 152L667 278Q682 305 708 292L758 265L722 465Q718 495 740 502Q750 504 757 492L840 392L855 440Q862 460 884 453L986 432L957 545Q952 570 975 582L1005 602L812 762Q795 778 802 797L818 846L638 826Q616 824 616 852L622 1042L578 1042L584 852Q584 824 562 826L382 846L398 797Q405 778 388 762L195 602L225 582Q248 570 243 545L214 432L316 453Q338 460 345 440L360 392L443 492Q450 504 460 502Q482 495 478 465L442 265L492 292Q518 305 533 278Z"
    />
  </svg>
);

export const Layers = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Icon>
);

export const Users = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
    <path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2 .7 3.4 2.4 4 5.2" />
  </Icon>
);

export const Mail = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </Icon>
);

export const Chat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 0 1-11.8 7L4 20l1-4A8 8 0 1 1 20 12Z" />
  </Icon>
);

export const Shield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Icon>
);

export const Lock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const KeyRound = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="m11 12 8.5-8.5M16.5 6.5l2 2M14 9l1.5 1.5" />
  </Icon>
);

export const Ledger = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3h10l3 3v15H6z" />
    <path d="M9 9h7M9 13h7M9 17h4" />
  </Icon>
);

export const Building = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 21V8l8-5 8 5v13" />
    <path d="M9 21v-6h6v6M3 21h18" />
  </Icon>
);

export const ListIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </Icon>
);

export const Home = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11 12 4l8 7v9H4z" />
    <path d="M10 20v-5h4v5" />
  </Icon>
);

export const Inbox = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 13 6.5 5h11L20 13v6H4z" />
    <path d="M4 13h4.5l1 2h5l1-2H20" />
  </Icon>
);

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

// Solid icons, drawn to sit beside the red maple leaf: filled shapes with
// cut-outs (even-odd), in currentColor.

function Solid({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" clipRule="evenodd" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export const LockSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M7.5 10.5V7.75a4.5 4.5 0 0 1 9 0v2.75" fill="none" stroke="currentColor" strokeWidth="2.1" />
    <path d="M7 10h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3zM12 13.4a1.75 1.75 0 0 0-.85 3.28v2.12h1.7v-2.12A1.75 1.75 0 0 0 12 13.4z" />
  </Solid>
);

export const KeySolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M11.2 12.8L19.5 4.5M16.4 7.6l2.4 2.4M13.9 10.1l1.9 1.9" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    <path d="M8 10.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM8 14.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z" />
  </Solid>
);

export const LedgerSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M7 2h7.5L20 7.5V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14.5 2.9V6a1.5 1.5 0 0 0 1.5 1.5h3.1zM8.5 11h7v1.7h-7zM8.5 14.5h7v1.7h-7zM8.5 18h4.5v1.7H8.5z" />
    <path d="M14.5 2.9V6a1.5 1.5 0 0 0 1.5 1.5h3.1z" opacity=".4" />
  </Solid>
);

/** A globe: white meridian, equator and latitudes on a solid ball. */
export const GlobeSolid = (p: IconProps) => (
  <Solid {...p}>
    <circle cx="12" cy="12" r="10" />
    <path
      d="M12 2.4c-2.5 2.6-3.8 5.8-3.8 9.6s1.3 7 3.8 9.6c2.5-2.6 3.8-5.8 3.8-9.6S14.5 5 12 2.4zM2.2 12h19.6M3.6 7.6h16.8M3.6 16.4h16.8"
      fill="none"
      stroke="#fff"
      strokeWidth="1.4"
    />
  </Solid>
);

/** Three layers: a solid top sheet over two thick chevrons. */
export const LayersSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2.2l9.8 5.1L12 12.4 2.2 7.3z" strokeLinejoin="round" stroke="currentColor" strokeWidth="1.2" />
    <path d="M3.2 12.1l8.8 4.6 8.8-4.6M3.2 16.6l8.8 4.6 8.8-4.6" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
  </Solid>
);

/** Two people: a solid figure in front, a lighter one behind. */
export const UsersSolid = (p: IconProps) => (
  <Solid {...p}>
    <g opacity=".4">
      <circle cx="16.6" cy="7.2" r="3" />
      <path d="M16.9 13.5c3 .2 5.1 2.5 5.3 5.7a1 1 0 0 1-1 1.1h-3.7c-.3-2.6-1.4-5-3.2-6.4.8-.3 1.7-.4 2.6-.4z" />
    </g>
    <circle cx="9" cy="7.6" r="3.7" />
    <path d="M2.2 20.1C2.6 16.5 5.4 13.9 9 13.9s6.4 2.6 6.8 6.2a1 1 0 0 1-1 1.1H3.2a1 1 0 0 1-1-1.1z" />
  </Solid>
);

/** A list: solid dots and rounded bars. */
export const ListSolid = (p: IconProps) => (
  <Solid {...p}>
    <circle cx="4.2" cy="6" r="1.7" />
    <circle cx="4.2" cy="12" r="1.7" />
    <circle cx="4.2" cy="18" r="1.7" />
    <rect x="8.2" y="4.85" width="13.6" height="2.3" rx="1.15" />
    <rect x="8.2" y="10.85" width="13.6" height="2.3" rx="1.15" />
    <rect x="8.2" y="16.85" width="9.6" height="2.3" rx="1.15" />
  </Solid>
);

/** A solid envelope with its flap cut in white. */
export const MailSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M4.5 4.5h15A2.5 2.5 0 0 1 22 7v10a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17V7a2.5 2.5 0 0 1 2.5-2.5z" />
    <path d="M3.4 6.6L12 12.8l8.6-6.2" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </Solid>
);

/** A solid speech bubble with three white dots. */
export const ChatSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2.8c5.1 0 9.2 3.5 9.2 7.9s-4.1 7.9-9.2 7.9c-1 0-2-.1-2.9-.4l-4.6 2.4c-.5.2-1-.2-.8-.7l1.2-3.6c-1.3-1.5-2.1-3.4-2.1-5.6 0-4.4 4.1-7.9 9.2-7.9z" />
    <circle cx="8" cy="10.7" r="1.15" fill="#fff" />
    <circle cx="12" cy="10.7" r="1.15" fill="#fff" />
    <circle cx="16" cy="10.7" r="1.15" fill="#fff" />
  </Solid>
);

/** A solid shield with a white check. */
export const ShieldSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M11.3 2.3a2 2 0 0 1 1.4 0l6.6 2.5a1.2 1.2 0 0 1 .8 1.1v5.4c0 4.9-3.3 9-8.1 10.4-4.8-1.4-8.1-5.5-8.1-10.4V5.9a1.2 1.2 0 0 1 .8-1.1z" />
    <path d="M8.6 12.1l2.4 2.4 4.5-4.9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Solid>
);

/** A solid building with white windows and door. */
export const BuildingSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M5.5 2.5h8a1.5 1.5 0 0 1 1.5 1.5v4.5h3.5A1.5 1.5 0 0 1 20 10v11.5H4V4a1.5 1.5 0 0 1 1.5-1.5zM7.3 6h1.8v1.8H7.3zM10.4 6h1.8v1.8h-1.8zM7.3 9.6h1.8v1.8H7.3zM10.4 9.6h1.8v1.8h-1.8zM7.3 13.2h1.8V15H7.3zM10.4 13.2h1.8V15h-1.8zM16.2 11.6H18v1.8h-1.8zM16.2 15.2H18V17h-1.8zM8.6 21.5v-3.3h3.2v3.3z" />
  </Solid>
);

/** A solid circle with a white "i". */
export const InfoSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM10.9 10.4h2.2v7.1h-2.2zM12 6.3a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7z" />
  </Solid>
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

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

/** A solid message bubble with three white dots: texting. */
export const MessageSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M5 3h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-8.6l-4.4 3.4c-.5.4-1.2 0-1.2-.6V18H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" />
    <circle cx="8" cy="10.5" r="1.3" fill="#fff" />
    <circle cx="12" cy="10.5" r="1.3" fill="#fff" />
    <circle cx="16" cy="10.5" r="1.3" fill="#fff" />
  </Solid>
);

/** A solid clipboard with a white check: surveys. */
export const ClipboardSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M7 4h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    <rect x="8.5" y="2" width="7" height="4.2" rx="1.2" stroke="#fff" strokeWidth="1.4" />
    <path d="M8.6 13.6l2.3 2.3 4.6-5" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </Solid>
);

/** A solid browser window with white dots and a white bar: websites. */
export const BrowserSolid = (p: IconProps) => (
  <Solid {...p}>
    <rect x="2" y="3.5" width="20" height="17" rx="2.5" />
    <path d="M2.6 9h18.8M13.5 13h4.5M13.5 16.2h3" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="5.4" cy="6.3" r=".95" fill="#fff" />
    <circle cx="8.2" cy="6.3" r=".95" fill="#fff" />
    <rect x="5.5" y="12" width="5.5" height="5.2" rx=".8" fill="#fff" />
  </Solid>
);

/** A solid calendar page with white dates: appointments. */
export const CalendarSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M5 4.5h14A2.5 2.5 0 0 1 21.5 7v11.5A2.5 2.5 0 0 1 19 21H5a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 5 4.5z" />
    <rect x="6.6" y="2" width="2.4" height="5.2" rx="1.2" stroke="#fff" strokeWidth="1.2" />
    <rect x="15" y="2" width="2.4" height="5.2" rx="1.2" stroke="#fff" strokeWidth="1.2" />
    <path d="M2.8 9.6h18.4" fill="none" stroke="#fff" strokeWidth="1.4" />
    <g fill="#fff">
      <rect x="6.4" y="12.4" width="2.4" height="2.4" rx=".6" />
      <rect x="10.8" y="12.4" width="2.4" height="2.4" rx=".6" />
      <rect x="15.2" y="12.4" width="2.4" height="2.4" rx=".6" />
      <rect x="6.4" y="16.4" width="2.4" height="2.4" rx=".6" />
      <rect x="10.8" y="16.4" width="2.4" height="2.4" rx=".6" />
    </g>
  </Solid>
);

/** A solid telephone handset with two sound waves: calls. */
export const PhoneSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M6.4 2.7l2.2-.5a1.5 1.5 0 0 1 1.7.9l1.4 3.3a1.5 1.5 0 0 1-.4 1.7L9.6 9.6a12 12 0 0 0 4.8 4.8l1.5-1.7a1.5 1.5 0 0 1 1.7-.4l3.3 1.4a1.5 1.5 0 0 1 .9 1.7l-.5 2.2a2.6 2.6 0 0 1-2.5 2.1C10.6 19.7 4.3 13.4 4.3 5.2a2.6 2.6 0 0 1 2.1-2.5z" />
    <path d="M14.8 2.8a6.6 6.6 0 0 1 6.4 6.4M14.6 6.3a3 3 0 0 1 3.1 3.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </Solid>
);

/** A solid star with rounded points: reputation. */
export const StarSolid = (p: IconProps) => (
  <Solid {...p}>
    <path
      d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </Solid>
);

/** A solid page with a white signature and a pen across its corner: signing. */
export const SignatureSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M6.5 2h7.6L19 6.9V20a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
    <path d="M13.8 2.6V6a1.2 1.2 0 0 0 1.2 1.2h3.4z" fill="#fff" opacity=".45" />
    <path d="M7.4 15.8c1-1.6 2-1.6 2.6 0s1.6 1.6 2.6 0" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M21.2 11.4a1.6 1.6 0 0 1 0 2.3l-5.6 5.6-3 .8.8-3 5.6-5.7a1.6 1.6 0 0 1 2.2 0z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
  </Solid>
);

/** A solid briefcase with a white seam and clasp: casework. */
export const BriefcaseSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M8.5 7V5.2a1.7 1.7 0 0 1 1.7-1.7h3.6a1.7 1.7 0 0 1 1.7 1.7V7" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M4.5 7h15A2.5 2.5 0 0 1 22 9.5v9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-9A2.5 2.5 0 0 1 4.5 7z" />
    <path d="M2.6 12.6h18.8" fill="none" stroke="#fff" strokeWidth="1.4" />
    <rect x="10.4" y="11.1" width="3.2" height="3" rx=".7" stroke="#fff" strokeWidth="1.2" />
  </Solid>
);

export const Info = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.75v.01" />
  </Icon>
);

export const Newspaper = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 4.5h12v13a2 2 0 0 0 2 2h-12a2 2 0 0 1-2-2z" />
    <path d="M15.5 9h4v8.5a2 2 0 0 1-2 2" />
    <path d="M6.5 8h6v3.5h-6zM6.5 14.5h6M6.5 17h4" />
  </Icon>
);

export const Briefcase = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="7.5" width="17" height="12" rx="1.5" />
    <path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3.5 12.5h17" />
  </Icon>
);

export const Lifebuoy = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" />
  </Icon>
);

/** A contact book: a bound cover with tabs and a name card. */
export const ContactBook = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 3.5h12v17h-12z" />
    <path d="M4 7.5h3.5M4 12h3.5M4 16.5h3.5M10.5 7h4.5v4h-4.5z" />
  </Icon>
);

/** A solid lightning bolt: things that happen automatically. */
export const BoltSolid = (p: IconProps) => (
  <Solid {...p}>
    <path d="M13.6 2.2a.6.6 0 0 1 1 .55L13.2 9.5h5.6a.6.6 0 0 1 .47.98l-8.9 11.3a.6.6 0 0 1-1.05-.52L10.8 14.5H5.2a.6.6 0 0 1-.47-.97z" />
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

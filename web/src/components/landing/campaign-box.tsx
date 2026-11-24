// A cardboard box packed with a campaign's everyday tools: a sign-up
// clipboard, a newsletter envelope, a lawn sign, a phone with a message
// and a maple leaf pin. Drawn for Writ in SVG; decorative, with lines in
// place of words so it reads the same in both languages. Kraft brown and
// muted colours only, none of them a party colour at full strength.

const LEAF =
  "M600 152L667 278Q682 305 708 292L758 265L722 465Q718 495 740 502Q750 504 757 492L840 392L855 440Q862 460 884 453L986 432L957 545Q952 570 975 582L1005 602L812 762Q795 778 802 797L818 846L638 826Q616 824 616 852L622 1042L578 1042L584 852Q584 824 562 826L382 846L398 797Q405 778 388 762L195 602L225 582Q248 570 243 545L214 432L316 453Q338 460 345 440L360 392L443 492Q450 504 460 502Q482 495 478 465L442 265L492 292Q518 305 533 278Z";

export function CampaignBox({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="cb-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4a874" />
          <stop offset="1" stopColor="#b8864f" />
        </linearGradient>
        <linearGradient id="cb-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a87947" />
          <stop offset="1" stopColor="#8f6236" />
        </linearGradient>
        <linearGradient id="cb-sign" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9dcfeb" />
          <stop offset="1" stopColor="#6fa8d6" />
        </linearGradient>
        <filter id="cb-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Shadow on the ground. */}
      <ellipse cx="150" cy="284" rx="120" ry="9" fill="#000" opacity="0.08" />

      {/* The inside back wall and the open flaps behind. */}
      <path d="M38 168 L58 150 H242 L262 168 Z" fill="url(#cb-back)" />
      <path d="M58 150 L40 118 L150 126 L150 150 Z" fill="#c4955f" />
      <path d="M242 150 L262 116 L150 126 L150 150 Z" fill="#b98a55" />

      {/* Lawn sign on its stake. */}
      <g transform="rotate(-6 150 70)" filter="url(#cb-shadow)">
        <rect x="146" y="74" width="5" height="90" rx="1.5" fill="#8a8f95" />
        <rect x="104" y="26" width="92" height="56" rx="5" fill="url(#cb-sign)" />
        <rect x="116" y="40" width="54" height="7" rx="3.5" fill="#fff" />
        <rect x="116" y="53" width="68" height="5" rx="2.5" fill="#fff" opacity="0.75" />
        <rect x="116" y="63" width="40" height="5" rx="2.5" fill="#fff" opacity="0.75" />
      </g>

      {/* Sign-up clipboard. */}
      <g transform="rotate(-14 86 110)" filter="url(#cb-shadow)">
        <rect x="48" y="56" width="78" height="108" rx="6" fill="#9b6a3c" />
        <rect x="55" y="66" width="64" height="92" rx="2" fill="#fff" />
        <rect x="74" y="50" width="26" height="14" rx="4" fill="#b6bcc3" />
        <rect x="80" y="54" width="14" height="4" rx="2" fill="#8a9098" />
        {[78, 90, 102, 114, 126, 138].map((y, i) => (
          <g key={y}>
            <rect x="61" y={y} width="7" height="7" rx="1.5" fill="none" stroke="#9aa3ab" strokeWidth="1.2" />
            {i < 3 && <path d={`M62.5 ${y + 3.6} l1.8 1.8 l3.2 -3.6`} fill="none" stroke="#1f7a3d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
            <rect x="73" y={y + 2} width={i % 2 ? 30 : 38} height="3" rx="1.5" fill="#c9ced3" />
          </g>
        ))}
      </g>

      {/* Newsletter envelope with a stamp. */}
      <g transform="rotate(9 214 104)" filter="url(#cb-shadow)">
        <rect x="168" y="78" width="96" height="62" rx="4" fill="#fdfcf8" />
        <path d="M168 82 L216 114 L264 82" fill="none" stroke="#dcd8ce" strokeWidth="1.5" />
        <rect x="240" y="86" width="16" height="19" rx="1.5" fill="#cfe3d2" stroke="#fff" strokeWidth="1.5" strokeDasharray="2 1.2" />
        <rect x="180" y="118" width="40" height="4" rx="2" fill="#c9ced3" />
        <rect x="180" y="126" width="28" height="4" rx="2" fill="#c9ced3" />
      </g>

      {/* Phone with a message. */}
      <g transform="rotate(12 214 160)" filter="url(#cb-shadow)">
        <rect x="190" y="120" width="50" height="92" rx="9" fill="#1f2328" />
        <rect x="194" y="128" width="42" height="76" rx="5" fill="#f4f7fa" />
        <rect x="199" y="140" width="28" height="12" rx="6" fill="#ffffff" stroke="#e1e6eb" />
        <rect x="205" y="158" width="26" height="12" rx="6" fill="#2c6a8f" />
        <rect x="199" y="176" width="22" height="12" rx="6" fill="#ffffff" stroke="#e1e6eb" />
      </g>

      {/* The box front. */}
      <path d="M30 168 H270 L262 276 Q261 282 255 282 H45 Q39 282 38 276 Z" fill="url(#cb-front)" />
      <path d="M30 168 H270 L268 178 H32 Z" fill="#e0b788" />
      <rect x="132" y="168" width="36" height="114" fill="#c99a63" opacity="0.55" />
      <rect x="118" y="214" width="64" height="30" rx="3" fill="#f3e6d3" opacity="0.9" />
      <rect x="126" y="223" width="38" height="4" rx="2" fill="#b8864f" opacity="0.6" />
      <rect x="126" y="231" width="26" height="4" rx="2" fill="#b8864f" opacity="0.6" />

      {/* A maple leaf pin on the box. */}
      <g filter="url(#cb-shadow)">
        <circle cx="72" cy="214" r="21" fill="#fff" />
        <circle cx="72" cy="214" r="17" fill="#fbf3f1" />
        <svg x="59" y="201" width="26" height="26" viewBox="155 152 890 890">
          <path d={LEAF} fill="#E8112D" />
        </svg>
      </g>
    </svg>
  );
}

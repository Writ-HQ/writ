import { useLocale } from "next-intl";

import { Card } from "./mocks";

// The real dashboard (/app, fictional data) shown in the hero as a
// picture. It is framed rather than rendered in place, so the dashboard
// lays itself out for a desktop-sized window whatever the visitor's screen
// size, and the landing page needs no copy of it to keep in step.
//
// The frame is a 1280 x 828 window scaled to 820 x 530. It cannot be
// focused or clicked, and screen readers skip it: the hero's role="img"
// label describes it.
//
// If /app ever needs sign-in, this frame shows the sign-in page instead:
// point it at a public preview route then (docs/before-launch.md).

const WIDTH = 1280;
const HEIGHT = 828;
const SCALE = 820 / WIDTH;

export function DashboardPreview() {
  const locale = useLocale();
  return (
    <Card className="h-[530px] w-[820px] overflow-hidden">
      <iframe
        src={`/${locale}/app`}
        title=""
        tabIndex={-1}
        aria-hidden="true"
        inert
        scrolling="no"
        className="pointer-events-none origin-top-left border-0"
        style={{ width: WIDTH, height: HEIGHT, transform: `scale(${SCALE})` }}
      />
    </Card>
  );
}

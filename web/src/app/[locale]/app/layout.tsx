import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/shell";

// The signed-in app: its own shell, without the landing page's navbar and
// footer. Not connected to the API yet: everything shown is fictional.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}

import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Use these instead of next/link and next/navigation, so that links stay
// in the visitor's language.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

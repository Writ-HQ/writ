import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

// Adds the locale prefix to requests that lack one. (Next.js 16 calls this
// file proxy.ts; it was middleware.ts before.)
export default createMiddleware(routing);

export const config = {
  // Everything except Next.js internals and files with an extension, such
  // as favicon.ico.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};

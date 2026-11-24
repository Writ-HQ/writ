// Switches for parts of the site that are built but not ready to show.

/**
 * The log-in and sign-up pages are kept but hidden while Writ takes
 * waitlist signups: they are not connected to Zitadel yet. Hidden, they
 * answer 404 and nothing links to them. AUTH_PAGES_ENABLED=true brings
 * them back. Read on the server only.
 */
export const authPagesEnabled = process.env.AUTH_PAGES_ENABLED === "true";

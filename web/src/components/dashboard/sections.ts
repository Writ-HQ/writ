// The app's sections: their keys, paths and 16-unit icon paths. Shared by
// the sidebar (a client component) and the section pages (server).

/** The sections, in sidebar order. Settings sits at the bottom. */
export const sections = [
  { key: "overview", href: "/app", d: "M2 13.5h12M4 11V8M8 11V3.5M12 11V6" },
  { key: "casework", href: "/app/casework", d: "M2.5 5.5h11v8h-11zM6 5.5V3.5h4v2M2.5 9h11", count: 23 },
  { key: "contacts", href: "/app/contacts", d: "M6 7a2.25 2.25 0 1 0 0-4.5A2.25 2.25 0 0 0 6 7zM1.75 13.5c0-2.3 1.9-4 4.25-4s4.25 1.7 4.25 4M11 2.6a2.2 2.2 0 0 1 0 4.3M12.2 9.7c1.2.5 2 1.8 2 3.8" },
  { key: "lists", href: "/app/lists", d: "M6.5 4h7M6.5 8h7M6.5 12h7M3 4h.01M3 8h.01M3 12h.01" },
  { key: "email", href: "/app/email", d: "M2 4h12v8.5H2zM2 4l6 4.5L14 4" },
  { key: "inbox", href: "/app/inbox", d: "M2 9l1.8-5.5h8.4L14 9v4H2zM2 9h3.5l.8 1.5h3.4l.8-1.5H14" },
  { key: "volunteers", href: "/app/volunteers", d: "M8 13.5S2.5 10.4 2.5 6.6A2.9 2.9 0 0 1 8 5.2a2.9 2.9 0 0 1 5.5 1.4C13.5 10.4 8 13.5 8 13.5z" },
  {
    key: "settings",
    href: "/app/settings",
    vb: 24,
    d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  },
] as const;

export type SectionKey = (typeof sections)[number]["key"];

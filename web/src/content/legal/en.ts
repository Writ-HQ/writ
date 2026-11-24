import type { LegalDoc, LegalSlug } from "./types";

// The legal pages in English. fr.ts must have the same pages, sections and
// block shapes in the same order (checked by legal.test.ts).
//
// Drafts written from what Writ does today; to be reviewed by a lawyer
// before they are relied on (docs/before-launch.md).

export const en: Record<LegalSlug, LegalDoc> = {
  privacy: {
    title: "Privacy policy",
    description: "How Writ collects, uses, shares and protects personal information.",
    intro: [
      "This policy explains how {entity} (“Writ”, “we”, “us”) collects, uses, shares and protects personal information when you visit this website, join the waitlist or get in touch with us.",
      "We handle personal information in line with Canada’s Personal Information Protection and Electronic Documents Act (PIPEDA) and, where they apply to you, provincial privacy laws such as Quebec’s Act respecting the protection of personal information in the private sector and the Personal Information Protection Acts of British Columbia and Alberta. Our emails follow Canada’s Anti-Spam Legislation (CASL).",
    ],
    short: [
      "Today we collect only what you type into the waitlist form or send us, and the technical logs any website needs.",
      "We use it to tell you about Writ and its launch. We do not sell it, use it for advertising or train AI models on it.",
      "You can ask to see, correct or delete your information at any time by writing to {privacyEmail}.",
      "The Writ product is built to keep campaign data in Canada. Where this website and the waitlist are hosted is listed on the Subprocessors page.",
    ],
    sections: [
      {
        title: "What we collect",
        body: [
          {
            list: [
              "When you join the waitlist: your name, your email address, your organisation if you give one, the kind of organisation, your province or territory, the language you used, and the exact wording of the consent you gave, with the date and time.",
              "When you write to us: your message and the contact details you include.",
              "When you visit this website: the company that hosts it, {siteHost}, records technical information such as your IP address, your browser and the pages requested, to deliver the site and keep it secure.",
            ],
          },
          "We do not use analytics, advertising or social media tracking on this website. The Cookie policy lists the one cookie we use.",
        ],
      },
      {
        title: "How we use it",
        body: [
          {
            list: [
              "To send you news about the waitlist and Writ’s launch, if you agreed to it.",
              "To reply when you write to us.",
              "To plan the pilot, for example by seeing which kinds of organisations and which provinces are interested.",
              "To keep this website secure and working.",
              "To meet our legal obligations.",
            ],
          },
          "We do not use your information for any other purpose without asking you first, unless the law requires or allows it.",
        ],
      },
      {
        title: "Consent and email",
        body: [
          "We email you only if you ticked the consent box on the waitlist form. Every email says who it is from and has a link to unsubscribe. You can withdraw your consent at any time with that link or by writing to {privacyEmail}; we act on it within 10 business days.",
        ],
      },
      {
        title: "Who we share it with",
        body: [
          "We share personal information only with the companies that run this website and store the waitlist for us, and only so they can provide that service. They are listed on the Subprocessors page and are bound to protect the information and use it for nothing else.",
          "We may disclose information if the law requires it, for example under a court order. We never sell personal information or share it with political parties, campaigns or advertisers.",
        ],
      },
      {
        title: "Where it is stored",
        body: [
          "The waitlist, and messages sent through the contact form, are stored with {waitlistHost}. This website is hosted by {siteHost}. If a service provider stores or handles information outside Canada, it is subject to the laws of that country, and authorities there may be able to access it.",
          "The Writ product is built to keep campaign data in Canada, in Amazon Web Services’ Canada (Central) region.",
        ],
      },
      {
        title: "How long we keep it",
        body: [
          "We keep your waitlist details until you ask us to remove them, or for 24 months after Writ launches if you have not become a customer, whichever comes first. Messages you send us are kept for as long as we need them to help you. Hosting logs are kept for the period set by the host.",
        ],
      },
      {
        title: "How we protect it",
        body: [
          "Information travels over encrypted connections (HTTPS). Only the people at Writ who need it can see it, and access to the database is restricted. No system is perfectly secure; if a breach creates a real risk of significant harm to you, we will tell you and report it to the Office of the Privacy Commissioner of Canada, and to Quebec’s Commission d’accès à l’information where it applies.",
        ],
      },
      {
        title: "Your rights",
        body: [
          {
            list: [
              "See the personal information we hold about you.",
              "Have it corrected if it is wrong.",
              "Withdraw your consent, and have your information deleted.",
              "Where Quebec law applies, receive it in a structured, commonly used format.",
            ],
          },
          "Write to {privacyEmail}. We answer within 30 days. If you are not satisfied, you can complain to the Office of the Privacy Commissioner of Canada or to your provincial privacy commissioner.",
        ],
      },
      {
        title: "Children",
        body: ["This website and the waitlist are not meant for people under 16, and we do not knowingly collect their information."],
      },
      {
        title: "When a campaign uses Writ",
        body: [
          "When the Writ product launches, campaigns, riding associations, offices and advocacy groups will use it to manage their own supporters and contacts. They decide what information they collect and why; Writ handles it on their behalf under the Data processing addendum. If you are in one of their lists, please contact them first; we will help them answer you.",
        ],
      },
      {
        title: "Changes to this policy",
        body: ["If we change this policy, we will update the date at the top of this page. If a change is significant, we will tell people on the waitlist by email before it takes effect."],
      },
      {
        title: "Contact us",
        body: ["Our privacy officer is responsible for this policy. Write to {privacyEmail}, or by post to {entity}, {address}."],
      },
    ],
  },

  terms: {
    title: "Terms of service",
    description: "The terms for using the Writ website and joining the waitlist.",
    intro: [
      "These terms apply when you use this website or join the Writ waitlist. They are an agreement between you and {entity} (“Writ”, “we”, “us”). Separate terms will apply when you use the Writ product.",
      "By using this website you agree to these terms. If you do not agree, please do not use it.",
    ],
    sections: [
      {
        title: "Using this website",
        body: [
          "You may use this website to learn about Writ and to join the waitlist. Please do not try to disrupt it, gain access to parts of it that are not public, or collect information from it by automated means. The Acceptable use policy applies to you as well.",
        ],
      },
      {
        title: "The waitlist",
        body: [
          "Joining the waitlist is free. It does not guarantee a place in the pilot or access to Writ, and we may choose who to invite first. You can leave the waitlist at any time. We may close the waitlist or change how it works.",
        ],
      },
      {
        title: "What this website describes",
        body: [
          "This website describes Writ as it is being built. Some features it mentions are planned and not yet available, and plans can change. Pictures of the product use fictional names and figures. Nothing on this website is an offer to supply a particular feature by a particular date.",
        ],
      },
      {
        title: "Who owns what",
        body: [
          "The website, its text, design and the Writ name and logo belong to us. Facebook and Instagram are trademarks of Meta Platforms, Inc. and X is a trademark of X Corp.; Writ is not affiliated with or endorsed by them. Other names belong to their owners.",
        ],
      },
      {
        title: "No warranty",
        body: [
          "The website is provided as it is. We work to keep it accurate and available, but we do not promise that it will always be so.",
        ],
      },
      {
        title: "Limits on our liability",
        body: [
          "To the extent the law allows, we are not liable for indirect or consequential losses arising from your use of this website. Nothing in these terms limits rights you have under consumer protection laws that cannot be waived, including Quebec’s Consumer Protection Act where it applies.",
        ],
      },
      {
        title: "Links to other websites",
        body: ["Links to other websites are provided for convenience. We are not responsible for their content or their privacy practices."],
      },
      {
        title: "Governing law",
        body: [
          "These terms are governed by the laws of {province} and the federal laws of Canada that apply there. If you live in Quebec, Quebec law also applies to the extent it must.",
        ],
      },
      {
        title: "Changes to these terms",
        body: ["We may update these terms. We will change the date at the top of this page, and the new terms apply from then on."],
      },
      {
        title: "Contact us",
        body: ["Questions about these terms: {contactEmail}, or by post to {entity}, {address}."],
      },
    ],
  },

  dpa: {
    title: "Data processing addendum",
    description: "How Writ handles personal information on behalf of the campaigns and organisations that use it.",
    intro: [
      "This addendum forms part of the agreement between {entity} (“Writ”) and each customer that uses the Writ product (“you”). It applies when Writ handles personal information on your behalf: your supporters, contacts, volunteers, constituents and the messages you exchange with them.",
      "It takes effect when the Writ product launches. Until then, Writ does not hold any customer data.",
    ],
    short: [
      "Your data is yours. Writ uses it only to provide the service to you.",
      "It is stored in Canada and kept separate from every other customer’s data.",
      "We never sell it, never combine it with another customer’s data and never use it to train AI models.",
      "We tell you promptly about any breach, and delete your data when you leave.",
    ],
    sections: [
      {
        title: "Roles",
        body: [
          "You decide what personal information to collect and why, and you are responsible for having a lawful basis and any consent needed, including under CASL for messages you send. Writ is your service provider: it handles the information only on your instructions and to provide the service.",
        ],
      },
      {
        title: "Your instructions",
        body: [
          "Writ handles your data only as described in your agreement and this addendum, and as you direct through the product. If we believe an instruction breaks the law, we will tell you.",
        ],
      },
      {
        title: "Separation from other customers",
        body: [
          "Customers of Writ are often opponents. Every customer’s data is kept in its own space: the database enforces that one customer’s users can never read or change another’s records. We never combine, compare, share or sell data across customers, and never use voter or supporter data for any purpose of our own.",
        ],
      },
      {
        title: "Security",
        body: [
          {
            list: [
              "Data is stored in Amazon Web Services’ Canada (Central) region and encrypted at rest and in transit.",
              "Every account uses two-step verification.",
              "Sensitive actions, such as exports, imports, role changes, deletions and sends, are recorded in an audit log that cannot be edited.",
              "Only owners and admins can export data.",
              "Writ staff have access only where they need it to run or support the service.",
            ],
          },
        ],
      },
      {
        title: "Confidentiality",
        body: ["Everyone at Writ who can access your data is bound to keep it confidential."],
      },
      {
        title: "Subprocessors",
        body: [
          "Writ uses the subprocessors listed on the Subprocessors page. Each is bound by written terms that protect your data at least as well as this addendum. We will give you 30 days’ notice before adding or replacing one, and you may object; if we cannot resolve your objection, you may end the agreement.",
        ],
      },
      {
        title: "Where data is stored",
        body: ["Your data is stored and processed in Canada. We will not move it outside Canada without telling you in advance."],
      },
      {
        title: "Helping you meet your obligations",
        body: [
          "We help you answer requests from people to see, correct or delete their information, and to respond to privacy regulators. The product lets you record consent and opt-outs for each person and channel.",
        ],
      },
      {
        title: "Breaches",
        body: [
          "If we confirm a breach affecting your data, we will tell you without undue delay and within 72 hours, with what we know, and help you notify the people affected and the regulators where required.",
        ],
      },
      {
        title: "Ending the service",
        body: [
          "When your agreement ends, you can export your data for 30 days. We then delete it, including from backups as they expire, within 90 days, unless the law requires us to keep it.",
        ],
      },
      {
        title: "Audits",
        body: ["On request, we provide the information you reasonably need to confirm that we meet this addendum."],
      },
      {
        title: "Contact",
        body: ["Questions about this addendum: {privacyEmail}."],
      },
    ],
  },

  "acceptable-use": {
    title: "Acceptable use policy",
    description: "What Writ may and may not be used for.",
    intro: [
      "Writ is for organising people around a cause, a campaign or a community. This policy sets out what it may not be used for. It applies to everyone who uses Writ or this website, alongside the Terms of service.",
    ],
    sections: [
      {
        title: "Follow the law",
        body: [
          "Use Writ only in ways that comply with the laws that apply to you, including election laws such as the Canada Elections Act and provincial election acts, Canada’s Anti-Spam Legislation, privacy laws, and the CRTC’s rules for calls and texts, including registration with the Voter Contact Registry where it applies.",
        ],
      },
      {
        title: "Contact people properly",
        body: [
          {
            list: [
              "Message only people who have agreed to hear from you, or whom the law allows you to contact.",
              "Honour every unsubscribe and opt-out promptly.",
              "Do not upload lists you bought, scraped or were not entitled to use.",
            ],
          },
        ],
      },
      {
        title: "Be honest",
        body: [
          {
            list: [
              "Do not impersonate a candidate, official, election agency or anyone else.",
              "Do not spread false information about how, when or where to vote.",
              "Say clearly when an image, audio or video has been generated or altered.",
            ],
          },
        ],
      },
      {
        title: "Respect people",
        body: [
          "Do not use Writ to harass, threaten or intimidate anyone, to promote hatred against an identifiable group, or to share anyone’s personal information without the right to do so.",
        ],
      },
      {
        title: "Keep Writ secure",
        body: [
          "Do not share accounts, try to get around two-step verification or access controls, probe or test Writ’s security without our written permission, or try to see another organisation’s data.",
        ],
      },
      {
        title: "Connected platforms",
        body: ["When you connect Facebook, Instagram or other services, their rules apply too."],
      },
      {
        title: "What we do about misuse",
        body: [
          "If we believe Writ is being misused, we may remove content, pause sending, or suspend an account. We will tell you why unless the law prevents us or doing so would put people at risk.",
        ],
      },
      {
        title: "Report misuse",
        body: ["Write to {contactEmail}. We look at every report."],
      },
    ],
  },

  cookies: {
    title: "Cookie policy",
    description: "The cookie this website uses, and what it does not use.",
    intro: [
      "This website uses one cookie, to remember the language you chose. It does not use analytics, advertising or social media cookies, and it does not track you across other websites.",
    ],
    sections: [
      {
        title: "The cookie we use",
        body: [
          {
            table: {
              head: ["Name", "What it does", "Kind", "How long"],
              rows: [["NEXT_LOCALE", "Remembers whether you are reading in English or French.", "Needed for the site to work; set by this website", "Until you close your browser"]],
            },
          },
        ],
      },
      {
        title: "Storage in your browser",
        body: [
          "When the Writ product is available, it may save display preferences, such as a collapsed sidebar, in your browser’s storage. They stay on your device and are never sent to us.",
        ],
      },
      {
        title: "What we do not use",
        body: ["No analytics, no advertising or retargeting, no social media pixels and no third-party tracking."],
      },
      {
        title: "Managing cookies",
        body: [
          "You can block or delete cookies in your browser’s settings. If you block the language cookie, the website still works; it may simply ask your browser for your language again.",
        ],
      },
      {
        title: "Changes and contact",
        body: ["If we start using another cookie, we will list it here first. Questions: {privacyEmail}."],
      },
    ],
  },

  subprocessors: {
    title: "Subprocessors",
    description: "The companies that handle personal information on Writ’s behalf.",
    intro: [
      "These are the companies that store or handle personal information for Writ. Each may use it only to provide its service to us, under written terms.",
    ],
    sections: [
      {
        title: "This website and the waitlist",
        body: [
          {
            table: {
              head: ["Company and location", "What it does for Writ"],
              rows: [
                ["{siteHost}", "Hosts this website."],
                ["{waitlistHost}", "Stores waitlist signups."],
              ],
            },
          },
        ],
      },
      {
        title: "The Writ product, from launch",
        body: [
          {
            table: {
              head: ["Company", "What it does for Writ", "Where"],
              rows: [
                ["Amazon Web Services", "Hosting, database, file storage and email delivery.", "Canada (Central), Montréal"],
                ["Zitadel", "Team sign-in and two-step verification.", "To be run in Canada before launch"],
              ],
            },
          },
        ],
      },
      {
        title: "Not subprocessors",
        body: [
          "Facebook, Instagram and X are not Writ’s subprocessors. Campaigns connect their own accounts, and messages and posts pass through those platforms under their own terms.",
        ],
      },
      {
        title: "Changes",
        body: ["We update this page before a new subprocessor starts, and give customers 30 days’ notice. Questions: {privacyEmail}."],
      },
    ],
  },
};

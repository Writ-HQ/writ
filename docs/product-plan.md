# Product plan: GoHighLevel's features, made simple

Status: proposal, 2026-11-24. Not approved; nothing here is built yet
unless it says so.

## The idea

Writ should do most of what GoHighLevel does, for advocacy groups,
campaigns and constituency offices in Canada. The people using it are
often older and not technical, so it needs to be far simpler than
GoHighLevel. They should see results ("You're the top result on Google"),
not the machinery behind them (SEO settings).

GoHighLevel's own pages (home and pricing, read 2026-11-24) list about 24
feature areas, four plans from $97 to $497 a month, usage fees for texts,
calls, email and AI, and "snapshots": ready-made setups for an industry.

## How Writ stays simple

1. **Results, not machinery.** Show what happened and whether it is good:
   "412 people opened your newsletter, more than last time", "You're #2
   when people search 'Riverside MP office'". Never show open rates,
   pipelines, tags or SEO settings to people who did not ask.
2. **One home screen: Today.** At most five plain tasks, each one click
   away: "Reply to 4 messages", "2 people left a review: say thank you",
   "Your newsletter is ready to send".
3. **Switches, not builders.** GoHighLevel's workflow builder becomes a
   short list of things Writ can do automatically, each with an on/off
   switch and a sentence saying what it does:
   - birthday messages
   - appointment reminders
   - texting back after a missed call
   - asking for a review after a resolved case
   - thanking new supporters
4. **Plain words.** People (not contacts or CRM), Messages (not
   conversations), Mailings, Texts, Calendar, Reviews, Your website, Cases.
5. **Easy to see and use.**
   - Text at least 17–18px, strong contrast and large buttons.
   - No menus that open only on hover.
   - One main button per screen.
   - Undo instead of "Are you sure?".
   - Seven or fewer sections in the sidebar.
6. **Set up for them.** Like GoHighLevel's snapshots, each new office
   starts with templates, forms and switches already filled in for its
   kind of organisation. Writ's team does the first setup.
7. **A person to call.** A "Call us" button on every screen. An assistant
   ("Ask Writ") comes later.

## GoHighLevel feature by feature

Phases are explained below. "Skip" means not planned.

| GoHighLevel | In Writ | Phase | Notes |
|---|---|---|---|
| CRM, pipelines, smart lists, lead scoring | **People** (with households) and **Cases** (casework instead of sales pipelines) | 1 | Already on the roadmap (weeks 4–7). No lead scoring. |
| Unified conversations: SMS, Messenger, Instagram, WhatsApp, live chat | **Messages**: one inbox | 1 (Facebook, Instagram), 2 (SMS, website chat), 3 (WhatsApp) | Facebook and Instagram are already roadmapped (weeks 11–15). Meta allows replies only within 24 hours of the person's last message. |
| Email broadcasts, newsletter automation | **Mailings** | 1 | Weeks 8–10, through Amazon SES. Consent and unsubscribe under CASL. |
| SMS broadcasts, 2-way SMS | **Texts** | 2 | Needs a provider with Canadian numbers, and data kept in Canada must be checked. Consent under CASL. |
| Calendars, booking, reminders | **Appointments**: office hours and meetings | 2 | Reminders by email and text. |
| Forms, surveys, quizzes | **Forms and surveys** | 1 (signup forms), 2 (surveys) | Signup forms are on the roadmap (weeks 8–10). |
| Websites, funnels, landing pages | **Your website**: pick a template and fill in the blanks | 1 (signup pages), 2 (one-page website) | No funnels, upsells or webinars. |
| Workflows and automations | **Automatic follow-ups**: switches (see above) | 2 | Built on the roadmap's later automation work (Temporal). |
| Reputation management, review requests, AI review replies | **Reviews**: ask, read, say thank you | 2 | Google Business Profile access needs Google's approval. For politicians, "reputation" also means what people say, which comes under trends in phase 4. |
| Social planner | **Scheduled posts** with approval | 1 | Weeks 11–15. |
| Phone, call tracking, missed-call text-back | **Phone**: who called, call back, text after a missed call | 3 | Phone provider and data kept in Canada to be checked. |
| Estimates, proposals, document signing | **Documents to sign** | 3 | Probably through a signing service; check where it stores data. |
| SEO (add-on) | **"Are people finding you?"**: a card showing where you rank | 3 | Use Google Search Console for the office's own website: it is allowed and free, and gives the average position for each search. No scraping. |
| Reporting dashboards | **How you're doing**: plain cards on the home screen | 1 | The dashboard mock-up already starts this. |
| Payments, invoicing, text-to-pay | **Donations** and tax receipts | 3 | Already on the later roadmap. Elections Canada and provincial rules apply. No invoicing. |
| Mobile app | **Mobile app** | Later | The roadmap's mobile canvassing app. |
| Conversation AI, Voice AI, Content AI | **Suggested replies and drafts** | 4 | Suggestions only. A person always sends. |
| Ad manager, affiliates, prospecting, courses, communities, white-label, SaaS mode | Skip | — | They add confusion and don't fit the customers. |

## Phases

1. **Pilot.** The current 15-week roadmap, plus a simple Today screen and
   plain reports:
   - People and households, Cases
   - Mailings, signup forms
   - Facebook and Instagram messages, scheduled posts
2. **Everyday office:**
   - Appointments, Texts, website chat
   - Surveys, a one-page website
   - Automatic follow-ups, Reviews
3. **Wider reach:**
   - Phone and call tracking, documents to sign
   - "Are people finding you?", donations
4. **Understanding people:** sentiment and trends, and suggested replies.

## Sentiment and trend tracking (phase 4)

- **What it does:** sorts incoming messages, comments and case notes by
  topic (housing, transit and so on) and by tone (happy, worried, angry).
  It then shows trends in plain words: "Housing came up 40% more this week,
  mostly worried."
- **Sources:** the office's own inbox, cases and Facebook and Instagram
  comments, which Meta's API allows for a page the office owns. X's API is
  expensive and limited, so it is a later decision.
- **Privacy:** political opinions are sensitive personal information
  under Canadian privacy law. Trends are shown in aggregate only: no
  scoring or labelling of individual people, and nothing sold or shared.
  Analysis runs in Canada (to check: which AI models are available in
  ca-central-1).
- **Where it fits:** it needs the inbox, cases and mailings first, which
  is why it comes after them.

## What this changes in the repo

Nothing yet. If approved:
- **CLAUDE.md:** the roadmap and the "not yet in use" list.
- **Landing page:** the band already names several phase 2–3 features
  (docs/before-launch.md).
- **Dashboard:** a design pass for older users (type size, contrast,
  plain words, the Today screen).

## Decisions needed

1. **Who exactly:** advocacy groups, election campaigns, constituency
   offices, or all three? The data rules differ: a campaign's supporter
   lists and an MP's constituent casework must be kept apart.
2. **What goes into the pilot:** is phase 1 right, or do appointments or
   texts need to come sooner?
3. **Providers for texts and calls,** given the rule that data stays in
   Canada.
4. **Pricing model:** flat monthly like GoHighLevel, with texts and calls
   charged by use?

---
title: features
status: draft, waits in review
---

# what the service does

the feature list, written against the problems in problems.md. every
feature is a role in a small acquisition, kept separate so none can
exceed its brief. what exists as code today is on the donna and
domainhacks branches; the rest is spec'd in donna-spec.md.

- **the pre-check.** registration data (rdap, whois fallback), dns
  classification (parking nameservers, forwarding vs real mailbox
  providers), website classification (parked, for sale with listed
  price, default page, live, with activity signals), wayback history,
  github and public mentions, email checks that never touch abuse@ or
  postmaster@. output: a usage status, who likely holds it, contact
  routes counted (never addresses before payment), an estimated chance
  of success, and a suggested price band. about $0.01 to run, so it's
  free (donna-spec.md §5).
- **the confidence gates.** every candidate owner match carries a
  confidence score. below 0.7, the first message asks "are you the
  owner?" instead of offering; below 0.4, the route isn't used at all.
  accuracy over reach, in code (src/core/contact-routes.ts on the
  donna branch).
- **the hack finder.** the word split against every delegated ending,
  ranked by fewer dots, registrability and price. each result carries
  the tld type and restriction, the tld risk radar (read from
  thetldradar, citations kept exactly as published), the google
  generic-vs-geotargeted search note, and donna's own hack fit score:
  naturalness of the split, the dotless twin's owner and flags,
  file-extension clashes like .zip and .mov, autolinking in chat apps,
  email fit, and the say-it-aloud test (donna-spec.md §12,
  src/core/hack-fit.ts on the domainhacks branch).
- **the web3 toggle.** off by default, labeled when on: ens and
  unstoppable names shown with chain, renewal model and collision
  risk, with the plain warning that they don't open in a normal
  browser (donna-spec.md §12.7).
- **the deployment.** $4.49, one campaign. contact routes in priority
  order: verified owner email, github match, site email, catch-all,
  checked common addresses, privacy forwarding, registrar contact
  form, site form. at most 3 routes, 2 messages per route, 6 messages
  total (donna-spec.md §6).
- **the letter.** plain text, 80 words or fewer, no links, images or
  tracking pixels in the first message. ai disclosure, the concrete
  offer, the direct-payment fact, a one-word opt-out, a real postal
  address (donna-spec.md §8.1).
- **the negotiator.** opening offer (default ~60% of max), at most
  two counters in shrinking steps (25% then 15% of the remaining
  gap), a final offer at your unrevealed ceiling, then a handoff.
  replies classified into intents: accept, counter, question,
  not-owner, decline, opt-out, hostile, auto-reply, bounce, unclear
  (donna-spec.md §8.2, 8.3; src/core/negotiation.ts on the donna
  branch).
- **the handoff.** when a reply goes outside the script (ask above
  your ceiling, legal or tax questions, a request for a human), the
  buyer gets the full thread, a summary, a suggested reply, and
  one-click options: raise max, send final offer, close
  (donna-spec.md §9).
- **the closer.** written terms to both sides, transfer before payment
  (registrar push or auth code), step-by-step guides per registrar,
  60-day transfer-lock detection, rdap monitoring until the registrant
  changes. $3.99 charged only on confirmed completion
  (donna-spec.md §10, §14).
- **the timeline.** every state change, timestamped, shown to the
  buyer as an activity feed. the deploy fee pays for the attempt, and
  the log is the receipt.
- **the expiry watch.** daily rdap checks as expiry approaches, an
  alert on pendingdelete, pointers to backorder services
  (donna-spec.md §11).
- **the suppression list.** permanent, global, shared across all
  buyers. one "no" anywhere ends the campaign and the address forever
  (donna-spec.md §2, §13).

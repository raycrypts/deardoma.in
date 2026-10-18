---
title: features
status: draft, waits in review
---

# what donna does

the feature list, written against the problems in problems.md. donna
is a pipeline, not a one-shot answer: the buyer dashboard shows each
step as it happens. what exists as code today is on the donna branch;
the rest is spec'd in donna-spec.md. pricing is flat-fee framing:
a fee per attempt, a fee on completion, no commission, exact rates
set at launch.

- **the pre-check.** registration data (rdap, whois fallback), dns
  classification (parking nameservers; mail providers named:
  google workspace, microsoft 365, zoho, fastmail, proton read as in
  use, improvmx, forwardemail, cloudflare email routing and registrar
  forwarding read as forwarding), website classification (parked, for sale with listed
  price, default page, live, with activity signals), wayback
  history, github and public mentions, email checks that never touch
  abuse@ or postmaster@. output: a usage status, who likely holds it,
  contact routes counted (never addresses before payment), an
  estimated chance of success, and a suggested price band. about
  $0.01 to run, so it's free (donna-spec.md §5).
- **the confidence gates.** every candidate owner match carries a
  confidence score. below 0.7, the first message asks "are you the
  owner?" instead of offering; below 0.4, the route isn't used at
  all. accuracy over reach, in code (src/core/contact-routes.ts on
  the donna branch).
- **the pipeline view.** the buyer dashboard shows the same steps the
  pre-check runs, then live campaign state: contacted, awaiting
  reply, negotiating, or done. the timeline is a literal event log:
  every step is a queued job that writes a timestamped event row,
  and if nothing comes back, you see exactly what was tried and when
  (root README.md, src/workers/handlers.ts on the donna branch).
- **the lifecycle state machine.** the campaign is a 17-state
  lifecycle, created, prechecked, deployed, contacting, awaiting
  reply, followed up, negotiating, agreed, payment pending, transfer
  pending, completed, plus declined, handed off, opted out, closed.
  pure transitions that throw on an illegal move; any state can
  become opted_out, none can leave it (src/core/state-machine.ts).
- **the timeouts.** configurable, in code: follow-up after 4 days
  with no reply, no_response at 7 days after the follow-up, staleness
  alerts on payment_pending and transfer_pending at 7 days, to both
  sides (src/core/state-machine.ts TIMEOUTS, spec §4).
- **the deployment.** a flat fee, one campaign. contact routes in
  priority order: verified owner email, github match, site email,
  catch-all, checked common addresses, privacy forwarding, registrar
  contact form, site form. at most 3 routes, 2 messages per route,
  6 messages total (donna-spec.md §6).
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
- **the precursor check intake.** campaigns don't only start from
  the dashboard: dom's taken-hack view runs the free pre-check
  signals and hands donna a ready-made campaign context (root
  README.md).
- **the closer.** written terms to both sides, transfer before payment
  (registrar push or auth code), step-by-step guides per registrar,
  60-day transfer-lock detection, rdap monitoring until the registrant
  changes. the completion fee charged only on confirmed completion
  (donna-spec.md §10, §14).
- **the expiry watch.** daily rdap checks as expiry approaches, an
  alert on pendingdelete, pointers to backorder services
  (donna-spec.md §11). domain purgatory awareness: rdap status
  classified into stages (auto-renew grace / redemption / pending
  delete), taken-but-expiring treated as a watch, not a dead end; the
  free tier shows the rdap-visible stage, deeper history (whoisfreaks/
  whoisxml/securitytrails) gated to the paid pre-check (domainhacks
  branch SCOPE.md, research/domain-purgatory.md).
- **the reserved-mission guard.** .gov, .mil, .edu, .int and .arpa are
  never registrable by the public, so the pre-check and campaign
  intake refuse them outright with the reason (src/core/reserved.ts
  on the donna branch).
- **deliverability protection.** cold outreach never comes from the
  brand domain; sending reputation is protected as deliberately as
  the outreach is polite (root README.md).
- **the suppression list.** permanent, global, shared across all
  buyers. one "no" anywhere ends the campaign and the address forever
  (donna-spec.md §2, §13).

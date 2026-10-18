---
title: features
status: draft, waits in review
---

# what dom does

the feature list, written against the problems in problems.md. dom is
the domainhack assistant: give it a word or phrase, it finds every
way to split that word across a domain name and tells you which ones
you can actually own. what exists as code today is on the domainhacks
branch; the rest is spec'd and in the research datasets. the finder
is free, and it is the top of the funnel: available names get a
registrar affiliate link, taken ones lead into donna's paid outreach
(domainhacks branch README.md).

- **the split.** the word split against every delegated ending
  (data.iana.org, 1,437 endings), ranked by fewer dots, registrability
  and price (src/core/candidates.ts on the domainhacks branch).
- **registrability first.** an ending that reads perfectly but can't
  be registered is never suggested. never-opened (.sj, .bv),
  third-level-only (.il), closed or sanctioned (.er, .ir), brand-only
  gtlds: surfaced as excluded matches with the reason, not silently
  hidden (root README.md).
- **registration barriers per registry.** local presence, residency,
  verification requirements, business-presence exceptions (.ie,
  .uk): each candidate shows its barrier and route, direct,
  intermediary/trustee with fee, or business-presence
  (research/cctld-intermediaries.json, 142 endings, per-registry
  citations; corrections in research/cctld-intermediaries-
  corrections.json).
- **second-level rules.** registries that only sell under a second
  level (.il, .np, .za, and others) flagged from research/
  cctld-second-level.json, 33 endings.
- **real prices.** cheapest observed registration and renewal across
  registrar comparisons, so a hack's total cost of ownership is
  visible before you buy (root README.md).
- **hack fit.** whether the split reads naturally, whether it
  survives being spoken aloud, whether it collides with a file
  extension (.zip, .mov, .sh and others), how it behaves in links
  and email addresses (src/core/hack-fit.ts on the domainhacks
  branch; full scoring per donna-spec.md §12.5.1).
- **search and platform impact.** google's generic treatment list
  annotated per candidate (research/google-generic-cctlds.json,
  from google's official doc).
- **the risk radar.** sovereignty (.io, .ly), sanctions (.ir, .ru),
  free-registry history (.tk), discontinued endings (.su): a
  per-tld risk view from a cited, dated dataset, toggleable
  alongside the main results (research/platform-flags.json).
- **compare mode.** shortlisted candidates side by side: price,
  barrier, fit, risk at a glance.
- **risk radar mode.** browse endings by risk profile.
- **the toggles.** off by default, labeled when on: web3 domain
  hacks (ens, unstoppable; chain, renewal model, collision risk,
  and the plain warning that they don't open in a normal browser)
  and punycode domain hacks (xn--, rendered forms vary by browser
  and client) (root README.md).
- **the handoff.** a split that's taken leads into donna's
  ask-the-owner service, right there in the results (domainhacks
  branch README.md).

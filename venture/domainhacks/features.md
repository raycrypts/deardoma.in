---
title: features
status: draft, waits in review
---

# what dom does

the feature list, written against the problems in problems.md. dom is
the domainhack assistant: give it a word or phrase, it finds every
way to split that word across a domain name and tells you which ones
you can actually own. dom never talks about pricing; its job is fit
and ownability. what exists as code today is on the domainhacks
branch; the rest is spec'd and in the research datasets. the finder
is free, and it is the top of the funnel: available names get a
registrar affiliate link, taken ones lead into donna's paid outreach
(domainhacks branch README.md).

- **the split.** the word split against every delegated ending
  (data.iana.org, 1,437 endings, verified against the iana root zone
  with a drift test), ranked by registrability, fit and risk
  (src/core/candidates.ts, scripts/verify-root-zone.mjs on the
  domainhacks branch).
- **registrability first.** an ending that reads perfectly but can't
  be registered is never suggested. never-opened (.sj, .bv),
  third-level-only (.il, .th, .za), reserved-mission (.gov, .mil,
  .edu, .int: not for the public, never appear as matches), closed or
  sanctioned (.er, .ir), brand-only gtlds: surfaced as excluded matches
  with the reason, not silently hidden (root README.md,
  src/core/candidates.ts excludedHacks).
- **registration barriers per registry.** local presence, residency,
  verification requirements, business-presence exceptions (.ie,
  .uk): each candidate shows its barrier and route, direct,
  intermediary/trustee with fee, or business-presence
  (research/cctld-intermediaries.json, 142 endings, per-registry
  citations; corrections in research/cctld-intermediaries-
  corrections.json; research/cctld-second-level.json, 33 endings).
- **the registry premium flag.** some registries mark specific names
  as premium at the issuing-body level. dom shows the badge, never a
  price: no registrar price comparisons in any dom surface, a product
  decision enforced in code (domainhacks branch SCOPE.md).
- **hack fit.** whether the split reads naturally, whether it
  survives being spoken aloud, whether it collides with a file
  extension, how it behaves in links and email addresses
  (src/core/hack-fit.ts on the domainhacks branch).
- **the say-it-aloud taxonomy.** deterministic boundary classes, best
  to worst: natural (read.it), digraph split (lig.ht), doubled
  consonant (runn.ing), vowel seam (rad.io), and blend-required
  (runni.ng), where the ending starts with a cluster english cannot
  start a syllable with and the listener must blend to reconstruct
  the word. rank penalties, with explanations, never exclusion
  (src/core/hack-fit.ts).
- **hack axes.** linguistic hacks, where the ending completes the word
  (tra.sh, rad.io), and command hacks, where the label is a known cli
  tool and the script-suffix reading is the point (brew.sh); a command
  hack waives the file-extension clash penalty, though the flag still
  surfaces for transparency (curated vocabulary in research/
  command-tools.json, emitted to src/core/command-tools.generated.ts).
- **multi-dot chains.** fi.ni.sh, where every segment is a real root
  ending, classified as a chain, not a subdomain, with the
  registrable base named (src/core/candidates.ts).
- **file-extension clash.** a researched set, not a hand-picked list:
  freedesktop shared-mime-info + python mimetypes intersected with
  the iana root, severity tiers curated (high: widely parsed types
  like .zip, .mov; medium: dev/technical). a penalty flag, never an
  exclusion (research/file-ext-clash.json, migration 003).
- **search and platform impact.** google's generic treatment list
  annotated per candidate (research/google-generic-cctlds.json, from
  google's official doc), hsts-preloaded gtlds noted.
- **the risk radar.** sovereignty (.io, .ly), sanctions (.ir, .ru),
  free-registry history (.tk), discontinued endings (.su): a per-tld
  risk view from a cited, dated dataset, toggleable alongside the
  main results (research/platform-flags.json).
- **compare mode.** shortlisted candidates side by side: barrier,
  fit, risk at a glance.
- **risk radar mode.** browse endings by risk profile.
- **the toggles.** off by default, labeled when on: web3 domain hacks
  (ens, unstoppable; chain, renewal model, collision risk, and the
  plain warning that they don't open in a normal browser), punycode
  domain hacks (xn--, rendered forms vary by browser and client),
  and taken domain hacks: available ones show by default, taken ones
  stay hidden until toggled, because a taken hack isn't a dead end,
  it's a handoff (root README.md).
- **the precursor check.** dom feeds donna: the free pre-check
  signals (rdap, dns, website, wayback) run inside dom's taken-hack
  view and hand a ready-made campaign context to donna
  (domainhacks branch SCOPE.md).
- **domain purgatory awareness.** the product's own term for the
  domain lifecycle: rdap status classified into stages (auto-renew
  grace / redemption / pending delete). taken-but-expiring is a watch,
  not a dead end; the free tier shows the rdap-visible stage, deeper
  history is gated to donna's paid pre-check (research/
  domain-purgatory.md, domainhacks branch SCOPE.md).

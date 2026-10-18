# the delegated-but-unavailable class: ccTLDs that exist and can't be bought

the concept the owner calls "the .ti problem": a tld can be in the root, be a normal ccTLD by every registry definition, and still be wildly unavailable to the general public. the finder must never suggest such an ending, and (product decision, implemented) must surface it as an excluded match with the reason.

four distinct conditions produce the class, and they deserve different labels:

## 1. never opened
the registry has never offered public registrations. verified set from the per-registry pass (2026-10-18):
- **.sj** (svalbard and jan mayen) and **.bv** (bouvet island): operated by norid, which explicitly states the .no domain is considered sufficient for institutions connected to those territories; no eligibility process exists. source: namebeta registry research pages (namebeta.com/tlds/sj, /bv), quoting norid policy.
- **.er** (eritrea): no public registration; the country's registry has never opened registrations in the modern era.

## 2. third-level only
the country registers names, but only under second-level namespaces (co.xx, or.xx, com.xx); the root ending is not purchasable, so a hack split against the root is impossible.
- **.il** (israel): registrants buy `co.il`, `org.il` etc.; there are no root `.il` registrations. this is why `examp.le`-style splits are fake for .il. source: research/cctld-second-level.json (verified), enforced by the `second_level_registrable` flag and a hard test.

note the subtlety: third-level-only endings can still *look* like hacks via subdomain tricks (`de.licio.us` uses a real us root name; `trava.il` uses nothing real). the filter excludes only the root-registrability failure; multi-dot splits on genuinely registrable endings remain valid.

## 3. closed to institutions or dormant
- **.va** (vatican city state): not available for public registration; a handful of names held by the state.
- **.gb** (united kingdom): dormant; the uk uses .uk; .gb is reserved with essentially no delegations.
- sponsored/brand gtlds (.gov, .edu, .museum, .google) are the same condition in other tld families: eligible institutions or a single owner only.

## 4. sanctioned or platform-blocked
the tld is technically registrable but the practical web rejects it.
- **.ir** (iran): registration is possible, but us sanctions make payment and registrar support nearly impossible for western buyers, and security vendors treat the tld with elevated suspicion. flagged, not hidden: a buyer who *wants* an .ir name deserves to see it with its flags.
- **.ru**, **.su**: sanctioned/discouraged; .su is a discontinued soviet code that is still sold by some registrars. surfaced with risk flags rather than excluded, per spec 12.3/12.4 (hide closed, badge restricted, flag risk).

## product behavior (implemented)

- `suggestibleTlds` excludes never-opened, third-level-only, institution-closed and brand endings outright (plus web3 unless toggled).
- `excludedHacks` returns the excluded matches for a keyword with a human-readable reason: "registry has no root registrations (third-level only)", "not registrable (closed registry)", "brand gtld: owned by a single company".
- sanctioned-but-open endings (.ir, .ru) are NOT excluded; they stay suggestible and carry their risk flags, because the barrier is practical, not registrable-by-rule.

## how the class is detected at research time

the per-registry pass (research/cctlds.json, namebeta per-tld pages cross-checked against registry policy) classifies each ccTLD's availability as open / restricted / closed, with restriction classes none / verification / local_presence / residency / closed. the classifier treats reserved-name boilerplate ("names under three characters cannot be registered") as an open-registry signal, not a closed one; that false-positive class produced the earlier .li/.lu/.mn/.cd mistakes and is covered in dataset-notes.md.

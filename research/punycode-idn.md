# punycode and idn tlds

research doc for dom's off-by-default punycode toggle.

## what punycode is

- the dns only allows ascii, so non-ascii (internationalized) domain names are encoded as punycode: `xn--` followed by the ascii-compatible encoding. `bücher.example` becomes `xn--bcher-kva.example`. an idn tld is one where the ending itself is punycode, e.g. `.рф` = `.xn--p1ai`, `.台灣` = `.xn--kpry57d`.
- idn ccTLDs were introduced through icann's fast track process for country codes in non-latin scripts; about 60 exist, plus idn second-level offerings under many ordinary ccTLDs (e.g. .de offers idn registrations under the ascii tld). source: en.wikipedia.org/wiki/Internationalized_country_code_top-level_domain, scraped 2026-10-18.

## the reputation problem: homograph attacks

source: punycoder.com/idn-homograph-attack, scraped 2026-10-18.

- the core abuse: characters from different scripts that look identical. `аpple.com` (cyrillic а) vs `apple.com` (latin a) are different domains but render the same. this is the idn homograph attack, well documented since the mid-2000s.
- browsers defend by policy: chrome displays mixed-script idns in punycode form (the user sees `xn--`), single-script non-latin names render natively. different browsers make different choices, so the *same* domain can render differently per client.
- the consequence for a buyer: an idn domain's user-visible form is inconsistent across clients, some clients will always show the ugly `xn--` form, and the shape is historically associated with phishing. anyone buying one for a latin-market brand is taking on platform-level friction on purpose.

## availability and registry rules

- idn ccTLD registries each run their own policy: many restrict registrations to local script, local presence, or specific registrant classes (the same restricted/closed landscape as the rest of the ccTLD research; see research/cctlds.json and dataset-notes.md).
- the registry-availability research pipeline covers the ascii root list; the idn ccTLDs sit in it as their `xn--` forms. each needs the same per-registry verdict (open / restricted / closed) plus a script and a language tag before it can be suggested even with the toggle on.

## how dom handles it (design notes, implement later)

- default coverage is latin-alphabet only (readme, main branch): punycode endings are excluded from suggestions until the punycode toggle is on.
- when the toggle is on, each idn candidate must display: the punycode form, the rendered form, the script, the registry's restriction state, and a fixed notice that rendering varies by browser and mixed-script names display as `xn--` in chrome-class clients.
- suggestion-quality rule: a punycode hack only counts as a match if the *rendered* form splits the keyword naturally; the punycode form itself is never the match target (nobody types `xn--` by hand).
- risk radar: idn endings inherit the ccTLD risk axes of their registry plus a fixed homograph-attention note; they never outrank a latin equivalent with equal fit.

## web3 namespaces (separate toggle, same default-off family)

source: docs.ens.domains (ensip-1), docs.unstoppabledomains.com web3 browser resolution guide, brave browser wiki "web3 top level domains", scraped 2026-10-18.

- **ens** (`.eth` and higher-level ens names on the ethereum chain): names are on-chain records with resolvers; resolution requires a wallet, an ens-aware client, or a gateway service. `.eth` is not in the dns root and cannot be opened by typing it into an ordinary browser.
- **unstoppable domains** (`.crypto`, `.x`, `.wallet`, `.nft`, ...): nft-based names, resolved via browser extensions, brave/opera support, or their gateway.
- **handshake**: its own chain claiming alternate roots; resolving depends on a handshake-aware resolver, not public dns.
- brave's web3 wiki is the practical map of which namespaces mainstream browsers will actually resolve natively: a small, explicitly enumerated list. everything else needs an extension or gateway. that list is the boundary between "opens in a normal browser (with a toggle)" and "opens only for the already-converted".
- ownership is a token, not a registry lease: no renewal lapse in the dns sense (ens renewals are chain-mechanics per name type), no redemption cycle, no registrar transfer in the epp sense. lifecycle research (research/domain-lifecycle.md) does not apply; scarcity and resale run on marketplaces like opensea, not drop-catchers.
- risk profile for the radar: platform dependence (does the client resolve it at all), ecosystem churn (ud renamed/reorganized namespaces historically), and no dns-grade global uniqueness.

design notes (implement later): web3 candidates appear only with the web3 toggle, always labeled with their namespace (ens / ud / handshake) and resolution reality ("resolves natively in brave; elsewhere needs an extension"), and never mixed into the latin ranking. punycode and web3 are separate toggles because their caveats are different: punycode opens in every browser but renders inconsistently; web3 resolves consistently but only for a subset of clients.

# tld dataset provenance

built 2026-10-18 by scripts/build (see conversation research scripts) and
scripts/gen-tld-seed.mjs. every row carries sourceUrl + accessed.

## sources
- IANA delegated TLD list: https://data.iana.org/TLD/tlds-alpha-by-domain.txt (1437 delegated endings; 248 ccTLDs)
- IANA root database (type, status, manager): https://www.iana.org/domains/root/db — fills every gTLD not covered by wikipedia; retired/inactive endings classified closed + discontinued
- Wikipedia "List of Internet top-level domains" + "Country code top-level domain" (bulk restriction notes, brand table)
- RDAP bootstrap (rdapSupported): https://data.iana.org/rdap/dns.json
- Google treats-as-generic ccTLD list (official doc): research/google-generic-cctlds.json
- Registration routes (trustee/business/residency): research/cctld-intermediaries.json (142 endings, per-registry citations)
- Route corrections (owner-flagged): research/cctld-intermediaries-corrections.json
  - .uk: nominet SLDR rules pdf — anyone may register; non-uk registrants need a uk address for service
  - .ie: IEDR registration & naming pdf — irish bodies via vat/crn; foreign businesses via trademark/trade connection
  - .il: isoc.org.il — root not registrable, third-level only (co.il etc.)
- Second-level registrability: research/cctld-second-level.json (33 endings; .il .np .za .ke .pk .eg .sa .th .uy .py .bo .cr marked third-level-only)
- HSTS-preloaded TLDs: .app .day .dev .page .new (google registry, preload-listed before launch)
- Flags: .ir/.ru/.su sanctioned (US OFAC), .tk/.ml/.ga/.cf/.gq freenom free-registry history, .io/.ly sovereignty risk

## verification status
- verified:true rows were confirmed against a registry/official document (the acceptance cases: .er closed, .ca/.us presence, .de/.fr/.eu, .uk/.ie corrections, .il, gTLD hsts set, sponsored sets)
- verified:false rows are bulk-sourced (wikipedia/IANA) — ranked below verified rows by the suggestion engine and shown with an unverified caveat in the api
- prices are null (not observed this pass) — verify at a registrar before quoting

## known follow-ups
- deep-verify the ~140 remaining restriction-unverified ccTLDs (rank-verified ones first)
- confirm second-level registrability for the ~200 ccTLDs not yet in cctld-second-level.json
- observe registrar prices for the top hack endings

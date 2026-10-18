# domainhacks — scoped build spec (backend only)

the domain hack finder, split out of the master spec (donna-spec.md §12) onto this orphan-rooted `domainhacks` branch. the donna agent lives on the `donna` branch (different backend, same repo).

**scope rule: we're only building donna and domainhacks things — not the payment saas, not the frontend.**

## in scope (this build)

- candidate generation (spec 12.1): normalize the keyword, split against the tld list, rank (fewer dots, registrable tld, fit). pricing is never displayed (product decision). endings that match the keyword but cannot be owned are never suggested — and are surfaced in `excluded` with the reason instead of silently missing (third-level-only registries like .il, closed registries like .er, brand gtlds, web3 namespaces)
- availability checks (spec 12.2): rdap first, whois fallback, cache 1h available / 24h taken — skeleton
- tld metadata (spec 12.3/12.4): researched dataset with citations, per-registry verification (namebeta per-tld research cross-checked against registry pages; registry verdicts win on conflict), registrar price comparison for typical/renewal usd — every ccTLD classified as open / local_presence / residency / verification / closed / unknown (e.g. .er closed, .ca canadian presence, .us nexus, .de verification, .eu residency), platform flags (.ir sanctioned and potentially browser/platform-blocked, freenom-tld free-registry history, .su discontinued, .io/.ly sovereignty risk), google's treats-as-generic ccTLD list from the official doc, hsts-preloaded gTLDs, brand gtlds closed. data: `research/*.json` → `scripts/gen-tld-seed.mjs` → generated seed → `tld_meta`.
- tld risk radar (spec 12.5): read-only sync of the existing **thetldradar** dataset (github.com/tinkrland/themailtell, `thetldradar` branch) — citations + dates kept exactly as published; licensing/credit is an open question (spec 20) before anything public shows it
- hack fit score (spec 12.5.1): donna's own view of whether a hack works as a name (split naturalness, dotless twin, file-extension clash, autolinking, email fit...) — partial
- search impact note (spec 12.6): google-treats-as-generic
- domain purgatory awareness (research/domain-purgatory.md; in-house term for the domain lifecycle): rdap status classified into stages (auto-renew grace / redemption / pending delete); taken-but-expiring is a watch, not a dead end. purgatory depth beyond rdap + whois history are paid third-party signals (whoisfreaks/whoisxml/securitytrails): free tier shows only the rdap-visible stage; deeper runs are gated to donna's paid pre-check
- taken-hack toggle (default off): taken domain hacks are generated alongside available ones but hidden until toggled on; each surfaced taken hack carries the "want it anyway? have donna ask the owner" handoff. dom is the precursor check feeding donna: the free pre-check signals (rdap, dns, website, wayback) run inside dom's taken-hack view and hand a ready-made campaign context to donna
- tld reputation (research/tld-reputation.md): abuse-class prior per tld (clean / ordinary / elevated / high) shown in compare mode, snapshot-dated
- punycode + web3 behind off-by-default toggles (research/punycode-idn.md); default coverage is latin-alphabet only
- web3 names (spec 12.7): ens + unstoppable lookups, only when the toggle is on

## out of scope (for now)

- **frontend** — the finder page. api only, json responses.
- **payments** — no stripe, no fee saas.
- donna's outreach / pre-check / closing — that's the `donna` branch (different backend)
- drop-catching, escrow, web3 outreach

## research stack

for research we use **querit + firecrawl + tavily etc.**:

- **iana root zone + public suffix list** — the tld source of truth, refreshed weekly
- **thetldradar** — the risk radar dataset, read-only, citations preserved as-is
- **firecrawl** — registrar pricing pages (first-year vs renewal observations, each with its own observation date)
- **tavily** — web search for registry policy changes, sovereignty and registry news
- **querit** — deep research on tld restrictions, barriers, pricing questions
- **ens subgraph/registrar + unstoppable domains api** — web3 availability (toggle-gated)

api keys are optional env vars (`QUERIT_API_KEY`, `FIRECRAWL_API_KEY`, `TAVILY_API_KEY`); the scaffold boots without them.

## architecture (scaffold)

- **api**: fastify on :3000 — `/health`, `GET /api/hacks?keyword=&web3=0|1`, `GET /api/tlds`
- **worker**: postgres-backed job queue — handlers: `tld_sync`, `radar_sync`, `availability`, `web3_availability`
- **core** (pure, unit-tested): candidates (split generation + ranking), hack-fit (partial), tld-meta (seed)
- **postgres**: `tld_meta`, `tld_radar`, `availability_cache`, `jobs`

## scaffold status

- real: hack split generation (label + subdomain hacks), ranking, file-extension clash flags, search impact note, web3 toggle + labeling, tld seed (~35 rows), job queue, migrations, api
- placeholder: availability lookups, radar sync, web3 lookups, dotless twin + autolink checks (todo-marked in `src/workers/handlers.ts`)

# AGENTS.md

## what this branch is
`domainhacks` is an orphan-rooted branch in `tinkrland/deardomain` holding the domain hack finder **backend only** — no shared history with the `donna` branch (a different backend). scope: `SCOPE.md`. the master product spec lives on the `donna` branch as `donna-spec.md` (section 12 covers this product).

## scope rule
only building donna and domainhacks things right now — **no payment saas, no frontend**.

## run (dev)
- `docker compose up -d` — api on http://localhost:3000, postgres (db `domainhacks`), worker, one-shot migrate.
- deps install at container start (`npm install`); node_modules live in named volumes, never in the repo.
- try: `curl 'localhost:3000/api/hacks?keyword=delicious&web3=1'`
- tests: `docker compose exec api npm test`

## research stack (optional env keys — nothing required to boot)
QUERIT_API_KEY / FIRECRAWL_API_KEY / TAVILY_API_KEY — see SCOPE.md. delivered via the local `.env` file (compose `env_file:`).

## conventions
- ESM + node 22 + tsx; no build step; `npm run typecheck` for tsc.
- core logic is pure and unit-tested (`src/core`); I/O lives in `src/api` and `src/workers`.
- new migration: `src/db/migrations/00N_*.sql` — the runner records applied names in `schema_migrations`.
- tld metadata comes from researched datasets: `research/*.json` (ccTLD availability/restrictions, gTLD rows, google's generic-cctld list, platform flags, second-level registrability, registration routes with fees — every row carries its citation + access date) → `node scripts/gen-tld-seed.mjs` regenerates `src/core/tld-meta-seed.generated.ts` → seeded into `tld_meta` at boot. never hand-edit the generated file; fix the research json and regenerate.
- per-tld verdicts are per-registry research: namebeta.com/tlds/<tld> pages (eligibility + registrar price comparison) cross-checked against registry policy pages; a registry-direct citation wins on conflict. rows marked verified:false are bulk-sourced (IANA root db / wikipedia) and rank below verified rows.
- prices are the cheapest registration/renewal observed across namebeta's registrar comparison, recorded as ballpark usd — verify before launch. **dom never surfaces prices to users** (product decision): the fields stay in the dataset for internal ranking/scoring only and are stripped from api responses and ui copy.
- the suggestion filter (`suggestibleTlds`) excludes: web3 unless toggled, not publicly registrable endings, and third-level-only registries (root registrations not offered, e.g. .il only sells co.il). `excludedHacks` returns those matches with a reason — keep that contract intact.

## research docs (product knowledge, implement later)
- `research/domain-purgatory.md`: expiry -> auto-renew grace -> redemption (30d) -> pendingDelete (5d) -> drop; registrar auctions/closeouts/drop-catch in between; epp status semantics; ccTLDs don't follow the gTLD timeline. design notes for donna (stage classification, auction-watch) and dom (taken-but-expiring).
- `research/history-providers.md`: whoisfreaks (ownership timeline to 1986, expiring/pending-delete feeds), whoisxml api (whois history + monitors), securitytrails (dns history, parking-infra dating). signals: recently_changed_hands, serial_lapser, registrar_hopper.
- `research/tld-reputation.md`: interisle 2025 (new gtlds = 11% of market, 51% of reported phishing), dnsrf, cybercrime infocenter quarterly tables, spamhaus worst-tlds. abuse tracks price pressure + barrier, not category alone; wiring notes for compare mode.
- `research/punycode-idn.md`: punycode/homograph risks, idn ccTLDs, web3 namespaces (ens/ud/handshake) and what browsers actually resolve; both toggles are off by default, latin-only default coverage.
- `research/closed-cctlds.md`: the delegated-but-unavailable class (never opened / third-level only / institution-closed / sanctioned), how the filter and excludedHacks treat each.
- adaptionlabs (rechecked 2026-10-18): api is live at `https://api.prod.adaptionlabs.ai/api/v1` (openapi spec open-sourced at github.com/adaptionlabs/adaption-api-docs). it is a dataset/training platform (dataset creation/augmentation, autoscientist model training, dataset "invent" generation, mcp endpoint), not a web-research tool: its future role here is generating or co-optimizing training data for dom's classifiers (hack fit, risk banding), never runtime lookup. key validated against leaderboard/overview.

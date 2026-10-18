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
- prices are the cheapest registration/renewal observed across namebeta's registrar comparison, recorded as ballpark usd — verify before launch.
- the suggestion filter (`suggestibleTlds`) excludes: web3 unless toggled, not publicly registrable endings, and third-level-only registries (root registrations not offered, e.g. .il only sells co.il). `excludedHacks` returns those matches with a reason — keep that contract intact.

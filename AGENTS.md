# AGENTS.md

## what this repo is
donna ("dear domain") — backend only. full product spec: `donna-spec.md`; what we're building right now: `SCOPE.md`. **payments/fee saas and frontend are explicitly out of scope.** the domain hack finder lives on the `domainhacks` branch in this repo — a different backend (its own SCOPE.md + compose), orphan-rooted with no shared history.

## the `domainhacks` branch
`git checkout domainhacks` — the domain hack finder backend (spec 12): candidates, hack-fit, tld metadata, availability workers. this branch is the donna agent backend only; the two backends are deliberately separate.

## run (dev)
- `docker compose up -d` — api on http://localhost:3000, postgres (db `donna`), worker, one-shot migrate.
- deps install at container start (`npm install`); node_modules live in named volumes, never in the repo.
- health: `curl localhost:3000/health`

## flows to verify after changes
1. `curl -X POST localhost:3000/api/prechecks -H 'content-type: application/json' -d '{"domain":"example.com"}'` → precheckId
2. wait ~3s, `curl localhost:3000/api/prechecks/<id>` → status done (worker picked up the job; dns step is real, rest todo-marked)
3. `curl -X POST localhost:3000/api/campaigns -H 'content-type: application/json' -d '{"fqdn":"example.com","maxOffer":30}'` → campaign in state `deployed`
4. `curl localhost:3000/api/campaigns/<id>` → state + events timeline

tests: `docker compose exec api npm test`

## research stack (optional env keys — nothing required to boot)
QUERIT_API_KEY / FIRECRAWL_API_KEY / TAVILY_API_KEY — see SCOPE.md. delivered via the local `.env` file (compose `env_file:`). handlers check presence via `config.research` and log not-configured instead of failing.

## payments boundary
spec 14 is deferred: campaigns are created already-`deployed` at the external payment boundary. no charging code exists and none should be added until the fee saas is in scope.

## conventions
- ESM + node 22 + tsx; no build step; `npm run typecheck` for tsc.
- core logic is pure and unit-tested (`src/core`); I/O lives in `src/api` and `src/workers`.
- new migration: `src/db/migrations/00N_*.sql` — the runner records applied names in `schema_migrations`.
- spec 2 is non-negotiable: no more than one first message + one follow-up per channel; opt-outs are permanent and global (`suppressions`).

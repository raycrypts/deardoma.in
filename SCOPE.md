# donna — scoped build spec (backend only)

the full product spec is `donna-spec.md`. this file scopes what we're building **right now**.

**scope rule: we're only building donna and domainhacks things — not the payment saas, not the frontend.** the domain hack finder lives on the `domainhacks` branch (its own backend, same repo).

## in scope (this build)

- pre-check pipeline (spec 5): registration data (rdap/whois), dns, website, wayback, github + public mentions, email checks, scores — job-based
- contact routes + confidence gates (spec 6, 7): priority order, route limits, confidence table
- outreach + negotiation engine (spec 8): message rules as templates, negotiation policy (pure logic), reply classification
- closing + transfer monitoring (spec 10) and expiry watch (spec 11) as job skeletons
- suppressions (spec 13): permanent opt-out list shared across all buyers
- postgres data model (spec 16) + postgres-based job queue (spec 15)
- activity events — the feed the buyer timeline will consume later

## out of scope (for now)

- **payments / stripe / fee saas (spec 14)** — the deploy payment is an external boundary: campaigns are created already-deployed. no charging, no card storage, no payments table.
- **frontend** — api only, json responses.
- the domain hack finder (spec 12) → `domainhacks` branch (separate backend)
- real email sending infrastructure (dedicated outreach domains, spf/dkim/dmarc, warmup, inbound webhook) — handler stubs mark the integration points
- web3 anything

## research stack

for research we use **querit + firecrawl + tavily etc.**:

- **firecrawl** — fetch + classify the domain's website in the pre-check (parked / for sale / default page / placeholder / live + activity signals; spec 5.3)
- **tavily** — web search for public mentions of the domain (spec 5.5)
- **querit** — deep research + verification of candidate owners (evidence gathering, confidence scoring; spec 5.5 + 7)
- **github api** — repos, code, pages cname files (rate limits respected)
- **rdap/whois, dns, wayback** — direct lookups, no third party needed
- **smtp checks** — dedicated checker machine or verification api (never from sending servers; never abuse/postmaster)

api keys are optional env vars (`QUERIT_API_KEY`, `FIRECRAWL_API_KEY`, `TAVILY_API_KEY`). the scaffold boots and serves without them; handlers log not-configured instead of failing.

## architecture (scaffold)

- **api**: fastify on :3000 — `/health`, `POST /api/prechecks`, `GET /api/prechecks/:id`, `POST /api/campaigns`, `GET /api/campaigns/:id`
- **worker**: postgres-backed job queue (`jobs` table) — handlers: `precheck`, `outreach_sender`, `reply_classifier`, `transfer_monitor`, `expiry_watch`
- **core** (pure, unit-tested): state machine (spec 4), negotiation policy (8.2), contact routes (6/7), reply intents (8.3)
- **postgres**: tables from spec 16, minus payments

## scaffold status

- real: state machine, negotiation policy, route priority + limits + confidence gates, job queue + claim loop, migrations, api, dns step of the pre-check (mx/ns + provider classification)
- placeholder: reply classifier (keyword heuristic until the llm lands), pre-check scores, every external lookup (todo-marked in `src/workers/handlers.ts`)

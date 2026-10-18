# donna — scoped build spec (backend only)

the full product spec is `donna-spec.md`. this file scopes what we're building **right now**.

**scope rule: we're only building donna and domainhacks things — not the payment saas, not the frontend.** the domain hack finder lives on the `domainhacks` branch (its own backend, same repo).

## in scope (this build)

- pre-check pipeline (spec 5): registration data (rdap/whois), dns, website, wayback, github + public mentions, email checks, scores — job-based
- **domain purgatory** (spec 5.1 + research/domain-purgatory.md on the domainhacks branch): free rdap signal classifies the post-expiry walk — ok / auto_renew_grace / redemption / pending_restore / pending_delete / suspended / dropped — with per-stage campaign advice (redemption = negotiation moment; pending_delete = shift to drop/auction watch). gTLD-authoritative, best-effort for ccTLDs.
- **website / wayback / mentions / email steps** (spec 5.3-5.6, real): website fetch + classification (parked / for_sale / default_page / placeholder / live / no_site) with email + contact-form harvest, firecrawl fallback when sites block plain fetch; wayback cdx (snapshot history + subdomain breadth); github repo search + tavily web mentions (key-gated); passive email reachability (harvested emails + mx hosts, active probing awaits a dedicated verification service per spec 8).
- **structural platform detection** (never charged): beyond the curated platform list — a domain with 50+ distinct archived subdomains is product infrastructure other people depend on (lu.ma model); the pre-check refuses it with hands up at that evidence.
- **pre-check scores** (spec 5.7, real): deterministic, explainable in_use_score (website class, wayback recency, mail infra, purgatory stage, parking infra, reseller bump) and reachability_score (emails, forms, mail infra, registrar, privacy penalty), plus usage_status and estimated_success_chance; written to domains + prechecks rows.
- **viability gate** (hands-up classes, never charged): platform domains (lu.ma model — the domain IS the product, a sale would break every customer url; curated list, checked on the registrable base), registry-essential names (nic./dns./whois./www./registry.), and third-level-only registry roots (.il/.th/.za: foo.il and co.il can never be owned, only example.co.il can). enforced at pre-check intake, campaign intake, and again inside the worker before any metered lookup.
- **whois history + past dns** (spec 5.1b, paid): whoisfreaks (ownership timeline, v2.0 api) with whoisxml as alternate, securitytrails (dns history: site-death dating + long-term parking-infra detection). signals: recently_changed_hands, serial_lapser, registrar_hopper, long_term_parked. locked behind the paid pre-check (`payload.paid`); each client degrades to `skipped: no key` — keys: WHOISFREAKS_API_KEY, WHOISXML_API_KEY, SECURITYTRAILS_API_KEY.
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

- real: state machine, negotiation policy, route priority + limits + confidence gates, job queue + claim loop, migrations, api, dns step of the pre-check (mx/ns + provider classification), rdap registration data + purgatory classification, paid history step (whoisfreaks/whoisxml/securitytrails, key-gated), transfer monitor (registrar/created-change detection + 60-day block note), expiry watch (purgatory-stage alerts: redemption/pending_delete/pending_restore/auto_renew_grace), website/wayback/mentions/email steps, structural platform detection, pre-check scores + usage status
- placeholder: reply classifier (keyword heuristic until the llm lands), active mailbox probing (dedicated verification service per spec 8), llm negotiator

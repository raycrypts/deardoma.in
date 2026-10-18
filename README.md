# donna — the domain agent

donna is the agent behind **dear domain**: she finds the owner of a registered
but unused domain, contacts them politely, and negotiates a small
buyer-funded purchase (micro-deals — a domain worth about $10 sells for $30
or less).

this is the **donna agent backend**: a json api over a postgres-backed job
queue. it powers the dear domain **web app and cli** — the product is
delivered as a web saas plus a cli client, and this repo is the service both
of them talk to.

## what it does

- **pre-check pipeline** — registration data (rdap), dns, website
  classification, wayback history, github + public mentions, email checks,
  then usage/reachability scores, success odds and a suggested price band.
- **outreach campaigns** — contact routes in priority order with confidence
  gates, a negotiation policy, and permanent global opt-outs
  (suppressions).
- **closing, transfer monitoring and expiry watch** as job skeletons.

the backend is api-only: no frontend, no charging (campaigns are created at
the external payment boundary; the fee saas is deferred — spec 14).

## repo layout

- `donna-spec.md` — the master product spec (this branch)
- `SCOPE.md` — what's being built right now
- `domainhacks` branch — the domain hack finder, a different backend
  (same repo, no shared history)

for development conventions and the dev environment, see `AGENTS.md` and
`docker-compose.yml`.

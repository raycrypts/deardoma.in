# donna — backend

the domain agent, backend only. scope: `SCOPE.md`. full product spec: `donna-spec.md`. the domain hack finder lives on the `domainhacks` branch (a separate backend, same repo).

## run

```sh
docker compose -f docker-compose.base44.yml up -d
```

api on http://localhost:3000 (bind-mounted source, `tsx watch` live reload; deps install at container start).

```sh
curl localhost:3000/health
curl -X POST localhost:3000/api/prechecks -H 'content-type: application/json' -d '{"domain":"example.com"}'
curl localhost:3000/api/prechecks/1            # worker picks the job up (dns step is real)
curl -X POST localhost:3000/api/campaigns -H 'content-type: application/json' -d '{"fqdn":"example.com","maxOffer":30}'
curl localhost:3000/api/campaigns/1            # state + events timeline
```

## tests

```sh
docker compose -f docker-compose.base44.yml exec api npm test
```

## research integrations

querit + firecrawl + tavily etc. — see SCOPE.md. keys are optional env vars delivered via `/run/base44/app.env`; nothing is required to boot.

## payments

out of scope for this build (deferred fee saas, spec 14): campaigns are created already-deployed at the payment boundary.

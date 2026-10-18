# domainhacks — backend

the domain hack finder, backend only. scope: `SCOPE.md`. orphan-rooted `domainhacks` branch in `tinkrland/deardomain` — no shared history with the `donna` branch (which holds the master spec and the agent backend).

## run

```sh
docker compose -f docker-compose.base44.yml up -d
```

api on http://localhost:3000 (bind-mounted source, `tsx watch` live reload; deps install at container start).

```sh
curl localhost:3000/health
curl 'localhost:3000/api/hacks?keyword=delicious'
curl 'localhost:3000/api/hacks?keyword=teeth&web3=1'   # web3 toggle on
curl localhost:3000/api/tlds
```

## tests

```sh
docker compose -f docker-compose.base44.yml exec api npm test
```

## research integrations

querit + firecrawl + tavily etc. — see SCOPE.md. keys are optional env vars delivered via `/run/base44/app.env`; nothing is required to boot.

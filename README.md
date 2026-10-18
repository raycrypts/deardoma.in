# domainhacks — the domain hack finder backend

the domain hack finder behind **dear domain**: type a word or phrase, get
hack splits (`delicio.us`, `sees.me`, `bla.xyz`) with availability, a price
estimate, the tld type (cctld / gtld / sponsored / web3), registration
restrictions and a risk radar per ending. an off-by-default toggle surfaces
web3 hacks (`te.eth`, `rela.x`).

this is the **finder backend**: a json api over a postgres-backed job
queue. it powers the dear domain **web app and cli** — the product is
delivered as a web saas plus a cli client, and this service is what both of
them talk to. the free finder is the top of the funnel: available names get
a registrar affiliate link, taken ones lead into donna's paid outreach.

key surfaces: `GET /api/hacks?keyword=&web3=0|1` and `GET /api/tlds` —
api-only, json responses, no frontend in this repo.

tld policy is researched and cited: which ccTLDs are actually purchasable
(open vs local-presence vs residency vs closed), platform flags (sanctioned
or browser-flagged endings), and google's generic-vs-geotargeted ccTLD
treatment. see `SCOPE.md` and `src/core/tld-meta.ts`.

orphan-rooted `domainhacks` branch in `tinkrland/deardomain` — no shared
history with the `donna` branch (which holds the master product spec,
`donna-spec.md`, and the agent backend). for development conventions and
the dev environment, see `AGENTS.md` and `docker-compose.yml`.

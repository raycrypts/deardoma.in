# domain history providers: whoisfreaks, whoisxml api, securitytrails

research doc. these are third-party apis for past-ownership and past-dns evidence: how a domain changed hands, whether it has been through redemption/pendingDelete before, and what its dns looked like over time. build-time research sources; integrated 2026-10-18 into donna's paid pre-check (branch donna, commit decd605): src/core/purgatory.ts (free rdap stage classification), src/core/history/whois-history.ts (whoisfreaks v2.0 + whoisxml), src/core/history/dns-history.ts (securitytrails), key-gated via WHOISFREAKS_API_KEY / WHOISXML_API_KEY / SECURITYTRAILS_API_KEY, locked for free pre-checks.

## whoisfreaks

source: whoisfreaks.com/products/whois-history-api and whoisfreaks.com/products/expiring-dropped-domains, scraped 2026-10-18.

- **whois history api**: "complete ownership timeline of any domain covering every registrar change, registrant update, nameserver modification, and expiry event, going back to 1986." endpoint is `GET https://api.whoisfreaks.com/v2.0/whois/history?domainName=example.com&apiKey=..` (v2.0, corrected 2026-10-18 from the product page), with mode switches for forward/reverse lookups and live + historical whois.
- **expiring / dropped domains feeds**: daily programmatic access to three feeds: expiring domains (pre-drop), dropped domains (just released), and pending-delete domains (final countdown). this is the auction/drop-watch input: instead of polling rdap for every watch, consume the daily feed and match against the watch list.
- free tier exists (limited lookups/month), then per-lookup pricing. api key auth, simple GET, json back.

what it gives the product:
- **transfer-of-hands evidence.** a registrant-change event in the history is the single strongest "this domain was recently sold or moved" signal. for donna: recently-changed-hands means likely reseller (higher price expectation); stable ownership for a decade means likely the original hobby owner (the winnable profile).
- **expiry event history.** a domain that has bounced through redemption/pendingDelete before has an owner who already forgot it once; that raises the odds the current cycle ends in a drop, and lowers the expected purchase price.
- **dropped-domains feed** powers the dom availability side: "this hack ending was dropped last week, it may be free now" freshness beyond the rdap cache window.

## whoisxml api

source: whois-history.whoisxmlapi.com/api and drs.whoisxmlapi.com/domain-monitor, scraped 2026-10-18.

- **whois history api**: historical whois records per domain; their published case study is literally "domain ownership change detection" (university of massachusetts amherst use case).
- **domain monitor**: watches a set of domains and alerts on whois changes (status, registrar, expiry, contact).
- **registrant monitor**: reverse watch: alert when a given person/org appears on new domains; useful to spot a seller moving their portfolio.
- auth by api key, json, per-lookup + subscription tiers.

what it gives the product: same ownership-change evidence as whoisfreaks plus **monitors**: donna's expiry watch and dom's taken-hack watch become push instead of poll. registrant monitor can answer "what else does this owner hold" (portfolio owner = different negotiation than single-domain owner).

## securitytrails

source: docs.securitytrails.com (api reference; the docs offer llms.txt for machine reading), scraped 2026-10-18.

- **dns history by record type**: `GET /v1/history/{hostname}/dns/{type}`. returns dated records with `first_seen`/`last_seen`, values (ips for a records, targets for mx/ns), and the org behind the ip. e.g. a history showing an a-record moving from a 1990s university ip block to a parking-ip range tells you when a site died without any whois at all.
- **whois history by domain**: `GET /v1/history/{hostname}/whois` (historical whois records).
- also: current dns, subdomains enumeration, reverse ip.
- freemium api tiers, key auth, json.

what it gives the product:
- **site-death dating** independent of whois: mx records that switched from google workspace to a forwarding service date "when the owner stopped caring". that timestamp feeds donna's usage classification.
- **parking-infra detection**: historical ns values matching known parking nameservers (already in the dns classification) over a long period = long-term parked, which is the single best "buyable" signal in the pre-check.
- for dom: historical dns on a taken hack ending shows whether it ever hosted something real (affects the "want it anyway" pitch).

## how the three compare (decision notes)

| need | best fit |
|---|---|
| full ownership timeline, oldest coverage (1986) | whoisfreaks |
| change alerts / monitors as a product feature | whoisxml api |
| past dns + parking infra dating | securitytrails |
| expiring/pending-delete feeds for drop watch | whoisfreaks |

all three meter per lookup; for the micro-deal price point the usage pattern must be: free signals (rdap status, wayback) first, paid history lookup only once a buyer has paid for a pre-check on that specific domain. build-time research (dataset refreshes) can batch-use them under the research keys.

## integration sketches (implement later)

- pre-check step 5.x "history": whoisfreaks history for the target domain; extract (a) registrant-change count and last change date, (b) any past redemption/pendingDelete events, (c) registrar moves. outputs feed the scoring engine as three signals: `recently_changed_hands`, `serial_lapser`, `registrar_hopper`.
- expiry watch: switch from rdap polling to whoisfreaks daily pending-delete/expiring feeds matched against the watch list; rdap only confirms the final state.
- dom compare mode: optional per-candidate "history" column (ever-dropped, ever-parked, creation date) populated lazily from whoisfreaks/securitytrails when a user expands a candidate.

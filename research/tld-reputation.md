# tld reputation: gTLD vs ccTLD abuse, and how dom weighs it when comparing hacks

research doc. reputation here means the statistical prior that a domain in a given tld is malicious or spammy, as measured by the big abuse feeds. it is a tld-level prior, never a verdict on a specific domain.

## the sources and what they actually say

### interisle, phishing landscape 2025 (may 2025 report)
source: interisle consulting group, "phishing landscape 2025" pdf (also hosted by domainnamewire.com/wp-content/Interisle_Phishing-Landscape-2025.pdf), scraped and read 2026-10-18.

- **new gTLDs are 11% of the domain market but 51% of reported phishing domains.**
- domains reported for phishing rose 38% year over year.
- the top five TLDs by phishing score in the study period all scored higher than any tld in the 2024 study.
- the top five were dominated by cheap or free new gTLDs; the former freenom TLDs (.tk, .ml, .ga, .cf, .gq) were prominent until the freenom lawsuit stopped their registrations (they had been top abusers for years).
- interisle consistently distinguishes raw counts from share: .com hosts the most malicious domains by count because it is the biggest; its share-based "phishing score" is unremarkable.

### dns research foundation / global signal exchange (2025 analysis)
source: dnsrf.org/blog/new-gtld-abuse-analysis (revised 2025-09-02 to use icann's brand-tld definition), scraped 2026-10-18.

- reported abuse rates in new gTLDs remain substantially higher than in legacy gTLDs and ccTLDs, a decade after the expansion.
- abuse concentrates in cheap first-year pricing and api bulk registration.

### cybercrime information center (caida / uc sd)
source: cybercrimeinfocenter.org/what-top-level-domains-attract-phishers, scraped 2026-10-18.

- publishes quarterly top-20 tld tables by reported phishing domains, ranked both by count and by a share-based phishing score, for every tld with at least 30k domains and 25 phishing reports. this is the most directly consumable per-tld feed: named tld, named metric, dated snapshot.

### spamhaus
source: spamhaus.org "spamhaus presents: the world's worst TLDs" report (december 2024 edition), scraped 2026-10-18.

- periodic worst-tld list based on spamhaus blocklist data; ranks tlds by the share of domains appearing on spam blocklists. consistent finding: the worst tlds are cheap new gTLDs with low registration barriers; legacy and restricted ccTLDs are consistently clean.

## the pattern, condensed

1. **abuse tracks price pressure and barrier, not tld category per se**; the correlation is: cheap first-year pricing + api bulk registration + no barrier = high abuse share. restricted ccTLDs (local presence, verification) show the lowest abuse shares, because promos cannot push registrations past a gate the registry runs.
2. **new gTLDs carry the highest prior**, as a class (11% of market, 51% of phishing per interisle 2025), but individual new gTLDs vary widely by pricing and barrier.
3. **legacy gTLDs and open ccTLDs are ordinary**; restricted ccTLDs are the cleanest class.
4. platform risk rides along with abuse share: link-messengers and mail filters treat tlds by the same feeds, so the abuse prior doubles as a "will your link get flagged" prior.

## how dom uses this when comparing hacks (design notes, implement later)

- reputation is already one axis of the risk radar (spec 12.5 axis 1, abuse band). what this research adds is a **comparison-level weight in compare mode**: when a user weighs `hac.king` (new gtld) against `hack.ing`-style alternatives across tld classes, compare mode should show each candidate's tld abuse class (clean / ordinary / elevated / high) with the snapshot date, not just a private radar score.
- ranking boost for clean-class endings (restricted ccTLDs, legacy gTLDs) in the default ordering; new-gTLD candidates keep their rank but display the elevated prior prominently (a buyer deserves to know their .xyz-neighborhood is 51% of phishing even when their specific name is clean).
- data wiring: consume the cybercrime infocenter quarterly tables (they publish the per-tld data) plus interisle annual pdf and spamhaus periodic reports into a small `tld_reputation` table: tld, snapshot date, source, phishing score, abuse class. refreshed offline, baked into the dataset like the rest of the tld research; never a live dependency.
- the tld-level prior must never label a specific domain "safe" or "unsafe"; wording rule: "tld profile", not "domain reputation".

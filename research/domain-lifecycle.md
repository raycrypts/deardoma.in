# domain lifecycle: what happens after a domain stops being renewed

research doc for donna and dom. every claim carries its source. implementation comes later; this is the dataset of record.

## the canonical gTLD timeline (EPP registries, e.g. .com)

a registered domain that is not renewed walks through four registry states. for .com (verisign) the full walk is roughly 85 days from expiry to drop:

| stage | typical length | EPP status | what it means | who can act |
|---|---|---|---|---|
| auto-renew grace | 0-45 days | `autoRenewPeriod` | registrar may still renew at normal price; many registrars auction the name during this window | current registrant (renew), registrar (auction) |
| redemption grace period (rgp) | 30 days | `redemptionPeriod` | registrar has asked the registry to delete the name; restore is possible via the registrar, usually with a redemption fee (icann's expired registration recovery policy requires the registrar to allow redemption and to have sent three renewal notices) | current registrant via registrar (restore + fee) |
| pending delete | 5 days | `pendingDelete` | the name is locked, no restore possible; after this it is purged | nobody; drop-catchers aim here |
| dropped | instant | (gone) | purged from the registry database; available for re-registration first-come-first-served | anyone |

source: icann EPP status codes (icann.org/resources/pages/epp-status-codes-2014-06-16-en); icann registrant renewal/expiration faqs (icann.org/resources/pages/domain-name-renewal-expiration-faqs-2018-12-07-en); icann gTLD lifecycle diagram (icann.org/resources/pages/gtld-lifecycle-2012-02-25-en). scraped and verified 2026-10-18.

status-code nuances worth encoding:
- `pendingDelete` may be mixed with `redemptionPeriod` or `pendingRestore`; the paired status tells you which rules apply (icann epp table).
- `pendingRestore` is the 7-day window where a registrar has requested a restore but must still deliver restoration documentation; if it misses the window the name reverts to `redemptionPeriod`.
- `redemptionPeriod` blocks transfer: the name must be restored by the current registrar before it can move (icann faq #3).
- `serverDeleteProhibited` / `serverTransferProhibited` often appear during legal disputes or registry lock, not just expiry.
- a name in rgp shows in whois/rdap with the expiry already past; the rdap `status` array is the primary machine signal.

ccTLDs do not follow this: many ccTLD registries have no EPP at all, no redemption state, or a totally different schedule (e.g. .de transitions through DENIC's own hold states, .uk runs a ~92-day suspension-then-drop cycle, .it has a redemption-like "redemptionPeriod" with different lengths). never assume the gTLD timeline for a ccTLD; check per-registry. sources: namesilo lifecycle article (namesilo.com/blog/en/domain-names/what-happens-when-domains-expire-the-lifecycle-of), opensrs expiry blog (opensrs.com/blog/what-happens-when-a-domain-expires), identity.digital grace-periods article (identity.digital/help-articles/grace-periods-explained), scraped 2026-10-18.

## registrar behavior between expiry and drop (the "internal auctions")

between day 0 and the registry drop, the registrar, not the registry, decides what happens to the expiring name. this is where the secondary market lives:

- **expired-domain auctions.** major registrars (GoDaddy the biggest) list expiring names in a public auction during the auto-renew grace window. if someone bids, the registrar renews the name and transfers it to the winner. the original owner can still redeem until the auction closes.
- **closeouts.** names that get no auction bids may go to a fixed-price "buy now" closeout stage before the registrar releases them to the registry.
- **backorders / drop catching.** after the registrar releases the name into `pendingDelete`, services (DropCatch, SnapNames, NameJet, Pool) race to register it the moment it drops. verisign .com drops historically land early afternoon US eastern time; drop-catchers fire many simultaneous registration attempts.
- **private reselling.** if a drop-catcher catches the name, it goes to their own auction or inventory instead of the open market.

source: wikipedia domain drop catching (en.wikipedia.org/wiki/Domain_drop_catching), domcop drop-catch guide (domcop.com/blog/guide-to-domain-drop-catching), expired-auction comparison (domaindetails.com/kb/domain-investing/expired-domain-auctions-comparison), scraped 2026-10-18.

practical consequence: an expired domain often never reaches the open drop. it is sold at auction, closeout, or caught on behalf of a backorder. "wait for it to drop" is only the cheapest path when the name is unattractive to the auction markets.

## what donna does with this (design notes, implement later)

- rdap `status` is already in the pre-check (spec 5.1). add explicit stage classification: `ok`, `autoRenewPeriod` (expiring soon, watch), `redemptionPeriod` (owner has let it go; restore-fee window; good negotiation moment), `pendingDelete` (do not buy, watch for drop/auction), `pendingRestore` (grey zone).
- expiry watch: days-to-expiry already feeds the watch suggestion. the suggestion should state which subsequent path is likely: auction (at which registrar), closeout, drop-catch, or clean drop, because that changes the buyer's cheapest route to the name.
- if a target domain is in `redemptionPeriod`/`pendingDelete`, contacting the owner is pointless for the current cycle; the campaign should shift to a drop/auction watch.
- domain age from whois creation date already exists; the "change of hands" check needs whois history (see research/history-providers.md): a domain whose registrant changed recently is likelier to be a reseller (price expectation up) than a forgotten hobby owner (price expectation down).

## what dom does with this (design notes, implement later)

- availability checks already read rdap; extend the response with lifecycle stage for *taken* names so the finder can say "taken, but expires in N days" instead of just "taken".
- the "want it anyway" handoff to donna should carry the stage: an expired-grace domain leads to an auction-watch suggestion rather than an owner-contact campaign.

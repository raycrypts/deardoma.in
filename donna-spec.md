# donna - the domain agent
product and build spec

## 1. overview

**product:** donna is an ai agent. she finds the owner of a registered but unused domain, contacts them politely, negotiates a small buyer-funded purchase, and guides both sides through the payment and the transfer.

**target deals:** micro-deals, where a domain worth about $10 sells for $30 or less to an owner who isn't using it. traditional brokers don't serve this market because their minimum fees start around $199.

**business model:** a bootstrapped product run by one founder.
- $4.49 deploy fee: one outreach campaign, with no commission.
- $3.99 completion fee: charged only when the deal closes.
- free tools that lead into the paid service:
  - a domain hack finder
  - a free pre-check

**brand:** the brand is "dear domain" and the agent is "donna". the brand's own domain is called `{brand_domain}` throughout this spec (a config value). build the brand around the names, not the spelling of the address, so a later domain move doesn't hurt.

**donna's identity:** donna signs as `donna <donna@{brand_domain}>`. that's her public address on the website, in transactional email and in the buyer dashboard. for deliverability, cold outreach goes out as `donna <donna@{outreach_domain}>` (see principle 5). use the same display name and signature on both, so owners always see one consistent donna.

## 2. core principles (non-negotiable)

1. **be open about being an ai.** every outreach message says donna is an ai agent acting for a buyer. never claim to be a human.
2. **don't harass anyone.**
   - send no more than one first message and one follow-up per contact channel.
   - make it easy for the owner to say no, and respect a no immediately and permanently.
3. **stay out of the money flow.** the buyer pays the seller directly. dear domain only charges its own fees, which avoids escrow and money-transmitter licensing.
4. **keep the pre-check cheap.** it should cost about $0.01 or less per domain so it can be offered free.
5. **protect the sending reputation.**
   - never send cold outreach from `{brand_domain}`. send it as donna@ on separate outreach domains, and keep `donna@{brand_domain}` for transactional and buyer email.
   - make the reply-to address configurable. the default is the outreach address, so cold replies never touch the brand domain's reputation.
   - never send to addresses you haven't checked.
6. **prefer accuracy over reach.** score how confident each owner match is. never treat someone as the owner when you're unsure.

## 3. user flows

### 3.1 free domain hack finder (public page)
1. the user enters a word or phrase.
2. the system generates domain hack splits against the official list of domain endings (tlds).
3. for each candidate, show:
   - whether it's available
   - a price estimate
   - the tld type (cctld, legacy gtld, new gtld or sponsored), with filters for each type
   - any registration restriction (barrier)
   - a risk radar chart (section 12.5)
   - a search and platform impact note (section 12.6)
   - above the results, an off-by-default toggle: **"don't need this to open in a normal browser? see web3 domain hacks too"** (section 12.7)
4. **if the name is available:** show an affiliate link to a registrar.
5. **if the name is taken:** show "want it anyway? have donna ask the owner for $4.49," which leads into the free pre-check.

### 3.2 free pre-check
1. the buyer enters a domain they want.
2. the pre-check pipeline runs (section 5).
3. show the buyer:
   - a usage status: unused, lightly used or actively used
   - the likely contact routes, counted only (never show addresses before payment)
   - an estimated chance of success
   - a suggested price range
4. ask for the buyer's maximum offer and an optional opening offer.
5. next step: deploy donna for $4.49.

### 3.3 paid deployment
1. the buyer pays $4.49. save their card for the possible $3.99 charge later (off-session).
2. donna works through the contact routes in priority order (section 6).
3. donna negotiates within the buyer's limits (section 8).
4. **if the seller agrees:** run the closing flow (section 10), then charge $3.99 when the transfer is confirmed.
5. **if no route succeeds:** close the campaign as "no response" and show the buyer the full activity log.
6. **optional:** add the domain to the expiry watch (section 11).

## 4. domain lifecycle state machine

```
created -> prechecked -> deployed (paid 4.49)
deployed -> contacting -> awaiting_reply
awaiting_reply -> followed_up -> (no_response | replied)
replied -> negotiating -> (agreed | declined | handoff_to_buyer)
agreed -> payment_pending -> transfer_pending -> completed (charge 3.99)
any state -> opted_out (owner asked to stop; suppress permanently)
no_response | declined -> (closed | expiry_watch)
```

- every state change is recorded with a timestamp and shown to the buyer as an activity timeline.
- timeouts (configurable):
  - follow-up after 4 days with no reply
  - mark no_response 7 days after the follow-up
  - mark payment_pending or transfer_pending as stale after 7 days, and alert both sides

## 5. pre-check pipeline

all steps run in parallel where possible and are cached for 24 hours per domain.

### 5.1 registration data
- look up rdap first, and fall back to whois for endings that don't support rdap.
- record:
  - the registrar
  - creation and expiry dates
  - the domain's status codes, especially `clienttransferprohibited` and `redemptionperiod`/`pendingdelete`
  - whether privacy protection is on
  - any privacy forwarding email address or registrar contact-form url
- days until expiry feed the expiry watch suggestion.

### 5.2 dns
- check the a/aaaa, cname, mx, txt and ns records.
- classify the mx provider:
  - **forwarding services (likely catch-all hobby setup):** improvmx, cloudflare email routing, registrar forwarding (namecheap, porkbun and similar), forwardemail.
  - **real mailbox (likely in use):** google workspace, microsoft 365, zoho, fastmail, proton.
- classify the ns:
  - known parking nameservers mean parked
  - registrar default nameservers mean dormant

### 5.3 website
- fetch the http and https pages with a short timeout and follow redirects.
- classify the result as one of:
  - no response
  - parked (detected by known parking services and phrases such as "this domain may be for sale" or "buy this domain")
  - for sale (a marketplace landing page such as afternic, sedo or dan; note the listed price)
  - default hosting page
  - placeholder or under construction
  - live site
- if it's live, look at signs of activity:
  - the last-modified header
  - the copyright year
  - any blog post dates
  - whether there's a contact page

### 5.4 wayback machine
- check the snapshot count and the first and last snapshot dates.
- a site that was live in the past but not now suggests an abandoned project.

### 5.5 github and public web mentions
- search github code, repos and user profiles for the domain string.
- search github pages cname files that point to the domain. these are strong evidence of ownership.
- optionally run one web search for `"domain.tld"`.
- record candidate people, each with:
  - the evidence type
  - a confidence score (section 7)

### 5.6 email checks (only if mx records exist)
- run the checks from a dedicated checking machine, never from the sending servers. a paid verification api is an acceptable alternative.
- **catch-all test:** run an smtp rcpt check against a random address such as `x7k2q9@domain`.
  - if it's accepted, the domain is a catch-all.
  - greylisting or a temporary failure means unknown, so retry once later.
- **if it's not a catch-all:** check these local parts in order:
  1. `hello`, `contact`, `mail`, `me`, `info`, `admin`, `support`, `domains`, `sales`, `webmaster`
  2. the candidate owner's first name, if found in 5.5
- **never** use `abuse@`, `postmaster@`, `hostmaster@` or `security@`, and never use addresses that look like role accounts at large organizations.

### 5.7 scores and output
- **in_use_score (0-100).** inputs:
  - live site activity
  - a real mailbox provider
  - recent wayback snapshots
  - recent github activity
- **usage status** from in_use_score:
  - unused: under 25
  - lightly used: 25-60
  - actively used: over 60
- **reachability_score (0-100).** inputs:
  - the number and quality of verified contact routes
- **estimated chance of success:** a simple rule-based formula at first, later tuned on real outcomes.
- **flags:**
  - listed for sale on a marketplace (show the price; donna may still try a direct offer)
  - in its redemption or pending-delete period (suggest the expiry watch instead)
  - restricted ending (section 12)
  - possible trademark issue (section 13)

## 6. contact routes (priority order)

donna works through these routes in order, at most one active route at a time. she moves to the next one only after the current route reaches no_response or bounces.

1. **verified owner email from strong evidence:** a confident github or whois match, or an address listed on the site itself.
2. **catch-all domain email:** send once, to `hello@` (or `contact@` if the site uses it).
3. **verified common address:** the best address that passed the check in 5.6.
4. **privacy forwarding email** from the registration data.
5. **registrar contact form.** fill it in with a browser automation step, solving captchas only where that's allowed. otherwise hand the form to the buyer.
6. **site contact form,** if one exists.
7. **buyer-sent handoff (optional paid add-on):** show the buyer contact routes donna can't automate, such as social profiles, with a ready-to-send message. donna never sends automated dms on social platforms.

**limits per deployment:**
- at most 3 routes
- at most 2 messages per route
- at most 6 messages in total

every route counts against the owner's opt-out status. an opt-out on any route stops the whole campaign.

## 7. confidence that a contact is the owner

| evidence | confidence |
|---|---|
| email address in the unredacted whois/rdap record | 0.95 |
| github pages cname pointing to the domain, in the user's own repo | 0.85 |
| email listed on the domain's own website | 0.85 |
| github profile "website" field set to the domain | 0.7 |
| domain mentioned in the user's own repo readme | 0.5 |
| domain mentioned in a fork, an issue or someone else's repo | 0.15 (do not use) |

- at confidence below 0.7, the first message asks "are you the owner of x?" instead of making an offer.
- below 0.4, don't use the route at all.

## 8. outreach and negotiation

### 8.1 message rules
- use plain text with no links, images or tracking pixels in the first message.
- the subject line should be short and specific, for example: `question about example.com`.
- keep the body to 80 words or fewer.
- the body must include:
  - that donna is an ai agent acting for a buyer
  - the domain name and a concrete offer (or the ownership question)
  - that the buyer pays the owner directly
  - an easy way to opt out, such as "reply 'no' and i won't contact you again."
  - a real postal address and a sender identity, as required by can-spam
- don't use pressure tactics, false urgency, made-up competing offers or flattery about the domain's value.

**example first message:**
> hi, i'm donna, an ai agent helping a buyer who'd like to purchase example.com. they're offering $30, paid directly to you, and i can walk you through the transfer, which takes about 5 minutes. interested? if not, just reply "no" and i won't contact you again.

### 8.2 negotiation policy
- **inputs from the buyer:**
  - opening_offer
  - max_offer (a hard ceiling donna never reveals)
  - an optional "walk-away message"
- **default strategy:**
  - open at the opening_offer (default: about 60% of max_offer).
  - make at most 2 counter-offers, each moving toward max_offer in smaller steps.
- **if the seller's ask is at or below max_offer:** accept it.
- **if the seller's ask is above max_offer:** reply once at max_offer as the final offer. if the seller still declines, use handoff_to_buyer.

### 8.3 classifying replies
sort each reply into one of these intents:

| intent | action |
|---|---|
| accept | run the closing flow (section 10). |
| counter (with an amount) | apply the negotiation policy (8.2). |
| question | answer from the allowed faq. if the question isn't covered, hand off to the buyer. |
| not_owner | mark the route dead and move to the next one. |
| decline | close politely and record it. |
| opt_out | suppress permanently and stop the campaign. |
| hostile | stop and suppress. |
| auto_reply | ignore it and keep the timers running. |
| bounce | mark the route dead. |
| unclear | hand off to the buyer. |

## 9. handing back to the buyer

donna stops and hands the conversation to the buyer when:
- the seller's final ask is above max_offer
- the seller asks something outside the faq (legal, tax, identity or custom terms)
- the seller asks for a call or a human
- the seller wants a payment method or terms outside the supported list
- the classifier has low confidence or the reply is "unclear"
- the domain looks like a trademark or brand dispute

**what the buyer gets at handoff:**
- the full conversation thread
- a summary
- a suggested reply
- one-click options: "raise max to $x", "send final offer" or "close"

## 10. closing the deal (no escrow, buyer pays seller directly)

1. **confirm the agreed terms in writing to both sides:** the domain, the price and the payment method.
2. **payment methods to recommend:**
   - paypal goods & services (preferred, because it includes buyer protection)
   - wise
   - any other method the buyer and seller agree on, chosen at the buyer's own risk
3. **order to suggest: the transfer starts first, then the payment.** choose one of:
   - **push transfer within the same registrar** (simplest): the seller pushes the domain to the buyer's account at the same registrar. the buyer pays once the push is accepted.
   - **transfer with an auth code:** the seller unlocks the domain and sends the code. the buyer starts the transfer, then pays. the domain arrives after the registrar's transfer period.
4. **donna gives the seller step-by-step guides for each major registrar:**
   - how to turn off the transfer lock
   - how to get the auth code
   - how to push the domain to another account
5. **detect completion:**
   - check rdap regularly for a change of registrar or registrant.
   - or wait for the buyer to confirm receipt.
6. **when completed:**
   - charge the $3.99 completion fee
   - mark the deal completed
   - send both sides a thank-you message

**note:** some registrars block transfers for 60 days after a registration or registrant change. detect this and tell both sides.

## 11. expiry watch (fallback)

- for no_response or declined deals, offer to watch the domain's expiry date, either free or as an upsell.
- check rdap status daily as the expiry date approaches.
- when the domain enters `pendingdelete`, alert the buyer and point them to backorder or drop-catching services.
- building your own drop-catching is out of scope for v1.

## 12. domain hack finder

### 12.1 generating candidates
- normalize the input: lowercase it and strip spaces and punctuation, but keep hyphens as an option.
- for each iana tld that matches the end of the string, split the string into `label.tld`. the label must be at least 1 character.
- also try splits with a subdomain or path, such as `de.licio.us` style, but rank them lower.
- **rank results by:**
  - fewer dots
  - a tld that's open to register
  - lower price
  - a recognizable label
- load the tld list from the iana list and the public suffix list, and refresh it weekly.

### 12.2 availability
- check rdap first, then fall back to whois. use ns or soa presence as a quick hint.
- cache results: 1 hour for available names, 24 hours for taken ones.
- rate-limit by ip and by session.

### 12.3 tld metadata table (maintained by hand)
track these fields for each tld:
- `registrable_publicly` (bool)
- `restriction` (none / local_presence / residency / closed)
- `restriction_note`
- `risk_note`
- `typical_price`
- `renewal_price`
- `rdap_supported` (bool)
- `tld_type` (cctld / gtld_legacy / gtld_new / sponsored / brand / infrastructure / web3)
- `operator_country` (cctlds only)
- `google_treats_as_generic` (bool, cctlds only, see 12.6)
- `radar` (the axis scores and citations from section 12.5)

**examples to seed (check each one before launch):**

| tld | type | status | note |
|---|---|---|---|
| .er | cctld | closed | not open to public registration |
| .us | cctld | local_presence | requires a us nexus |
| .ca | cctld | local_presence | canadian presence requirements |
| .eu | cctld | residency | eu/eea residency or citizenship |
| .ie | cctld | local_presence | document-checked connection to ireland |
| .de | cctld | verification | holder verification under nis2 |
| .au | cctld | local_presence | australian presence |
| .io | cctld | none | flag: possible future change after the chagos sovereignty transfer |
| .ly | cctld | none | flag: history of registry and political issues |
| .in | cctld | none | open; check renewal pricing |
| .com | gtld (legacy) | none | baseline |
| .dev | gtld (new) | none | https-only (hsts preloaded) |
| .gov / .edu / .mil | sponsored | closed | eligible institutions only |
| .google and similar | brand | closed | owned by a single company |
| .arpa | infrastructure | closed | never shown |

- hide closed tlds entirely, or show them grayed out as "not registrable".
- show a badge on restricted tlds.


### 12.4 tld types (how results are divided)

| type | what it is | how the finder treats it |
|---|---|---|
| cctld | two-letter country code (.in, .io, .ly, .er) | most hacks come from here. show the operator country, the barrier and the sovereignty or registry risk. |
| legacy gtld | .com, .net, .org, .info and similar | treat as the baseline. rarely useful for hacks. |
| new gtld | .dev, .xyz, .top, .click, .app and so on | wide price range and the widest spread of abuse rates. the radar matters most here. |
| sponsored (stld) | .gov, .edu, .museum, .aero and similar | usually restricted. show grayed out with the eligibility rule. |
| brand tld | .google, .apple and similar | closed. hide, or show as "not registrable". |
| infrastructure | .arpa | never shown. |
| web3 | .eth, .x, .crypto and similar (section 12.7) | hidden by default. shown only when the user turns on the web3 toggle, and always labeled. |

- source the type from the iana root zone database, which already lists country-code, generic, sponsored and infrastructure types. brand tlds and web3 namespaces need extra manual tagging.

### 12.5 tld risk radar (existing: thetldradar)

donna doesn't build her own tld risk radar. one already exists: `thetldradar` (github.com/tinkrland/themailtell, `thetldradar` branch). donna reads from it, keeps its citations and dates exactly as they are, and shows its data as a small radar chart beside each hack result. donna's own work sits on top of it (section 12.5.1).

**what the existing radars cover:**
- **spamhaus, interisle, google, microsoft and meta** measure abuse in bulk. they score what shows up in their feeds, which is mostly scammers buying domains by the dozen through apis.
- **thetldradar** covers the gap they leave: the human path, where someone buys one or two domains at a consumer registrar on a sale price. it tracks the abuse band, price pressure (first-year price against renewal price at named registrars), registration barriers and registration age, with every row cited and dated.
- **both** score a tld or a whole domain. neither looks at a name *as a hack*.

**radar axes donna shows from the existing data (each 0-100, higher means more risk or friction):**

1. **abuse band.** where a cited dataset (spamhaus's worst-tld lists, interisle's phishing landscape report) places the tld, with the snapshot date. keep rates and raw counts separate. .com has the most malicious domains by raw count only because it's the biggest tld; by share it's ordinary.
2. **price pressure.** observed first-year versus renewal prices at named registrars, each with its own observation date. a very cheap first-year price against a much higher renewal raises the risk of churn and abuse. interisle reports that the tlds with the highest abuse share were mostly priced at $2 or less.
3. **registration barrier.** open, local presence, residency, verification or closed. a barrier lowers the abuse prior, because cheap promos can't push registrations past a gate the registry runs.
4. **platform flag risk.** how likely the tld is to be treated with suspicion by:
   - social link sharing (meta and others)
   - email spam filters
   - browser safe-browsing warnings
   this is a tld-level prior drawn from the abuse band, not a check of a specific domain.
5. **registry and sovereignty risk.** political, registry-operator or policy changes, such as .io and .ly.
6. **renewal cost.** long-term cost of keeping the domain, separate from the first-year price.

**display rules:**
- show the snapshot date and source on every axis. mark rows with no verification date as "unverified".
- re-check on each row's own schedule. price observations go out of date within weeks, while abuse bands go out of date over months.
- the radar describes tld economics and gates. it never makes a judgment about a specific registrant. copy should say things like "this tld is often filtered," never "this owner is a spammer."
- a domain's own registration age is evidence too, read from its creation date at lookup time. an older domain has paid real renewal fees, which weakens the cheap-promo prior. age is always combined with the other signals: old doesn't mean clean, and new doesn't mean bad.

**per-domain checks (for the pre-check and taken hacks only):**
- google web risk api. for commercial use, the free safe browsing lookup api is non-commercial only, so check the licensing.
- spamhaus dbl. free only for low-volume, non-commercial use, so a commercial data feed may be needed.
- there's no public api for meta's link blocklist. use the tld-level prior, and optionally a manual check with meta's sharing debugger.
- a listed domain gets a red "flagged" badge. warn the buyer before any deployment, since a flagged domain may be unusable for email or social links even after purchase.


### 12.5.1 how donna's domain hack view differs

risk radars ask whether a tld or a domain is risky. donna asks a different question: does this hack work as a name? in a hack the tld is chosen for its letters, not its meaning, so a set of problems shows up that tld-level radars don't cover. donna adds a separate **hack fit score** beside the risk radar. it never replaces the radar.

**what donna adds for domain hacks:**

1. **scoring the split, not just the tld.**
   - does the dot fall at a natural break, like `deli.cious`, or split the word awkwardly?
   - how many dots are there?
   - how much of the word sits in the tld?
   - fewer dots and a natural break score higher.
2. **the dotless twin.** people who hear or remember a hack often type it without the dot (the whole word plus .com). donna checks that twin:
   - who owns it, and is it parked?
   - is it flagged in the radar or the per-domain checks?
   a flagged twin means some of your visitors land somewhere unsafe, so show it as a warning.
3. **gates matter more for hacks.** people pick a cctld for its letters, so most hack buyers don't live in that country. barriers, local-presence rules, sovereignty risk and google geotargeting (section 12.6) carry more weight in the hack fit score than they would for an ordinary domain.
4. **registries that only sell under a second level.** some cctlds only sell names under a second level such as `.com.xx`, which breaks the hack. detect this from the registry rules and the public suffix list, and mark the hack "not possible as written".
5. **short-label rules and premium pricing.** hacks often produce very short labels, which registries may:
   - ban (minimum length rules)
   - reserve
   - sell at premium prices
   check the real price at the registrar, not the tld's typical price.
6. **clashes with file extensions and commands.** tlds like `.zip`, `.mov`, `.sh`, `.py`, `.md` and `.rs` read like file names. they can trigger security warnings, confuse people and get filtered. flag them separately from the abuse band.
7. **autolinking.** many chat apps, social posts and email clients only turn text into a link for tlds they recognize. test whether `label.tld` becomes a clickable link without `https://` in common linkify libraries, and flag it when it doesn't.
8. **email fit.** check that an address like `name@label.tld` reads cleanly. combine that with the radar's spam-filter risk, since a hack is often meant to be the email domain too.
9. **the say-it-aloud test.** can someone say the hack and have the listener type it correctly? score hacks lower when the spoken version is ambiguous.
10. **trademarks and look-alikes across the dot.** a brand split across the dot (`goo.gle` style) slips past simple trademark matching. match against the joined string. also check internationalized and look-alike characters (homographs).
11. **subdomain and path hacks.** for `de.licio.us` or `repl.it/...` style hacks, make clear the buyer only owns the registrable part. the hack depends on that part staying owned and renewed.
12. **renewal cost over time.** hack tlds are often small cctlds with steep renewals, so show the 3-year cost of keeping the domain next to the first-year price.
13. **web3 twin.** when the web3 toggle is on, show whether the same hack exists as a web3 name (section 12.7), labeled separately.

**display:** every hack result shows two things:
- the **risk radar**, drawn from the existing data
- the **hack fit score**, donna's own, with a short reason for each penalty, for example "dotless twin is flagged" or "won't autolink in chat apps"

as with the radar, hack fit describes the name and the tld's economics. it never makes a judgment about an owner.

### 12.6 search and ranking impact

- show whether google treats a cctld as geotargeted or as generic. google publishes a list of cctlds it treats as generic, such as .io, .co, .me, .tv and .ai. any other cctld is assumed to target its country, which can affect search reach outside that country.
- show this as a simple note on each result, for example "search: generic" or "search: geotargeted to india (.in)."
- don't claim any tld ranks better in itself. show only the documented geotargeting behavior plus the radar's platform flag risk.

### 12.7 web3 names

some hacks don't exist in normal dns but can be claimed in web3 naming systems. for example:
- `te.eth` (ens)
- `rela.x` (unstoppable domains)

**the toggle:**
- when the finder shows hack recommendations for a keyword, it shows a toggle above the results: **"don't need this to open in a normal browser? see web3 domain hacks too."**
- it's **off by default**, so normal users only see dns domains that work everywhere.
- when it's on:
  - web3 hacks for the same keyword are added to the results
  - they're grouped below the normal results under a "web3 domain hacks" heading, or interleaved with a clear badge; never unlabeled
  - each has a "web3" badge and the namespace (ens, unstoppable and so on)
- remember the toggle state for the session and keep it in the url (for example `?web3=1`) so shared links show the same results.
- only run web3 availability lookups when the toggle is on, which keeps the free finder cheap.
- if a keyword has a web3 hack but no good dns hack, show a soft hint to turn the toggle on, for example "1 web3 hack found for this keyword".

**rules:**
- label every web3 result: "web3 name: doesn't open in a normal browser without a wallet, extension or gateway, and can't be used for normal email."
- supported namespaces to start:
  - **ens** (.eth): check availability through the ens registrar contract or subgraph. ens charges yearly rent.
  - **unstoppable domains** (.x, .crypto, .nft, .wallet and others): check through their api. it's a one-time mint with no renewals.
- other systems (handshake, freename and so on) can be added later.
- add a collision warning: a web3 ending can clash with a future icann tld of the same name, which can break or devalue it.
- if a web3 name is taken, link to its public marketplace listing if there is one. donna's outreach doesn't apply to web3 names in v1, because ownership is a wallet address, not a contactable person.
- add the extra radar fields for web3: chain, renewal model (rent or one-time) and collision risk.

## 13. compliance and risk

- **saying donna is a bot:** always disclose it. this keeps you safe under california's law on bots used for selling or persuasion and laws like it.
- **anti-spam (can-spam, plus gdpr/pecr for eu and uk contacts):**
  - send one-to-one messages about a specific domain, not bulk marketing
  - include an opt-out
  - include a physical address
  - keep a lawful-basis note (legitimate interest)
  - keep a permanent opt-out list across all buyers
- **data protection:**
  - keep the personal data you collect from the pre-check to a minimum.
  - delete contact data 90 days after a campaign closes.
  - publish a privacy policy that covers outreach recipients.
- **trademark screening:**
  - block or warn when the domain matches a well-known brand, using a list plus a fuzzy match.
  - require the buyer to confirm they have a legitimate use.
- **platform rules:**
  - send no automated messages on social platforms.
  - follow the github api rules and rate limits.
  - respect the terms of registrar contact forms.
- **chargebacks:**
  - show the buyer the activity log.
  - make the terms clear before payment: the deploy fee pays for the attempt, not the result.
  - keep evidence for disputes.

## 14. payments (stripe)

- **deploy:** a $4.49 paymentintent with `setup_future_usage=off_session`.
- **completion:** a $3.99 off-session charge on the saved payment method. if it fails, send the buyer an email with a payment link.
- **optional credit packs** to cut down on per-charge fees, for example:
  - 3 deploys for $12
  - 10 deploys for $35
- **refund policy (shown before payment):** the deploy fee isn't refundable once outreach has been sent. it's refunded automatically if the pre-check data was wrong in a way that stopped all outreach (no route was ever sent).

## 15. architecture (bootstrapped)

### frontend
- next.js (or similar) on `{brand_domain}`, with these pages:
  - the hack finder
  - the pre-check
  - the buyer dashboard (deal timeline and handoff inbox)

### backend
- a single api service plus a job queue (bullmq, or a postgres-based queue).

### workers
- `precheck` (parallel subtasks: rdap, dns, http, wayback, github, smtp)
- `outreach_sender`
- `reply_ingest` (inbound email webhook)
- `classifier_negotiator` (llm)
- `transfer_monitor`
- `expiry_watch`
- `tld_radar_sync` (weekly sync of the iana list and the existing thetldradar data; donna doesn't maintain her own copy)
- `hack_fit` (scores each hack: split, dotless twin, autolinking, file extension clash and so on)
- `web3_availability` (ens and unstoppable lookups; only runs when the web3 toggle is on)

### email
- donna sends as donna@ on 2 or more dedicated outreach domains, which are not `{brand_domain}`:
  - spf, dkim and dmarc set up
  - warmed up gradually
  - per-domain daily caps
- inbound replies come through a webhook (postmark, ses or mailgun inbound).
- bounce and complaint handling feeds the suppression list automatically.

### other services
- **smtp checks:** a separate small vps or a verification api, rate-limited per target mx.
- **llm:** a small, cheap model for writing messages and classifying replies. use structured json outputs, and template the messages with variables to cut tokens and keep tone consistent.

### storage
- postgres, with these tables:
  - `users`
  - `domains`
  - `prechecks`
  - `contact_routes`
  - `campaigns`
  - `messages`
  - `events`
  - `suppressions`
  - `tld_meta`
  - `payments`

### observability
- keep a per-campaign event log, which is also what the buyer sees.
- run deliverability dashboards: bounce rate, spam complaints, reply rate.

## 16. key data models (simplified)

```
domain { id, fqdn, tld, registrar, created_at, expires_at, status_codes[], privacy:boolean, mx_provider, in_use_score, reachability_score, last_prechecked_at }
contactroute { id, domain_id, type: whois_email|privacy_forward|catchall|common_address|github_owner|site_email|registrar_form|site_form|buyer_handoff, address_or_url, confidence, verified:boolean, priority, state }
campaign { id, buyer_id, domain_id, opening_offer, max_offer, state, current_route_id, deploy_payment_id, completion_payment_id, created_at }
message { id, campaign_id, route_id, direction: out|in, body, intent?, sent_at }
suppression { id, email_or_domain, reason: opt_out|bounce|complaint|hostile, created_at }
tldmeta { tld, tld_type, operator_country?, google_treats_as_generic?, registrable_publicly, restriction, restriction_note, risk_note, typical_price, renewal_price, rdap_supported }
tldradar { tld, abuse_band, abuse_citation, abuse_verified_on?, price_observations: [{ registrar, first_year, renewal, observed_on, citation }], barrier, platform_flag_risk, registry_risk, recheck_cadence, notes }
hackfit { candidate, split_naturalness, dot_count, dotless_twin: { fqdn, status, flagged }, second_level_only, label_rule_issue?, premium_price?, file_extension_clash, autolinks, email_fit, spoken_clarity, trademark_joined_match, idn_confusable, hack_kind: label|subdomain|path, renewal_3yr, score, reasons[] }
web3name { name, namespace: ens|unstoppable|other, chain, renewal_model: rent|one_time, collision_risk, available, marketplace_url? }
```

## 17. unit economics (target)

| item | target cost |
|---|---|
| pre-check per domain | under $0.01 |
| llm per campaign (messages and classification) | under $0.05 |
| email sending per campaign | under $0.01 |
| stripe fees, deploy ($4.49) | about $0.43 |
| stripe fees, completion ($3.99) | about $0.42 |

revenue per deploy is $4.49, plus $3.99 for each one that completes. the business can survive a low completion rate, because the deploy fee pays for each attempt.

## 18. metrics to track from day one

- usage-status mix from pre-checks
- pre-check to deploy conversion
- reply rate by contact route type
- agreement rate and median agreed price
- completion rate, and time from agreement to transfer
- bounce rate, spam complaint rate and opt-out rate, on each sending domain
- chargeback rate
- hack finder to pre-check conversion

## 19. out of scope for v1

- escrow or holding money for buyer and seller
- your own drop-catching system
- automated social-media dms
- high-value or premium domain brokering (possibly a later human-assisted tier)
- brokering for sellers (only buyer-initiated deals)
- outreach or brokering for web3 names (shown in the finder only)

## 20. open questions

- whether to show the buyer the seller's contact info after a handoff, or keep all contact going through donna
- the exact wording of the refund policy, and a lawyer's review of the outreach compliance
- the size of the trademark blocklist, and how strict to make it
- credit pack pricing
- whether the free pre-check needs an account (for rate limiting) or can run anonymously with a captcha


- licensing for per-domain reputation checks in commercial use (google web risk, spamhaus dbl)
- the licensing and credit for reusing the `thetldradar` dataset on the public site

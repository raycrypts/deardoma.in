# deardoma.in

deardomain is a two-assistant product for people who want the right domain name: one assistant that finds **hacks** (creative domain splits), and one that **brokers** the domain you can't just buy at a registrar. it ships as a web app and a cli, sharing the same researched datasets underneath.

- **dom**, the domainhack assistant. you give it a word or phrase, it finds every way to split that word across a domain name and tells you which ones you can actually own.
- **donna**, the domain broker assistant. you point her at a taken domain, she works out who owns it, whether they're using it, contacts them politely on your behalf, and negotiates a small purchase.

both assistants cover the same ground from opposite ends: dom finds what's *available*, donna gets what *isn't*, and dom feeds donna: when a hack you want is taken, dom runs the precursor check (the free part of donna's pre-check) and hands the domain over as a ready-made campaign.

## what deardomain is

a product for the long tail of domain decisions: hobbyists, side projects, micro-brands, where a $199-minimum broker or a $2,000 aftermarket listing is nonsense. deardomain charges a flat fee per attempt with no commission on the buying cost, so its only incentive is getting you the domain at the cheapest price possible. the discovery tools that lead into the paid service are free.

the product runs on researched data, not vibes. every verdict a user sees ("this ending requires a local presence", "this registry never opens registrations", "this tld carries a risk flag") traces back to a cited, dated source.

## dom, the domainhack assistant

dom answers: *how can i spell this word as a domain?* enter a word or phrase; dom splits it against the full list of domain endings and ranks the results. dom never talks about pricing; its job is fit and ownability, not what a registrar charges.

**what dom considers:**

- **registrability first.** an ending that reads perfectly but can't be registered is never suggested. dom knows which registries never opened (.sj, .bv), which only sell third-level names (.il: you can buy co.il, not a .il root), which are closed or sanctioned (.er, .ir), which are brand-only gtlds, and it surfaces these as excluded matches with the reason, instead of silently hiding them.
- **registration barriers per registry.** local presence, residency, verification requirements, business-presence exceptions (.ie, .uk): each candidate shows its barrier and route, whether direct, intermediary/trustee (with fee), or business-presence.
- **registry premium flag.** some registries mark specific names as premium at the issuing-body level. dom can tell you a candidate is registry-premium, but never what anyone charges for it; comparing registrar prices is simply not dom's job.
- **hack fit.** whether the split reads naturally (does it survive being spoken aloud, does the dot break the word awkwardly), whether it collides with a file extension, and how it behaves in links and email addresses.
- **search and platform impact.** google treats some ccTLDs as generic, which is good for global ambitions. others are geotargeted or platform-blocked; dom annotates each candidate.
- **risk radar.** sovereignty concerns (.io, .ly), sanctions (.ru, .ir), free-registry history (.tk), discontinued endings (.su): a per-tld risk view, toggleable alongside the main results.
- **modes.** a **compare mode** for weighing shortlisted candidates side by side (barrier, fit, risk at a glance), and a **risk radar mode** for browsing endings by risk profile.

**default coverage: the latin alphabet only.** at first phase dom covers latin-script domain names, since that's where the purchasable, resolvable web is. everything else sits behind toggles (off by default):

- **web3 domain hacks**: ens and unstoppable-style namespaces, which don't open in a normal browser.
- **punycode domain hacks**: idn endings (xn--), whose rendered forms vary by browser and client and whose registries often carry their own restrictions.
- **taken domain hacks**: dom finds hacks for your keyword whether or not they're free. available ones show by default; the taken ones stay hidden until toggled, because a taken hack isn't a dead end, it's a handoff.

## donna, the domain broker assistant

donna answers: *i want this domain and it's taken; can i get it cheaply?* she's an ai agent, openly an ai, that finds the owner of a registered but unused domain, contacts them politely, and negotiates a small buyer-funded purchase.

**donna is a pipeline, not a one-shot answer.** when she works a domain, the buyer dashboard shows each step as it happens: what's being checked, what's been ruled out, what she's waiting on. buyers see the same steps the pre-check runs, then live campaign state: contacted, awaiting reply, negotiating, or done.

**what donna considers:**

- **registration state.** registrar, creation and expiry dates, and status codes, especially `redemptionperiod` / `pendingdelete`, which say a domain is lapsing and worth watching rather than buying. days until expiry feed an expiry-watch suggestion.
- **dns shape.** mx records tell her if the domain has a real mailbox (in use) or just a forwarding hobby setup; nameservers say parked or dormant.
- **the website, if any.** parked, for-sale marketplace listing (with asking price), placeholder, or live-and-active, judged from page content, last-modified headers, copyright years and blog dates.
- **history.** wayback machine snapshot counts and first/last dates: a site that was live but is gone suggests an abandoned project and a winnable owner.
- **public mentions.** github code, repos, cname files and web mentions of the domain: strong evidence for who actually owns it, each with a confidence score. she never treats someone as the owner when she's unsure.
- **contact routes.** privacy-registrar forwarding addresses, contact forms and personal email, counted and never shown before the buyer pays. she sends at most one first message and one follow-up per channel, and a "no" is respected immediately and permanently.
- **her own deliverability.** cold outreach never comes from the brand domain; sending reputation is protected as deliberately as the outreach is polite.
- **the negotiation.** buyer's maximum offer, an opening offer, and donna's estimate of a fair range for a micro-deal: a domain worth about $10, closing at $30 or less.

## how the product is built

the two assistants run as separate, independent backends (donna and dom each with their own stack, data and release cadence), fronted by one product. the tld dataset (availability, restrictions, registration routes, prices, risk flags, second-level rules, google's treats-as-generic list) is maintained through offline research passes with cited sources: registry policy pages, iana, rdap, historical whois and registrar price comparisons, then baked into the product. the research tooling used to *build* the datasets (tavily, firecrawl, browserbase, brightdata, adaptionlabs) is not part of the running product.

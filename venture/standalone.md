---
title: standalone
status: draft, waits in review
---

# deardomain

the name you want is parked. dom finds what's available, donna gets
what isn't.

deardomain is a two-assistant product for people who want the right
domain name. **dom**, the domainhack assistant: you give it a word, it
finds every way to split that word across a domain name and tells you
which ones you can actually own. **donna**, the domain broker
assistant: you point her at a taken domain, she works out who owns it,
whether they're using it, contacts them politely on your behalf, and
negotiates a small purchase. both assistants cover the same ground
from opposite ends, and dom feeds donna: when a hack you want is
taken, dom runs the precursor check and hands the domain over as a
ready-made campaign.

this is the long tail of domain decisions: hobbyists, side projects,
micro-brands, where a $199-minimum broker or a $2,000 aftermarket
listing is nonsense (root README.md). flat fee per attempt, flat fee
on completion, no commission on the buying cost, so the product's
only incentive is getting you the domain at the cheapest price
possible. exact rates are set at launch. the discovery tools that
lead into the paid service are free.

## a product, not a service

everything about deardomain is a product surface, and that is the
pricing model explained. there is no human you email, no intake call,
no quote. you sign in, you use the web app or the cli, the same
researched datasets underneath both, and every action is either free
discovery or a flat-fee campaign. the product ships as a web app and
a cli talking to two independent backends, dom and donna, each with
its own stack, data and release cadence, fronted as one product (root
README.md). when something changes in the world, a registry policy
page, a sanctions list, google's treatment of a country code, it is
handled the way a saas handles it: an offline research pass with
cited, dated sources, baked into the dataset, shipped to every user
like a release. the product runs on researched data, not vibes, and
every verdict you see traces back to a citation.

each surface also has a scoped job, enforced in code. dom never
talks about pricing: its job is fit and ownability, not what a
registrar charges, and a registry-premium name gets the badge without
a number (domainhacks branch SCOPE.md). donna never shows contact
addresses before the buyer pays; she counts routes and gates on
confidence. a reserved-mission ending (.gov, .mil, .edu, .int, .arpa)
never appears in dom's results and donna's intake refuses it outright
with the reason (src/core/reserved.ts on the donna branch). this is
what flat fees buy you: the product can afford to be disciplined
because nothing about it is hand-made.

## the moat: who is actually on the other end

the acquisition industry treats every unused-domain owner as a
professional squatter: the domainer with a portfolio, the
priced-to-sell landing page, the leverage negotiation that drags for
weeks. that assumption prices the whole industry, because you can't
afford a human doing adversarial negotiation over a name worth less
than the fee.

the assumption is also wrong for most of the market. the typical
unused domain is held by a person with one name: the side project that
ended, the idea parked for later, the renewal that auto-charged a
forgotten card. to them, a small offer is not an insult. it's found
money for a thing they were half relieved to stop paying for.

serving that person is exactly the complexity brokers skip, because at
micro-deal prices it cannot be done by hand: read the registration,
dns, the site, the wayback machine and public mentions to tell the
forgot-they-owned-it from the priced-to-sell. score how confident you
are in a candidate owner before writing, and when the evidence is
thin, ask "are you the owner?" instead of making an offer
(src/core/contact-routes.ts on the donna branch: gates at 0.7 and
0.4). a broker cannot do that per deal at this price. an agent does
the whole pre-check for about a cent (donna-spec.md §2), which is the
only reason this market can exist at all. finding out who you are
talking to is the product.

and when the other end does turn out to be the professional, the
pre-check says so: the marketplace landing page is detected, the
asking price is shown, and the buyer is pointed at the pro's number or
away, not into a fake micro-deal.

## dom, the domainhack assistant

dom answers: how can i spell this word as a domain? enter a word or
phrase; dom splits it against all 1,437 delegated endings
(data.iana.org) and ranks the results by what you can actually own.
it never talks about pricing; its job is fit and ownability.

it starts from registrability, not spelling. an ending that reads
perfectly but can't be registered is never suggested, and the excluded
matches are surfaced with the reason instead of silently hidden:
never opened (.sj, .bv), third-level-only (.il: you can buy co.il, not
a .il root), reserved-mission (.gov, .mil, .edu, .int never appear),
closed or sanctioned (.er, .ir), brand-only gtlds. each candidate
shows its registration barrier and route, direct or
intermediary/trustee with the fee, and registry-premium names carry
the badge, never a price.

then dom judges the split as a name, not just as a url, with a
say-it-aloud taxonomy that ranks how the word survives being spoken:
clean syllable boundaries first, dots that cut a single phoneme or
double a consonant flagged gently, and cluster endings the listener
must blend to reconstruct the word ranked last. multi-dot chains like
fi.ni.sh are classified as chains, not subdomains. each hack carries
its axis: linguistic, where the ending completes the word (tra.sh,
rad.io), or command, where the label is a known cli tool and the
script-suffix reading is the point (brew.sh) and the file-extension
clash is waived as a penalty, though the flag still shows, because
monty.py reads as a python file and parsers, filters and clipboards
can mangle the string.

and it tells the truth about endings that sales pages don't: google's
generic-vs-geotargeted treatment, plus a per-ending risk radar
(sovereignty concerns, sanctions, free-registry history, discontinued
endings), toggleable alongside the main results. compare mode weighs
shortlisted candidates side by side, barrier, fit and risk at a
glance; risk radar mode browses endings by risk profile.

default coverage is the latin alphabet, since that's where the
purchasable, resolvable web is. web3 and punycode hacks sit behind
off-by-default toggles, labeled for what they are. taken hacks sit
behind a toggle too: available names show by default, and a taken
hack isn't a dead end, it's a handoff. toggle it on and dom runs the
precursor check, the free part of donna's pre-check, and hands the
domain to donna as a ready-made campaign.

## donna, the domain broker assistant

donna answers: i want this domain and it's taken; can i get it
cheaply? she's a pipeline, not a one-shot answer, and the buyer
dashboard shows each step as it happens: what's being checked, what's
been ruled out, what she's waiting on.

the pre-check reads the registration state (registrar, dates, status
codes like redemptionperiod and pendingdelete), the dns shape (a real
mailbox or a forwarding hobby setup, parked or dormant nameservers),
the website if any (parked, for-sale with asking price, placeholder,
or live and active, judged from content and freshness signals), the
wayback history, and public mentions from github and the web. she
tracks domains through what the product calls domain purgatory, the
lifecycle between taken and gone: a taken-but-expiring domain is a
watch, not a dead end, and the free tier shows the rdap-visible stage
while deeper history runs in the paid pre-check (domainhacks branch
SCOPE.md, research/domain-purgatory.md). contact routes are counted
and never shown before the buyer pays. every verdict traces back to
cited, dated sources.

the outreach is polite by construction, not by policy
(donna-spec.md §2):

- donna always says she is an ai acting for a buyer. never a human.
- the first message is plain text, 80 words or fewer, no links, no
  images, no tracking pixels (donna-spec.md §8.1).
- one first message and one follow-up per contact channel. then stop,
  forever. at most 3 routes, 2 messages per route, 6 messages in total
  per deployment.
- an opt-out on any route ends the whole campaign, and the suppression
  list is permanent and shared across all buyers: say no once, and no
  buyer can ever send donna back.
- a real postal address in every message, as can-spam requires.
- cold outreach never comes from the brand domain; sending reputation
  is protected as deliberately as the outreach is polite.

the negotiation runs inside limits you set: an opening offer
(defaulting to about 60% of your maximum), at most two counters in
shrinking steps (25% then 15% of the remaining gap,
src/core/negotiation.ts on the donna branch), and a hard ceiling that
is never revealed and never exceeded. if the seller's ask goes above
it, she stops and hands the thread to you. the suggested closing
order is transfer first, payment second, with registrar walkthroughs
and rdap monitoring until the registrant changes. when a campaign ends
without a deal, the expiry watch follows the domain through purgatory
to its drop date and tells you when to backorder.

you are never in the money flow with us. you pay the seller directly,
through paypal, wise, or whatever you both agree. deardomain charges
its flat fees and touches nothing else, which is why there's no
escrow theater and no money-transmitter fine print.

## who it is for

the wedge is the indie founder or side-project maker who found the
exact right name, found it parked under a privacy wall, and has a
budget in coffee money, not broker retainers. everyone below is
welcome, in the order their pain arrives.

- **the maker with the taken name.** donna's pre-check says whether
  it's worth asking and what to offer. most of the time it isn't, and
  that answer is free.
- **the hack hunter.** dom does the splitting, scoring and
  truth-telling about endings, so the clever name you found doesn't
  come with a trustee-fee surprise or a geotargeting footnote. when
  the perfect split is taken anyway, the same results page leads into
  donna's ask-the-owner service.
- **the returner.** you let a name lapse once. the expiry watch means
  it never happens silently again.
- **the consolidator.** you own the .com, you want the .net and the
  .io sitting idle in someone else's account, at micro-deal prices.

not for: trademark disputes, four-figure negotiations, professional
portfolio holders who know what they're sitting on, reserved-mission
endings. the pre-check flags the first three and hands them back
(donna-spec.md §9, §13), and the last is refused at intake
(src/core/reserved.ts on the donna branch).

## the honest limits

- the deploy fee pays for the attempt, not the result. it's refunded
  only if the pre-check was wrong in a way that stopped all outreach
  (donna-spec.md §14).
- many campaigns will end in no response. the pre-check estimates the
  odds up front; believe it.
- no escrow. the buyer pays the seller directly. you are trusting a
  stranger to the extent the payment method protects you; we recommend
  ones that protect.
- some registrars lock transfers for 60 days after a registration or
  registrant change. donna detects it and tells both sides
  (donna-spec.md §10).
- dom shows no prices anywhere: fit and ownability, never what a
  registrar charges. the free purgatory view shows only the
  rdap-visible stage; deeper history is a paid signal.
- dom's default coverage is latin-script only; web3, punycode and even
  taken hacks sit behind labeled, off-by-default toggles.
- donna won't chase web3 names in v1, won't send automated social dms
  ever, and won't contact anyone on the suppression list.
- she is an ai, in every message, by law and by preference. california
  requires bots in sales conversations to say so (donna-spec.md §13;
  needs full read before publishing).

## about the name

every outreach message is, literally, a letter to a domain: dear
domain, someone wants you. donna signs it. dom is the domain in every
hack. and the product's own address, deardoma.in, is a domain hack
itself, which is the short version of the whole pitch. the brand lives
in the names, not in the spelling of the address, so the brand can
move house without breaking anything it promised (donna-spec.md §1).

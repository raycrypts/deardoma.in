---
title: standalone
status: draft, waits in review
---

# dear domain

the name you want is parked. donna writes the letter.

dear domain is a tiny acquisition service for micro-deals: a domain
worth about $10, bought for $30 or less from an owner who isn't using
it. the product is an ai agent named donna. you point her at a domain.
she works out who owns it, writes to them politely, negotiates a small
price inside limits you set, and walks both sides through the payment
and the transfer. you never send the awkward email. you never haggle.
you read the timeline.

## the moat: who is actually on the other end

a broker's playbook is written against the professional squatter: the
domainer with a portfolio, the priced-to-sell landing page, the
leverage negotiation that drags for weeks. that assumption prices the
whole industry. minimum fees start around $199 (donna-spec.md §1, the
spec's market thesis; needs verification against live broker pricing
before publishing), because you can't afford a human doing adversarial
negotiation over a name worth less than the fee.

the assumption is also wrong for most of the market. the typical unused
domain is held by a person with one name: the side project that ended,
the idea parked for later, the renewal that auto-charged a forgotten
card. to them, $30 is not an insult. it's found money for a thing they
were half relieved to stop paying for.

serving that person is exactly the complexity brokers skip, because at
$30 a deal it cannot be done by hand: read the registration, dns, the
site, the wayback machine and public mentions to tell the
forgot-they-owned-it from the priced-to-sell. score how confident you
are in a candidate owner before writing, and when the evidence is
thin, ask "are you the owner?" instead of making an offer
(src/core/contact-routes.ts on the donna branch: gates at 0.7 and
0.4). a broker cannot do that per deal at this price. an agent does
the whole pre-check for about a cent (donna-spec.md §2), which is the
only reason this market can exist at all.

and when the other end does turn out to be the professional, the
pre-check says so: the marketplace landing page is detected, the
listed price is shown, and the buyer is pointed at the pro's asking
price or away, not into a fake micro-deal.

## how it maps to a real acquisition

the product is organized the way a small acquisition is staffed. every
role is its own system, so none of them can exceed its brief:

- **the scout.** the free pre-check: registration data, dns, the site
  itself, the wayback machine, github and public mentions. read
  together, they say whether a domain is unused, lightly used or
  actively used, who likely holds it and how confident we are, and
  what a fair band would be. contact routes are counted for you, never
  exposed.
- **the letter writer.** donna's first message is plain text, 80 words
  or fewer, no links, no images, no tracking pixels (donna-spec.md
  §8.1). it says she is an ai acting for a buyer, names the offer, and
  makes "no" the easiest reply in the inbox.
- **the negotiator.** she opens around sixty percent of your ceiling,
  counters at most twice, each step smaller (25% then 15% of the
  remaining gap, src/core/negotiation.ts on the donna branch), and
  never reveals your maximum. if the seller's ask is above it, she
  stops and hands the thread to you.
- **the closer.** the suggested order is transfer first, payment
  second: a registrar push or an auth code, then the money. donna
  gives step-by-step guides per registrar and watches rdap until the
  registrant changes.
- **the watchman.** when a campaign ends without a deal, the expiry
  watch follows the domain to its drop date and tells you when to
  backorder, instead of pretending a dead negotiation was the only
  shot.
- **the map room.** the free domain hack finder, there for the times a
  better name exists that nobody has to be asked for.

that separation is the whole idea. a human broker improvises; a script
you're scared to run skimps. donna keeps the roles apart and the
limits in code, so politeness isn't a policy document, it's a state
machine.

## politeness, enforced by the state machine

the ethics are the brand, and they are non-negotiable in the build
(donna-spec.md §2):

- donna always says she is an ai acting for a buyer. never a human.
- one first message and one follow-up per contact channel. then stop,
  forever. at most 3 routes, 2 messages per route, 6 messages in total
  per deployment.
- an opt-out on any route ends the whole campaign, and the suppression
  list is permanent and shared across all buyers: say no once, and no
  buyer can ever send donna back.
- no pressure tactics, no invented competing offers, no flattery about
  the domain's value.
- a real postal address in every message, as can-spam requires.

no model weights decide to try harder. the campaign ends because the
code says it ends.

## what you get

- **the free pre-check.** a usage status, who likely holds it, contact
  routes counted, an estimated chance of success, a suggested price
  band. about $0.01 to run, so it can be honest and free.
- **the deployment.** $4.49, one campaign. donna works the routes in
  priority order, gated by confidence in each owner match.
- **the negotiation.** opening offer, at most two shrinking counters,
  a final offer at your ceiling. a hard maximum she never reveals and
  never exceeds.
- **the closing.** written terms to both sides, transfer before
  payment, registrar walkthroughs, rdap monitoring until the domain
  moves. $3.99 only when the deal actually closes.
- **the timeline.** every state change, timestamped, shown to you. if
  nothing comes back, you see exactly what was tried and when.
- **the fallback.** no deal: the expiry watch tracks the domain to the
  drop.

and you are never in the money flow with us. you pay the seller
directly, through paypal, wise, or whatever you both agree. dear
domain charges its two fees and touches nothing else, which is why
there's no escrow theater and no money-transmitter fine print.

## one search, every name

before donna asks anyone for anything, the free hack finder checks
whether a better answer is available now: your word split across all
1,437 delegated endings (data.iana.org), each split scored for whether
it works as a name, not just as a url. does the dot fall at a natural
break? does the dotless twin belong to someone flagged for abuse? will
chat apps even autolink it? does it read cleanly as an email address?
can you say it aloud and have someone type it right? does the ending
look like a file that triggers security filters?

and it tells the truth about endings that sales pages don't: which
countries require local presence, which endings are sanctioned or
browser-flagged, which registries only sell under a second level, what
the renewal costs after the sale price, and how google treats each
country code for search. the risk data is thetldradar's, a cited
public dataset, kept exactly as published (donna-spec.md §12.5). web3
names exist behind an off-by-default toggle, labeled for what they
are: they don't open in a normal browser and can't take normal email.

available? a registrar link. taken? "want it anyway? have donna ask
the owner for $4.49."

## who it is for

the wedge is the indie founder or side-project maker who found the
exact right name, found it parked under a privacy wall, and has a
budget in coffee money, not broker retainers. everyone below is
welcome, in the order their pain arrives.

- **the maker with the taken name.** the pre-check says whether it's
  worth asking and what to offer. most of the time it isn't, and that
  answer is free.
- **the hack hunter.** the finder does the splitting, scoring and
  truth-telling about endings, so the clever name you found doesn't
  come with a renewal surprise or a geotargeting footnote.
- **the returner.** you let a name lapse once. the expiry watch means
  it never happens silently again.
- **the consolidator.** you own the .com, you want the .net and the
  .io sitting idle in someone else's account, at micro-deal prices.

not for: trademark disputes, four-figure negotiations, professional
portfolio holders who know what they're sitting on. the pre-check
flags all three and hands them back (donna-spec.md §9, §13).

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
- donna won't chase web3 names in v1, won't send automated social dms
  ever, and won't contact anyone on the suppression list.
- she is an ai, in every message, by law and by preference. california
  requires bots in sales conversations to say so (donna-spec.md §13;
  needs full read before publishing).

## about the name

every outreach message is, literally, a letter to a domain: dear
domain, someone wants you. donna signs it. the brand lives in the
names, not in the spelling of the address, so the brand can move house
without breaking anything it promised (donna-spec.md §1).

pricing beyond the two fees: to be set at launch.

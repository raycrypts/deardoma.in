---
title: problems
status: draft, waits in review
---

# the problems donna targets

one file, one list: every pain here is something a buyer can name in a
sentence. each entry is the pain, then the assistant's answer to it.

## the name i want is parked

the site says "this domain may be for sale" or shows nothing at all,
the whois is behind privacy, and there is no human in sight. the
perfect name is worth $30 to you and unreachable to you.

the answer: the free pre-check reads the registration data, the dns,
the site itself, the wayback machine and public mentions, and comes
back with what a broker would open with: unused or in use, who likely
holds it, contact routes counted, and a fair price band. nobody is
paid a finder's fee for finding out it's hopeless; that answer is
free.

## the industry assumes i'm bidding against a squatter

every broker's playbook is written for the professional: the domainer
with a portfolio, the priced-to-sell landing page, the leverage
negotiation. so the minimum fee starts around $199 (root README.md)
and everything below that has no market at all. but the typical unused
domain isn't held by a professional. it's held by a person with one
name, who forgot it was renewing, and who would take $30 and feel
clever about it.

the answer: the pre-check's whole job is telling the two apart. the
forgot-they-owned-it shows a forwarding mailbox, a dead github
project, a wayback trail that stops. the professional shows a
marketplace landing page and a listed price, which is detected and
shown as what it is (donna-spec.md §5.3, §5.7). the pitch, the tone
and the price are sized for the person, and the pro is handed back
instead of played.

## i don't know what to offer

offer $10 and you look unserious. offer $100 and you overpaid for a
parked page. you have no idea what the owner values it at, and neither
does the owner.

the answer: the pre-check suggests a price band from the usage
evidence, and the negotiation engine runs inside limits you set: an
opening offer (defaulting to about 60% of your maximum) and a hard
ceiling that is never revealed and never exceeded, with at most two
counters in shrinking steps (donna-spec.md §8.2).

## i don't want to cold-email a stranger

someone has to find the address, write the message, and be the person
emailing a stranger out of nowhere to ask for their property. most
people never send the email. the name stays parked.

the answer: donna writes it. plain text, 80 words or fewer, no links,
no tracking pixels, a concrete offer, and an easy exit: reply "no" and
she never contacts them again. the awkward part is the product, and
it is done politely by a machine that cannot take rejection
personally.

## wait, is this a scam

an unsolicited message offering to buy your domain is the exact shape
of a phishing attempt. any honest buyer-acquisition service has to
survive being read as the thing it isn't.

the answer: donna says she is an ai acting for a buyer in every
message, because it's true and because california requires bots in
sales conversations to disclose (donna-spec.md §13; needs full read
before publishing). no links in the first message. a real postal
address, as can-spam requires. the buyer pays the seller directly
through a normal payment method; deardomain never touches the money.
an owner who wants out says one word and is suppressed permanently
across every buyer. and when the evidence for who owns the domain is
thin, the first message asks "are you the owner?" instead of making
an offer (confidence gates at 0.7 and 0.4, src/core/contact-routes.ts
on the donna branch).

## they said no and now it's awkward to keep watching

the owner declines or vanishes, and the domain still expires someday.
you have to remember to check, every year, forever.

the answer: the expiry watch, and the product's own view of the
domain lifecycle, domain purgatory. rdap status is classified into
stages (auto-renew grace, redemption, pending delete) and checked
daily as the expiry date approaches, and when the domain enters
pendingdelete, you get pointed at backorder and drop-catching
services. taken-but-expiring is a watch, not a dead end; no response
isn't a dead end either. it's a calendar entry.

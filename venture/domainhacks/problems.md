---
title: problems
status: draft, waits in review
---

# the problems dom targets

one file, one list: every pain here is something a name-hunter can name
in a sentence. each entry is the pain, then the assistant's answer to
it.

## every good word on .com is taken

you wanted a name, not a lawsuit with a hyphen. the aftermarket is a
bazaar and the registrars only sell what's left.

the answer: dom splits your word against all 1,437 delegated endings
(data.iana.org) and ranks the results by what you can actually own.
the clever name you didn't think of is in the list; the ones that
read perfectly but can't be registered are shown as excluded matches
with the reason, instead of silently hidden.

## the hack that costs more than it looks

the sale price is $3 and the renewal is $60. or the ending needs a
local presence you don't have, and the trustee fee is the real price
of the name. checkout pages don't do this math for you.

the answer: each candidate shows its registration barrier and route,
direct or intermediary/trustee with the fee (research/
cctld-intermediaries.json, 142 endings, per-registry citations), plus
the cheapest observed registration and renewal price, so a hack's
total cost of ownership is visible before the checkout, not after
(root README.md).

## the split that doesn't survive contact with reality

it looked perfect in the url bar. then someone said it aloud and
typed it wrong, a chat app didn't autolink it, it read badly as an
email address, or the ending turned out to be .zip and mail filters
started eating it.

the answer: the hack fit score. whether the split reads naturally,
whether it survives being spoken aloud, whether it collides with a
file extension, how it behaves in links and email addresses
(src/core/hack-fit.ts on the domainhacks branch). dom judges a hack
as a name, not just as a url.

## the ending that looks fine and is quietly closed

.sj and .bv never opened registrations. .il only sells third-level
names: you can buy co.il, not a .il root. some endings are closed,
sanctioned or brand-only, and the finder that doesn't say so is
wasting your shortlist.

the answer: registrability first. dom knows which registries never
opened, which are third-level-only, which are closed or sanctioned
(.er, .ir), which are brand-only gtlds, and surfaces these as
excluded matches with the reason (root README.md, research/
dataset-notes.md).

## the risk nobody quotes you

the ending is purchasable and then a registry dispute takes the
country's internet offline, or the ending is sanctioned and your
payment rails won't touch it, or it's a former free registry with an
abuse history, or google geotargets it to a country you don't sell
in.

the answer: the risk radar. sovereignty concerns (.io, .ly),
sanctions (.ru, .ir), free-registry history (.tk), discontinued
endings (.su): a per-tld risk view, toggleable alongside the main
results, plus google's generic-vs-geotargeted annotation per
candidate (root README.md, research/platform-flags.json,
research/google-generic-cctlds.json).

## i have five candidates and no way to compare them

price, barrier, fit and risk are scattered across six registrar tabs
and none of them use the same words.

the answer: compare mode. shortlisted candidates side by side, price,
barrier, fit and risk at a glance. and risk radar mode for browsing
endings by risk profile when you already know the word.

## what about chinese, arabic, web3

the honest answer is: not yet, and not silently. default coverage is
the latin alphabet, since that's where the purchasable, resolvable
web is. everything else sits behind labeled, off-by-default toggles:
web3 hacks (ens, unstoppable) that don't open in a normal browser,
and punycode hacks (xn--) whose rendered forms vary by client
(root README.md).

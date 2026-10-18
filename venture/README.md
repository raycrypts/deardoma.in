# venture

tin.computer-style marketing project for deardomain, on the main
branch next to the product spec. plain files with git history. this
folder is compose-only: nothing here ships, posts, or changes any
live surface without the owner's explicit approval. drafts arrive as
commits for review, never as actions.

contents:

- standalone.md: the positioning page for the two-assistant product,
  positioned as a saas (a product, not a service)
- donna/: the domain broker assistant
  - problems.md: the buyer-namable pains, each with the answer
  - features.md: the pipeline, written against the problems
- domainhacks/: dom, the domainhack assistant
  - problems.md: the name-hunter pains, each with the answer
  - features.md: the finder, written against the problems

the two assistants: dom finds what's available, donna gets what
isn't, and dom feeds donna via the precursor check. there is no
socialcommerce file; the pricing position, the moat and the wedge icp
live in standalone.md.

product sources: the root README.md (product readme), donna-spec.md
(this branch), the donna branch (the agent backend: src/core/
negotiation.ts, src/core/contact-routes.ts, src/core/intents.ts,
src/core/state-machine.ts, src/core/reserved.ts, src/api/routes/) and
the domainhacks branch (the finder backend: src/core/candidates.ts,
src/core/hack-fit.ts, SCOPE.md, research/). the readme, spec
section, file path or dataset is cited at each claim. outside claims
(broker minimums, bot law) are marked "needs verification" or "needs
full read before publishing" until checked against primary sources.

the moat, in one line: the acquisition industry prices every owner
like a professional squatter; the typical owner is a person with one
domain and a mild case of forgetting, and finding out which one you
are talking to is the whole product.

the saas spine, in one line: one account, web app and cli, free
discovery surfaces and flat-fee, non-recurring campaigns, datasets
maintained through offline research passes and shipped like releases,
and every surface scoped in code (dom never prices, donna never shows
addresses before payment, reserved-mission endings refused flat out
by both).

house rules: prose lowercase, no emojis, no em dashes, exact case
preserved in identifiers and urls. pricing is flat fee per attempt
and on completion, never recurring, no subscription ever; exact
rates stay unpublished until launch. impossible targets (.gov and
friends) get a flat no with the reason, never a gate or an upsell. the product is deardomain, the
broker agent is donna, the domainhack agent is dom; the copy never
depends on the spelling of the address (donna-spec.md §1).

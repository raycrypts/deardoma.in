# dom hack-fit training set (adaptionlabs)

the point: train dom's hack-fit on the not-so-straightforward inputs, not just singular keywords: inflected forms (plurals, verb-ing), multi-word phrases, digraph splits, phonetic fits, multi-dot chains, and the honest negative/excluded cases. built 2026-10-18.

## the two halves

### 1. grounded seed (`hackfit-seed.jsonl`, 46 rows, built by `build_hackfit_seed.py`)

programmatic, zero hallucination: every candidate domain in the seed is computed against the research-verified tld dataset (`research/cctlds.json` + `research/gtlds.json`), so every ending is real and carries its researched availability/restriction. input taxonomy:

- singular baseline: hack -> ha.ck
- verb -ing (the .ing gTLD is real and open): running -> runn.ing (morpheme split, rank 1) over runni.ng (infix split, rank 4)
- digraph splits: north -> nor.th, wish -> wi.sh (reads right aloud, orthography broken at the dot)
- phonetic fits: gurus -> gur.us, cameras -> camer.as, ideas -> ide.as
- suffix-in-word fits: italy -> ita.ly, ireland -> ire.land, poland -> po.land
- multi-word phrases (spaces stripped): home studio -> home.studio + homestud.io; make money -> make.money; read it -> read.it
- multi-dot chains (middle label is also a real tld): delic.io.us, ma.ke.money
- excluded cases, never suggested, always reasoned: hacker -> hack.er (.er never opened), pencil -> penc.il (.il sells only third-level names), mailer -> mail.er
- honest negatives with near-misses: photos -> no direct split, but singular photo -> pho.to; israel, example, setup, backup -> no registrable ending exists, said plainly

row schema: `instruction` (task rules + query) and `response` (json: query, input_type, candidates[{domain, tld, fit_class, rank, registrability, restriction, notes}], excluded[{domain, tld, reason}], near_misses[{domain, note}]). fit classes: exact / phrase / morpheme / digraph / phonetic / chain / infix.

### 2. invented expansion (adaptionlabs `datasets.invent`, 500 rows, estimated 50 of 2202 credits)

launched on the adaptionlabs api (api.prod.adaptionlabs.ai; docs open-sourced at github.com/adaptionlabs/adaption-api-docs) with a prompt that encodes the same rules: only real second-level-registrable tlds, never invent endings, excluded endings listed with reasons, inflection near-misses included. generated rows must be vetted before use: `vet_invented.py` checks every candidate/excluded tld against the iana-derived tld universe and drops rows that invent endings or break the response schema. invention output lands in `hackfit-invented-vetted.jsonl`.

why invent at all when we can generate programmatically: the invented rows exercise the *judgment* surface (ranking nuance, novel queries, phrase variations) beyond our hand-picked taxonomy, and their quality pass tells us which fit classes confuse a model most.

## what this trains, when implemented

- dom's candidate generator already enumerates splits deterministically; the classifier this dataset trains is the *ranking/fit* judgment: given all valid splits for a query, which reads naturally, which is rank 4 junk, which belongs in excluded vs near_misses.
- same classifier powers the taken-hack toggle (fit judgment is identical whether the name is free) and the compare mode's fit column.
- the negative/excluded rows are the guardrail portion of the training set: they teach the model to answer "no registrable ending exists" instead of inventing one, and to demote .er/.il-class endings into excluded with the reason.

## operation notes

- seed upload: datasets.upload/initiate -> presigned put -> upload/complete (needs `file_size_bytes`; jsonl; max 2gb). the platform auto-mapped our columns (instruction -> prompt, response -> completion). seed dataset id: db61c5e3-8ab5-4516-8777-3447f9b0b342.
- deliberately did NOT run adaptive-data pool augmentation on the seed: their curated pool is generic text data and could inject made-up tlds into a task whose whole point is real endings. the invent prompt carries the grounding rules instead; vetting enforces it.
- next phases: autoscientist fine-tune on the vetted combined set (estimate first; autoscientist co-optimizes recipe and data), and preference_pairs for the ranking task (chosen/rejected candidate orderings) which is the better format for rank learning.

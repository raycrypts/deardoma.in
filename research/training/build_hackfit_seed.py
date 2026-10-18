#!/usr/bin/env python3
"""build the dom hack-fit seed training set (not-so-straightforward inputs)."""
import json

d = json.load(open('/tmp/hacktrain/suggestible.json'))
SUGGEST, META = set(d['suggestible']), d['meta']

# full tld universe incl. excluded, for excluded-match labeling
import sys
sys.path.insert(0, '/tmp/deardomain')
cc = json.load(open('/tmp/deardomain/research/cctlds.json'))
gt = json.load(open('/tmp/deardomain/research/gtlds.json'))
ALL, WHY_EXCLUDED = {}, {}
for c in cc:
    ALL[c['tld']] = c
    if c['availability'] == 'closed':
        WHY_EXCLUDED[c['tld']] = 'closed registry: ' + (c.get('registry') or '')[:60]
for g in gt:
    ALL.setdefault(g['tld'], g)
    if g.get('restriction') == 'closed':
        WHY_EXCLUDED[g['tld']] = 'closed/brand gTLD'
# third-level-only special case
WHY_EXCLUDED['il'] = 'no root registrations: isoc-il sells only third-level names (co.il etc.)'
ALL.setdefault('il', {'tld': 'il'})

RANK = {'exact': 1, 'phrase': 1, 'morpheme': 1, 'chain': 2, 'digraph': 2, 'phonetic': 3, 'infix': 4}

def candidates(word):
    w = word.replace(' ', '').lower()
    cands, excl = [], []
    for tld, rec in ALL.items():
        if w.endswith(tld) and len(w) > len(tld):
            stem = w[:-len(tld)]
            if len(stem) < 2 and len(stem) < 1: continue
            if tld in WHY_EXCLUDED:
                excl.append(dict(domain=f"{stem}.{tld}", tld=tld, reason=WHY_EXCLUDED[tld]))
            elif tld in SUGGEST:
                m = META[tld]
                cands.append(dict(domain=f"{stem}.{tld}", tld=tld, stem=stem, **m))
    return cands, excl

def chains(word):
    """multi-dot: suffix tld match whose stem also ends in a tld (del.icio.us pattern)."""
    w = word.replace(' ', '').lower()
    out = []
    for tld in SUGGEST:
        if w.endswith(tld) and len(w) > len(tld) + 2:
            stem = w[:-len(tld)]
            for mid in SUGGEST:
                if stem.endswith(mid) and len(stem) > len(mid):
                    left = stem[:-len(mid)]
                    if len(left) >= 2 and left + mid + tld == w:
                        out.append(dict(domain=f"{left}.{mid}.{tld}",
                                        left=left, mid=mid, tld=tld))
    return out

def fit_class(word, c, cat):
    w = word.replace(' ', '').lower()
    tld, stem = c['tld'], c['stem']
    if cat == 'phrase': cls = 'phrase'
    elif tld in ('ing','ed','ly','ment','tion','able'):
        cls = 'morpheme'
    elif any(stem.endswith(suf[:len(suf)-len(tld)]) and tld == suf[len(suf)-len(tld):]
             for suf in ('ing','ed','er','ion') for _ in [0] if len(tld) < len(suf)):
        cls = 'infix'
    elif len(tld) >= 2 and stem[-1:] + tld[0] in ('th','sh','ch','ph','wh','ck'):
        cls = 'digraph'
    elif w == stem + tld and (word.endswith('s') and not tld.endswith('s')) or (len(w) - len(stem+tld) != 0):
        cls = 'exact'
    else:
        cls = 'exact'
    # phonetic: the dot deletes or alters sound for inflected queries
    if cat == 'phonetic': cls = 'phonetic'
    return cls

def build_row(query, cat):
    w = query.replace(' ', '').lower()
    cands, excl = candidates(query)
    ch = chains(query)
    ranked = []
    for c in cands:
        cls = fit_class(query, c, cat)
        ranked.append(dict(domain=c['domain'], tld=c['tld'], fit_class=cls,
                           rank=RANK.get(cls, 3),
                           registrability=c['availability'],
                           restriction=c['restriction'],
                           notes=f"ending .{c['tld']} is {c['kind']}, {c['availability']}"))
    ranked.sort(key=lambda x: x['rank'])
    for e in ch[:2]:
        ranked.append(dict(domain=e['domain'], tld=e['tld'], fit_class='chain', rank=2,
                           registrability='multi-label', restriction='mixed',
                           notes=f"chain split: registrable name is {e['mid']}.{e['tld']}, '{e['left']}' rides as subdomain"))
    # near misses: inflection-adjusted singular/short forms
    nm = []
    if w.endswith('s') and not any(c['tld'].endswith('s') for c in cands):
        sing = query[:-1] if cat != 'phrase' else query[:-1]
        sc, _ = candidates(sing)
        for c in sc[:2]:
            nm.append(dict(domain=c['domain'], note=f"singular form '{sing}' hacks as {c['domain']}"))
    resp = dict(query=query,
                input_type=cat,
                candidates=ranked,
                excluded=excl,
                near_misses=nm,
                note='no registrable ending completes the full query' if not ranked and not ch else '')
    return resp

INPUTS = [
 ("hack","singular"), ("dom","singular"), ("smash","singular"), ("wish","digraph"),
 ("running","verb-ing"), ("listening","verb-ing"), ("coding","verb-ing"), ("smiling","verb-ing"),
 ("north","digraph"), ("south","digraph"), ("health","digraph"), ("earth","digraph"), ("worth","digraph"),
 ("gurus","phonetic"), ("cameras","phonetic"), ("ideas","phonetic"),
 ("italy","suffix"), ("ireland","suffix"), ("wonderland","suffix"), ("poland","suffix"),
 ("home studio","phrase"), ("make money","phrase"), ("read it","phrase"), ("travel italy","phrase"),
 ("stay gold","phrase"), ("domain hacks","phrase"), ("not possible","phrase"), ("virtual shelf","phrase"),
 ("as seen on","phrase"), ("best of all","phrase"),
 ("delicious","multidot"), ("notable","multidot"), ("socialize","multidot"), ("visualization","multidot"),
 ("inbox","prefixread"), ("worldwide","suffix"),
 ("hacker","negative-excluded"), ("mailer","negative-excluded"), ("pencil","negative-excluded"),
 ("israel","negative-none"), ("example","negative-none"), ("photos","negative-none"),
 ("setup","negative-none"), ("backup","negative-none"), ("cameroon","negative-partial"), ("belarus","negative-partial"),
]

INSTR = ("find every domain hack for the query '%s'. rules: only real, second-level-registrable tlds; "
         "if an ending exists but its registry never opened registrations or only sells third-level "
         "names (like .il), list it under excluded with the reason; never invent tlds. output json "
         "with query, candidates (domain, tld, fit_class, rank, registrability, restriction, notes), "
         "excluded, and near_misses (inflection-adjusted readings of the query that do have a "
         "registrable split, e.g. a plural whose singular form works). fit classes: exact, phrase, "
         "morpheme, digraph, phonetic, chain (multi-dot like del.icio.us). rank 1 reads most naturally.")

rows = []
for q, cat in INPUTS:
    resp = build_row(q, cat)
    rows.append(dict(instruction=INSTR % q, response=json.dumps(resp, indent=1)))
with open('/tmp/hacktrain/hackfit-seed.jsonl', 'w') as f:
    for r in rows:
        f.write(json.dumps(r) + "\n")
print("rows:", len(rows))
print(json.dumps(rows[21]['response'], indent=1)[:600])  # home studio
print(json.dumps(rows[38]['response'], indent=1)[:500])  # hacker

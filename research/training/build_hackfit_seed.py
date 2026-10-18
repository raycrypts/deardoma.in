#!/usr/bin/env python3
"""build the dom hack-fit seed training set (not-so-straightforward inputs)."""
import json

import os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
def rj(p): return json.load(open(os.path.join(REPO, p)))
cc_all = rj('cctlds.json')
gt_all = rj('gtlds.json')
_second = rj('cctld-second-level.json')
SUGGEST, META = set(), {}
for c in cc_all:
    if c['availability'] in ('open','restricted'):
        SUGGEST.add(c['tld']); META[c['tld']] = dict(kind='cctld', availability=c['availability'], restriction=c['restriction'])
for g in gt_all:
    if g.get('restriction') == 'none' and not g.get('sponsored'):
        SUGGEST.add(g['tld']); META[g['tld']] = dict(kind='gtld', availability='open', restriction='none')
for _r in _second:  # third-level-only registries are never suggestible
    if _r.get('secondLevelRegistrable') is False: SUGGEST.discard(_r['tld'])

# full tld universe incl. excluded, for excluded-match labeling
import sys
sys.path.insert(0, '/tmp/deardomain')
cc, gt = cc_all, gt_all
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
# third-level-only registries (research/cctld-second-level.json)
for _r in _second:
    if _r.get('secondLevelRegistrable') is False:
        WHY_EXCLUDED.setdefault(_r['tld'], 'no root registrations: registry sells only third-level names (' + ', '.join(_r.get('thirdLevelNamespaces', [])[:3]) + '...)')

RANK = {'exact': 1, 'phrase': 1, 'morpheme': 1, 'chain': 2, 'digraph_split': 2, 'doubled_consonant': 3, 'vowel_seam': 3, 'phonetic': 3, 'blend_required': 4, 'infix': 4}
DIGRAPHS = {'th','sh','ch','ph','wh','ck','gh','ng','qu'}
UNSPEAKABLE_STARTS = {'ng','nk','gn','ps','pn','rh','tm'}

def boundary_class(stem, tld):
    a, b = stem[-1:], tld[:1]
    if tld[:2] in UNSPEAKABLE_STARTS: return 'blend_required'
    if a + b in DIGRAPHS: return 'digraph_split'   # dot cuts one phoneme straddling the boundary
    if a == b and a not in 'aeiouy': return 'doubled_consonant'  # e.g. piz.za
    if a in 'aeiouy' and b in 'aeiouy': return 'vowel_seam'      # e.g. delicio.us
    return 'exact'

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
    tld, stem = c['tld'], c['stem']
    b = boundary_class(stem, tld)  # chain candidates are labeled separately in build_row
    if cat == 'phrase':
        # phrase inputs get their boundary class when it's the interesting verdict
        return b if b in ('digraph_split','doubled_consonant','vowel_seam','blend_required') else 'phrase'
    if cat == 'phonetic': return 'phonetic'
    if cat in ('suffix','singular') and tld in ('ing','ed','ly','ment','tion','able'):
        # only a morpheme split when the input isn't a whole word ending in those letters
        pass
    if tld == 'ing' and stem.endswith(('n','r','l','s','m','p','t')) and cat != 'suffix':
        return 'morpheme'  # runn.ing: the split respects the -ing morpheme
    return b

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
 ("hack","singular"), ("dom","singular"), ("smash","singular"), ("wish","suffix"),
 ("running","verb-ing"), ("listening","verb-ing"), ("coding","verb-ing"), ("smiling","verb-ing"),
 ("light","digraph"), ("tricky","digraph"), ("watch","digraph"),  # real straddles: lig.ht cuts gh, tric.ky cuts ck, wat.ch reads clean
 ("north","negative-excluded"), ("health","negative-excluded"), ("earth","negative-excluded"), ("worth","negative-excluded"),  # .th is third-level-only
 ("chess shop","phrase"), ("sun news","phrase"),  # doubled-consonant straddles: chess.shop, sun.news
 ("gurus","phonetic"), ("cameras","phonetic"), ("ideas","phonetic"), ("pizza","suffix"),
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
         "morpheme, digraph_split (dot cuts a phoneme straddling the boundary: lig.ht), doubled_consonant (chess.shop), vowel_seam (delicio.us), blend_required (tld cannot start an english syllable: runni.ng), phonetic, chain (multi-dot like del.icio.us). rank 1 reads most naturally; excluded endings (third-level-only like .th, closed like .er) are listed with reasons, never suggested.")

rows = []
for q, cat in INPUTS:
    resp = build_row(q, cat)
    rows.append(dict(instruction=INSTR % q, response=json.dumps(resp, indent=1)))
with open(os.path.join(HERE, 'hackfit-seed.jsonl'), 'w') as f:
    for r in rows:
        f.write(json.dumps(r) + "\n")
print("rows:", len(rows))
print(json.dumps(rows[21]['response'], indent=1)[:600])  # home studio
print(json.dumps(rows[38]['response'], indent=1)[:500])  # hacker

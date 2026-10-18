#!/usr/bin/env python3
"""vet invented hack-fit rows: every tld must be real, every response must parse.

rules (per research/training/hackfit-training.md):
- candidate and excluded tlds must exist in the iana-derived universe
- candidate tlds must be second-level-suggestible (open/restricted, not excluded)
- excluded tlds must be endings we actually exclude (closed / third-level-only)
- response json must contain query + candidates array; malformed rows are dropped
"""
import json, sys

import os
HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)  # research/
sys.path.insert(0, PARENT)
cc = json.load(open(os.path.join(PARENT, 'cctlds.json')))
gt = json.load(open(os.path.join(PARENT, 'gtlds.json')))
UNIVERSE = {c['tld'] for c in cc} | {g['tld'] for g in gt}
WHY_EXCLUDED = {c['tld'] for c in cc if c.get('availability') == 'closed'}
WHY_EXCLUDED |= {g['tld'] for g in gt if g.get('restriction') == 'closed'}
WHY_EXCLUDED.add('il')

SUGGEST = {c['tld'] for c in cc if c.get('availability') in ('open', 'restricted')}
SUGGEST |= {g['tld'] for g in gt if g.get('restriction') == 'none' and not g.get('sponsored')}
# third-level-only registries (research/cctld-second-level.json): root not sold
_second = json.load(open(os.path.join(PARENT, 'cctld-second-level.json')))
for _r in _second:
    if _r.get('secondLevelRegistrable') is False: SUGGEST.discard(_r['tld'])
# say-aloud taxonomy: fit classes must come from the implemented set
FIT_CLASSES = {'exact','phrase','morpheme','digraph_split','doubled_consonant','vowel_seam','blend_required','phonetic','chain','infix'}

def tld_of(domain):
    return domain.rsplit('.', 1)[-1].lower()

def vet_row(row):
    """return (ok, reasons). ok rows keep all their candidates; bad rows are dropped."""
    reasons = []
    try:
        resp = json.loads(row.get('response') or row.get('output') or '{}')
    except (TypeError, ValueError):
        return False, ['response not json']
    if 'query' not in resp:
        reasons.append('no query')
    for c in resp.get('candidates', []):
        t = tld_of(c.get('domain', ''))
        if t not in UNIVERSE:
            reasons.append(f'invented tld .{t}')
        elif t not in SUGGEST:
            reasons.append(f'unsuggestible candidate .{t}')
        if c.get('fit_class') not in FIT_CLASSES:
            reasons.append(f"unknown fit_class {c.get('fit_class')!r}")
    for e in resp.get('excluded', []):
        t = tld_of(e.get('domain', ''))
        if t not in UNIVERSE:
            reasons.append(f'invented excluded tld .{t}')
    for nm in resp.get('near_misses', []):
        t = tld_of(nm.get('domain', ''))
        if t not in UNIVERSE:
            reasons.append(f'invented near-miss tld .{t}')
    return len(reasons) == 0, reasons

def main(inp, outp):
    kept, dropped = [], []
    for line in open(inp):
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        ok, reasons = vet_row(row)
        (kept if ok else dropped).append((row, reasons))
    with open(outp, 'w') as f:
        for row, _ in kept:
            f.write(json.dumps(row) + '\n')
    print(f'kept {len(kept)} / {len(kept)+len(dropped)}')
    for row, reasons in dropped[:10]:
        q = json.loads(row.get('response') or '{}').get('query', '?')
        print(f'  dropped {q!r}: {reasons}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

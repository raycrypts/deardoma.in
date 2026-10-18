#!/usr/bin/env python3
"""vet invented hack-fit rows: every tld must be real, every response must parse.

rules (per research/training/hackfit-training.md):
- candidate and excluded tlds must exist in the iana-derived universe
- candidate tlds must be second-level-suggestible (open/restricted, not
  excluded, not third-level-only like .il/.th/.za)
- fit classes must come from the implemented say-aloud taxonomy
- response json must contain query + candidates; markdown fences, single
  object arrays and {"results": [obj]} wrappers are recovered; the rest drop
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(HERE)  # research/

cc = json.load(open(os.path.join(PARENT, 'cctlds.json')))
gt = json.load(open(os.path.join(PARENT, 'gtlds.json')))
_second = json.load(open(os.path.join(PARENT, 'cctld-second-level.json')))

UNIVERSE = {c['tld'] for c in cc} | {g['tld'] for g in gt}
WHY_EXCLUDED = {c['tld'] for c in cc if c.get('availability') == 'closed'}
WHY_EXCLUDED |= {g['tld'] for g in gt if g.get('restriction') == 'closed'}
WHY_EXCLUDED.add('il')

SUGGEST = {c['tld'] for c in cc if c.get('availability') in ('open', 'restricted')}
SUGGEST |= {g['tld'] for g in gt if g.get('restriction') == 'none' and not g.get('sponsored')}
for _r in _second:
    if _r.get('secondLevelRegistrable') is False:
        SUGGEST.discard(_r['tld'])
        WHY_EXCLUDED.add(_r['tld'])

FIT_CLASSES = {'exact', 'phrase', 'morpheme', 'digraph_split', 'doubled_consonant',
               'vowel_seam', 'blend_required', 'phonetic', 'chain', 'infix'}

STRIP = '`"\''


def parse_response(raw):
    """recover common wrapper shapes: ```json fences, [obj], {"results": [...]}"""
    if raw is None:
        return None
    t = str(raw).strip()
    if t.startswith('```'):
        nl = t.find('\n')
        t = t[nl + 1:] if nl > -1 else t.strip('`')
        if t.rstrip().endswith('```'):
            t = t.rstrip()[:-3]
    try:
        obj = json.loads(t)
    except ValueError:
        return None
    if isinstance(obj, list):
        obj = obj[0] if obj else None
    elif isinstance(obj, dict) and 'candidates' not in obj and isinstance(obj.get('results'), list):
        obj = obj['results'][0] if obj['results'] else None
    return obj if isinstance(obj, dict) else None


def tld_of(domain):
    return str(domain).rsplit('.', 1)[-1].lower().strip(STRIP)


def first_token(domain):
    return str(domain).split(' ')[0].strip(STRIP).lstrip('.')


def cand_tld(c):
    # invented rows sometimes put the bare label in `domain` with the real ending in `tld`
    t = str(c.get('tld') or '').lower().strip(STRIP)
    if t and '.' not in t and len(t) <= 10:
        return t
    return tld_of(first_token(c.get('domain', '')))


DIGRAPHS = {'th','sh','ch','ph','wh','ck','gh','ng','qu'}

def normalize_fit_class(resp):
    """legacy invented rows predate the say-aloud taxonomy: 'digraph' was the
    blanket label. recompute from the boundary itself — digraph_split only when
    the dot truly cuts a straddling phoneme, exact otherwise."""
    for c in resp.get('candidates', []):
        if isinstance(c, dict) and c.get('fit_class') == 'digraph':
            tld = cand_tld(c)
            stem = str(c.get('domain') or '').lower()
            if stem.endswith(tld):
                stem = stem[:-len(tld)]
            stem = stem.rstrip('.')
            if stem and stem[-1] + tld[:1] in DIGRAPHS:
                c['fit_class'] = 'digraph_split'
            else:
                c['fit_class'] = 'exact'
    return resp


def vet_row(row):
    reasons = []
    resp = parse_response(row.get('response') or row.get('output'))
    if resp is None:
        return False, ['response not recoverable json']
    if 'query' not in resp:
        reasons.append('no query')
    resp = normalize_fit_class(resp)
    row['_normalized_response'] = json.dumps(resp)
    for c in resp.get('candidates', []):
        if not isinstance(c, dict):
            reasons.append('candidate not an object')
            continue
        t = cand_tld(c)
        if t not in UNIVERSE:
            reasons.append(f'invented tld .{t}')
        elif t not in SUGGEST:
            reasons.append(f'unsuggestible candidate .{t}')
        if c.get('fit_class') not in FIT_CLASSES:
            reasons.append(f"unknown fit_class {c.get('fit_class')!r}")
    for e in resp.get('excluded', []):
        if not isinstance(e, dict):
            continue
        t = cand_tld(e)
        if t not in UNIVERSE:
            reasons.append(f'invented excluded tld .{t}')
    for nm in resp.get('near_misses', []):
        dom = nm.get('domain', '') if isinstance(nm, dict) else str(nm)
        t = tld_of(first_token(dom))
        if t not in UNIVERSE:
            reasons.append(f'invented near-miss tld .{t}')
    return len(reasons) == 0, reasons


def main(inp, outp):
    kept, dropped = [], []
    DUMP_KEYS = ('response', 'output')
    for line in open(inp):
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except ValueError:
            dropped.append(({'instruction': line[:50]}, ['row not json']))
            continue
        ok, reasons = vet_row(row)
        if ok and '_normalized_response' in row:
            for k in DUMP_KEYS:
                if k in row:
                    row[k] = row.pop('_normalized_response')
                    break
            row.pop('_normalized_response', None)
        (kept if ok else dropped).append((row, reasons))
    with open(outp, 'w') as f:
        for row, _ in kept:
            f.write(json.dumps(row) + '\n')
    print(f'kept {len(kept)} / {len(kept) + len(dropped)}')
    seen = set()
    for row, reasons in dropped:
        for r in reasons:
            k = r.split(' ')[0]
            if k not in seen:
                seen.add(k)
                print('  drop reason:', r)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])

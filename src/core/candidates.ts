// Domain hack candidate generation (spec 12.1). Pure functions — no I/O.
export interface HackCandidate {
  fqdn: string; // full hack, e.g. delicio.us or de.licio.us
  label: string; // registrable label part
  tld: string;
  prefix?: string; // subdomain part for 2-dot hacks (de.licio.us)
  dotCount: number;
  hackKind: "label" | "subdomain";
}

export function normalizeKeyword(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function generateHacks(
  keyword: string,
  tlds: string[]
): HackCandidate[] {
  const s = normalizeKeyword(keyword);
  const out: HackCandidate[] = [];
  if (s.length < 2) return out;
  for (const tld of tlds) {
    if (s.length > tld.length && s.endsWith(tld)) {
      // 1-dot hack: the whole word is label.tld (e.g. delicio.us)
      out.push({
        fqdn: `${s.slice(0, -tld.length)}.${tld}`,
        label: s.slice(0, -tld.length),
        tld,
        dotCount: 1,
        hackKind: "label",
      });
    }
    // subdomain hacks (de.licio.us style) — ranked lower via dotCount
    for (let i = 1; i <= s.length - tld.length - 1; i++) {
      const rest = s.slice(i);
      if (!rest.endsWith(tld)) continue;
      const label = rest.slice(0, -tld.length);
      if (label.length < 1) continue;
      out.push({
        fqdn: `${s.slice(0, i)}.${label}.${tld}`,
        label,
        tld,
        prefix: s.slice(0, i),
        dotCount: 2,
        hackKind: "subdomain",
      });
    }
  }
  return out;
}

export interface TldMetaLite {
  registrablePublicly: boolean;
  typicalPrice?: number | null;
}

// Ranking per spec 12.1: fewer dots first, then registrable tlds, then price.
// Label naturalness/recognizability is a TODO for the hack-fit score.
export function rankCandidates(
  candidates: HackCandidate[],
  meta: Map<string, TldMetaLite>
): HackCandidate[] {
  const score = (c: HackCandidate): number => {
    let s = (c.dotCount - 1) * 100;
    const m = meta.get(c.tld);
    if (m && !m.registrablePublicly) s += 1000; // closed/restricted sink to the bottom
    s += Math.min(Number(m?.typicalPrice ?? 50), 100);
    return s;
  };
  return [...candidates].sort(
    (a, b) => score(a) - score(b) || a.fqdn.localeCompare(b.fqdn)
  );
}

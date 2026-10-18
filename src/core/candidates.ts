// Domain hack candidate generation (spec 12.1). Pure functions — no I/O.
import { sayItAloud } from "./hack-fit.js";

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
  restriction?: string;
  restrictionVerified?: boolean;
  registrationRoute?: string; // direct | intermediary | business_presence | personal_presence_only | unavailable | unknown
  tldType?: string;
  secondLevelRegistrable?: boolean | null;
  typicalPrice?: number | null;
  fileExtSeverity?: "high" | "medium" | null;
}

export interface ExcludedHack {
  fqdn: string;
  tld: string;
  reason: string;
}

// endings that match the keyword linguistically but are NOT suggestible —
// e.g. smi.le? no: sm.il under .il (only co.il exists), closed registries like
// .er, brand gtlds, and web3 namespaces. the finder surfaces these with a
// reason instead of silently dropping them (spec 12.1: never suggest what you
// cannot own — but show what would have matched).
export function excludedHacks(
  keyword: string,
  meta: Map<string, TldMetaLite>,
  web3: boolean
): ExcludedHack[] {
  const s = normalizeKeyword(keyword);
  const out: ExcludedHack[] = [];
  if (s.length < 2) return out;
  for (const [tld, m] of meta) {
    if (s.length > tld.length && s.endsWith(tld)) {
      const suggestible =
        (web3 || m.tldType !== "web3") &&
        m.registrablePublicly &&
        m.secondLevelRegistrable !== false;
      if (suggestible) continue;
      let reason: string;
      if (m.tldType === "web3") {
        reason = "web3 namespace (toggle web3 to include)";
      } else if (m.secondLevelRegistrable === false) {
        reason = "registry has no root registrations (third-level only)";
      } else if (m.tldType === "brand") {
        reason = "brand gtld — only the owner registers";
      } else if (!m.registrablePublicly) {
        reason = "not registrable (closed registry)";
      } else {
        reason = "unavailable";
      }
      out.push({ fqdn: `${s.slice(0, -tld.length)}.${tld}`, tld, reason });
    }
  }
  return out;
}

// endings eligible for hack suggestion. excludes web3 unless toggled, closed
// endings, and registries that never register the root at all (spec 12.1:
// never suggest a hack the buyer cannot own — e.g. .il only offers co.il).
export function suggestibleTlds(
  meta: Map<string, TldMetaLite>,
  web3: boolean
): string[] {
  const out: string[] = [];
  for (const [tld, m] of meta) {
    if (!web3 && m.tldType === "web3") continue;
    if (!m.registrablePublicly) continue;
    if (m.secondLevelRegistrable === false) continue;
    out.push(tld);
  }
  return out;
}

// Ranking per spec 12.1: fewer dots first, then open-to-register tlds, then
// price. closed endings sink to the bottom (grayed out by the consumer),
// restricted and unverified-availability endings rank below open ones.
// Label naturalness/recognizability is a TODO for the hack-fit score.
export function rankCandidates(
  candidates: HackCandidate[],
  meta: Map<string, TldMetaLite>
): HackCandidate[] {
  const score = (c: HackCandidate): number => {
    let s = (c.dotCount - 1) * 100;
    const m = meta.get(c.tld);
    if (m && !m.registrablePublicly) {
      s += 1000; // closed: never registrable by the buyer — grayed out
    } else if (m && m.restrictionVerified === false) {
      s += 400; // availability unverified: don't rank it like a confirmed-open one
    } else if (m && m.restriction === "none" && m.restrictionVerified !== false) {
      // open and researched: no penalty
    } else if (m && m.registrationRoute === "intermediary") {
      s += 150; // buyable via a trustee/local-agent service: small friction penalty
    } else {
      s += 250; // hard restriction (presence/residency/business entity): below intermediary-buyable
    }
    if (m?.fileExtSeverity === "high") {
      s += 300; // reads as a file type people and systems parse (.py, .zip)
    } else if (m?.fileExtSeverity === "medium") {
      s += 100; // recognized in dev/technical contexts (.tcl, .makefile)
    }
    s += sayItAloud(c.label, c.tld).penalty; // spoken-aloud friction at the boundary
    s += Math.min(Number(m?.typicalPrice ?? 50), 100);
    return s;
  };
  return [...candidates].sort(
    (a, b) => score(a) - score(b) || a.fqdn.localeCompare(b.fqdn)
  );
}

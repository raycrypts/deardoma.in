#!/usr/bin/env node
// generates src/core/tld-meta-seed.generated.ts from the researched datasets
// in research/ (spec 12.3/12.4). reproducible: research json in, seed out.
//
// inputs (all committed to the repo for citation traceability):
//   research/cctlds.json                 — ccTLD availability research
//   research/gtlds.json                  — gTLD core + hack-relevant rows
//   research/google-generic-cctlds.json  — google's treats-as-generic list
//   research/platform-flags.json          — sanctioned/blocked/free-registry flags
//
// output: src/core/tld-meta-seed.generated.ts (TLD_META_SEED)
//
// run: node scripts/gen-tld-seed.mjs

import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const cctlds = read("../research/cctlds.json");
const gtlds = read("../research/gtlds.json");
const googleGeneric = read("../research/google-generic-cctlds.json");
const platformFlags = read("../research/platform-flags.json");
let intermediaries = [];
try { intermediaries = read("../research/cctld-intermediaries.json"); } catch { /* optional input */ }
let routeCorrections = [];
try { routeCorrections = read("../research/cctld-intermediaries-corrections.json"); } catch { /* optional input */ }
let secondLevel = [];
try { secondLevel = read("../research/cctld-second-level.json"); } catch { /* optional input */ }
let fileExtClash = { clashes: [] };
try { fileExtClash = read("../research/file-ext-clash.json"); } catch { /* optional input */ }
try { secondLevel = read("../research/cctld-second-level.json"); } catch { /* optional input */ }
const INTERMEDIARY = new Map(intermediaries.map((i) => [String(i.tld).toLowerCase(), i]));
for (const c of routeCorrections) INTERMEDIARY.set(String(c.tld).toLowerCase(), c);
const FILE_EXT = new Map(
  (fileExtClash.clashes ?? [])
    .filter((c) => c.severity === "high" || c.severity === "medium")
    .map((c) => [String(c.tld).toLowerCase(), c])
);
const SECOND_LEVEL = new Map(secondLevel.map((s) => [String(s.tld).toLowerCase(), s]));

const GOOGLE_GENERIC = new Set((googleGeneric.tlds ?? []).map((t) => t.toLowerCase()));
const FLAG_MAP = new Map(
  (platformFlags ?? []).map((f) => [String(f.tld).toLowerCase(), f])
);

const restrictionToAvailability = {
  none: "open",
  local_presence: "restricted",
  residency: "restricted",
  verification: "restricted",
  closed: "closed",
};


// file-extension clash (spec 12.5.1 #6): the tld reads as a file type
// (.py, .md, .zip...) — penalty flag, never an exclusion. severity tiers
// and evidence live in research/file-ext-clash.json; classic tlds
// (com/org/net) carry real historical matches but are never mistaken for
// files, so they stay unflagged (documented in the research file).
function fileExtFor(tld) {
  const f = FILE_EXT.get(tld);
  if (!f) return {};
  return {
    fileExtClash: true,
    fileExtSeverity: f.severity,
    fileExtNote: f.readsAs,
  };
}

function flagsFor(tld, researchedFlags) {
  const out = [...new Set(researchedFlags ?? [])];
  const pf = FLAG_MAP.get(tld);
  if (pf) {
    for (const f of pf.flags ?? []) out.push(f);
    if (pf.flags?.length) out.push(`flagged:${tld}`); // marker, dedup safe
  }
  // the marker is awkward; instead keep just the actual flag words
  return [...new Set(out.filter((f) => !f.startsWith("flagged:")))];
}

// practical registration route (trustee / business presence / personal only).
// open + verified endings default to 'direct' when the routes dataset has no row.
function routeFor(tld, restriction, c) {
  const i = INTERMEDIARY.get(tld);
  if (!i) {
    if (restriction === "none" && c.availability === "open" && c.verified) {
      return { registrationRoute: "direct" };
    }
    return {};
  }
  return {
    registrationRoute: i.route ?? "unknown",
    intermediaryNote: i.intermediaryNote ?? null,
    intermediaryFee: i.intermediaryFee ?? null,
    businessPresenceAccepted:
      typeof i.businessPresenceAccepted === "boolean" ? i.businessPresenceAccepted : null,
  };
}

function riskNoteFor(tld, pf, base) {
  const parts = [];
  if (base) parts.push(base);
  if (pf?.note) parts.push(pf.note);
  return parts.join("; ") || null;
}

const rows = new Map();

// ccTLDs
for (const c of cctlds) {
  const tld = String(c.tld).toLowerCase().replace(/^\./, "");
  const restriction =
    c.availability === "unknown" || c.restriction == null
      ? "unknown"
      : String(c.restriction);
  const registrable = restriction !== "closed";
  const pf = FLAG_MAP.get(tld);
  const sl = SECOND_LEVEL.get(tld);
  const rootRegistrable = sl ? Boolean(sl.secondLevelRegistrable) : null;
  const sldFlags = rootRegistrable === false ? ["third_level_only"] : [];
  rows.set(tld, {
    tld,
    tldType: "cctld",
    operatorCountry: c.country ?? null,
    googleTreatsAsGeneric: GOOGLE_GENERIC.has(tld),
    registrablePublicly: rootRegistrable === false ? false : registrable,
    restriction,
    restrictionNote:
      c.availability === "unknown"
        ? "availability unverified — treat as restricted until checked"
        : (c.restrictionNote ?? ""),
    riskNote: riskNoteFor(tld, pf, null),
    typicalPrice: c.typicalPrice ?? null,
    renewalPrice: c.renewalPrice ?? null,
    rdapSupported: c.rdapSupported ?? null,
    flags: flagsFor(tld, [...(c.flags ?? []), ...sldFlags]),
    ...fileExtFor(tld),
    secondLevelRegistrable: rootRegistrable,
    thirdLevelNamespaces: sl?.thirdLevelNamespaces ?? null,
    sourceUrl: c.sourceUrl ?? pf?.sourceUrl ?? null,
    accessed: c.accessed ?? "2026-10-18",
    verified: Boolean(c.verified),
    restrictionVerified: c.availability !== "unknown" && Boolean(c.verified),
    ...routeFor(tld, restriction, c),
  });
}

// gTLDs (core + hack-relevant). brand/sponsored closed rows are included
// when the research file carries them.
for (const g of gtlds) {
  const tld = String(g.tld).toLowerCase().replace(/^\./, "");
  const restriction =
    g.restriction ?? (g.sponsored ? "closed" : "none");
  const restrictionNote =
    g.restrictionNote ?? (g.restriction === "closed" ? "sponsored: eligible entities only" : "open");
  const pf = FLAG_MAP.get(tld);
  rows.set(tld, {
    tld,
    tldType: g.tldType ?? "gtld_new",
    operatorCountry: null,
    googleTreatsAsGeneric: null,
    registrablePublicly: restriction !== "closed",
    restriction,
    restrictionNote,
    riskNote: riskNoteFor(tld, pf, null),
    typicalPrice: g.typicalPrice ?? null,
    renewalPrice: g.renewalPrice ?? null,
    rdapSupported: g.rdapSupported ?? null,
    flags: flagsFor(tld, [
      ...(g.flags ?? []),
      ...(g.hstsPreload ? ["hsts_preloaded"] : []),
      ...(FILE_EXT.get(tld)?.severity === "high" ? ["file-ext-clash"] : []),
    ]),
    ...fileExtFor(tld),
    sourceUrl: g.sourceUrl ?? pf?.sourceUrl ?? null,
    accessed: g.accessed ?? "2026-10-18",
    verified: Boolean(g.verified),
    restrictionVerified: Boolean(g.verified),
  });
}

// web3 namespaces stay hand-curated (spec 12.7)
const WEB3 = [
  { tld: "eth", tldType: "web3", restriction: "none", restrictionNote: "ens: yearly rent", namespace: "ens" },
  { tld: "x", tldType: "web3", restriction: "none", restrictionNote: "unstoppable: one-time mint, no renewals", namespace: "unstoppable" },
  { tld: "crypto", tldType: "web3", restriction: "none", restrictionNote: "unstoppable: one-time mint, no renewals", namespace: "unstoppable" },
  { tld: "nft", tldType: "web3", restriction: "none", restrictionNote: "unstoppable: one-time mint, no renewals", namespace: "unstoppable" },
  { tld: "wallet", tldType: "web3", restriction: "none", restrictionNote: "unstoppable: one-time mint, no renewals", namespace: "unstoppable" },
];
for (const w of WEB3) {
  rows.set(w.tld, {
    tld: w.tld,
    tldType: w.tldType,
    operatorCountry: null,
    googleTreatsAsGeneric: null,
    registrablePublicly: true,
    restriction: w.restriction,
    restrictionNote: w.restrictionNote,
    riskNote: "collision risk: a web3 ending can clash with a future icann tld of the same name",
    typicalPrice: null,
    renewalPrice: null,
    rdapSupported: false,
    flags: ["web3"],
    sourceUrl: null,
    accessed: null,
    verified: true,
    restrictionVerified: true,
    namespace: w.namespace,
  });
}

const sorted = [...rows.values()].sort((a, b) => a.tld.localeCompare(b.tld));
const counts = sorted.reduce((acc, r) => {
  acc[r.tldType] = (acc[r.tldType] ?? 0) + 1;
  return acc;
}, {});
const unverified = sorted.filter((r) => !r.restrictionVerified).length;

const banner = `// GENERATED by scripts/gen-tld-seed.mjs — do not edit by hand.
// research inputs live in research/*.json (citations preserved, spec 12.3).
// ${sorted.length} endings: ${Object.entries(counts)
  .map(([k, v]) => `${k} ${v}`)
  .join(", ")}; ${unverified} with unverified availability.`;

const out = `${banner}
import type { TldMeta } from "./tld-meta.js";

export const TLD_META_SEED: TldMeta[] = ${JSON.stringify(sorted, null, 2)};
`;

writeFileSync(new URL("../src/core/tld-meta-seed.generated.ts", import.meta.url), out);
console.log(
  `seed generated: ${sorted.length} tlds (${unverified} unverified availability) -> src/core/tld-meta-seed.generated.ts`
);

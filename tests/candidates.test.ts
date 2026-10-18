import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyChain,
  excludedHacks,
  generateHacks,
  hackAxis,
  normalizeKeyword,
  rankCandidates,
  suggestibleTlds,
} from "../src/core/candidates.js";
import { hackFit } from "../src/core/hack-fit.js";

test("normalize strips spaces/punctuation and lowercases", () => {
  assert.equal(normalizeKeyword("  De li.ciOUS! "), "delicious");
});

test("label hacks: radio -> rad.io", () => {
  const hacks = generateHacks("radio", ["io", "us"]);
  const oneDot = hacks.filter((h) => h.dotCount === 1);
  assert.deepEqual(oneDot.map((h) => h.fqdn), ["rad.io"]);
});

test("subdomain hacks included: delicious -> de.licio.us", () => {
  const hacks = generateHacks("delicious", ["us"]);
  assert.ok(hacks.some((h) => h.fqdn === "delicio.us"));
  assert.ok(hacks.some((h) => h.fqdn === "de.licio.us" && h.hackKind === "subdomain"));
});

test("web3 namespaces generate the same way: teeth -> te.eth", () => {
  const hacks = generateHacks("teeth", ["eth"]);
  assert.equal(hacks[0].fqdn, "te.eth");
});

test("no candidate when keyword equals the tld or is too short", () => {
  assert.deepEqual(generateHacks("us", ["us"]), []);
  assert.deepEqual(generateHacks("a", ["io"]), []);
});

test("ranking: fewer dots first", () => {
  const meta = new Map([["us", { registrablePublicly: true, typicalPrice: 8 }]]);
  const ranked = rankCandidates(generateHacks("delicious", ["us"]), meta);
  assert.equal(ranked[0].fqdn, "delicio.us");
  assert.ok(
    ranked[0].dotCount < ranked[ranked.length - 1].dotCount
  );
});

test("ranking: closed tlds sink to the bottom", () => {
  const all = [
    ...generateHacks("radio", ["io"]),
    ...generateHacks("danger", ["er"]),
  ];
  const meta = new Map([
    ["io", { registrablePublicly: true, typicalPrice: 40 }],
    ["er", { registrablePublicly: false, typicalPrice: 5 }],
  ]);
  const ranked = rankCandidates(all, meta);
  assert.equal(ranked[ranked.length - 1].tld, "er");
  assert.equal(ranked[0].fqdn, "rad.io");
});

// spec 12.1 ranking: "a tld that's open to register" ranks above restricted
// ones; availability-unverified endings rank below confirmed-open ones.
test("ranking: open above restricted above unverified, closed last (spec 12.1)", () => {
  const cands = [
    { fqdn: "rad.io", label: "rad", tld: "io", dotCount: 1, hackKind: "label" as const },
    { fqdn: "ab.ca", label: "ab", tld: "ca", dotCount: 1, hackKind: "label" as const },
    { fqdn: "zz.aa", label: "zz", tld: "aa", dotCount: 1, hackKind: "label" as const },
    { fqdn: "ng.er", label: "ng", tld: "er", dotCount: 1, hackKind: "label" as const },
  ];
  const meta = new Map([
    ["io", { registrablePublicly: true, restriction: "none", restrictionVerified: true, typicalPrice: 40 }],
    ["ca", { registrablePublicly: true, restriction: "local_presence", restrictionVerified: true, typicalPrice: 12 }],
    ["aa", { registrablePublicly: true, restriction: "unknown", restrictionVerified: false, typicalPrice: 5 }],
    ["er", { registrablePublicly: false, restriction: "closed", restrictionVerified: true, typicalPrice: 5 }],
  ]);
  const ranked = rankCandidates(cands, meta);
  assert.deepEqual(
    ranked.map((c) => c.tld),
    ["io", "ca", "aa", "er"]
  );
});

// a trustee/local-agent intermediary makes a restricted ending practically
// buyable, so it ranks above hard-restricted ones (spec 12.1: open-to-register
// is a ranking factor, and intermediary-buyable sits between open and hard).
test("ranking: intermediary-buyable above hard-restricted (spec 12.1)", () => {
  const cands = [
    { fqdn: "ra.io", label: "ra", tld: "io", dotCount: 1, hackKind: "label" as const },
    { fqdn: "ab.fr", label: "ab", tld: "fr", dotCount: 1, hackKind: "label" as const },
    { fqdn: "mo.ca", label: "mo", tld: "ca", dotCount: 1, hackKind: "label" as const },
  ];
  const meta = new Map([
    ["io", { registrablePublicly: true, restriction: "none", restrictionVerified: true, registrationRoute: "direct", typicalPrice: 40 }],
    ["fr", { registrablePublicly: true, restriction: "local_presence", restrictionVerified: true, registrationRoute: "intermediary", typicalPrice: 10 }],
    ["ca", { registrablePublicly: true, restriction: "local_presence", restrictionVerified: true, registrationRoute: "personal_presence_only", typicalPrice: 12 }],
  ]);
  const ranked = rankCandidates(cands, meta);
  assert.deepEqual(
    ranked.map((x) => x.tld),
    ["io", "fr", "ca"]
  );
});

// .il never offers root registrations (only co.il etc.) — suggesting
// sm.il would be nonsense. closed endings (.er) and web3 (unless toggled)
// are excluded the same way.
test("suggestibleTlds excludes third-level-only, closed and untoggled web3", () => {
  const meta = new Map(Object.entries({
    il: { registrablePublicly: false, tldType: "cctld", secondLevelRegistrable: false },
    er: { registrablePublicly: false, tldType: "cctld", secondLevelRegistrable: true },
    us: { registrablePublicly: true, tldType: "cctld", secondLevelRegistrable: true },
    eth: { registrablePublicly: true, tldType: "web3", secondLevelRegistrable: true },
  }));
  assert.deepEqual(suggestibleTlds(meta, false), ["us"]);
  assert.deepEqual(suggestibleTlds(meta, true), ["us", "eth"]);
});

test("no root hack is generated for a third-level-only registry", () => {
  const meta = new Map(Object.entries({
    il: { registrablePublicly: false, tldType: "cctld", secondLevelRegistrable: false },
  }));
  assert.deepEqual(generateHacks("smil", suggestibleTlds(meta, false)), []);
});

// the finder explains why a linguistically-perfect hack is impossible
// instead of silently omitting it (.ti-class endings, closed registries).
test("excludedHacks surfaces .il, .er and brand .dev with reasons, not silence", () => {
  const meta = new Map<string, any>(Object.entries({
    il: { registrablePublicly: false, tldType: "cctld", secondLevelRegistrable: false },
    er: { registrablePublicly: false, tldType: "cctld", secondLevelRegistrable: true },
    us: { registrablePublicly: true, tldType: "cctld", secondLevelRegistrable: true },
    dev: { registrablePublicly: false, tldType: "brand" },
  }));

  const il = excludedHacks("travail", meta, false).find((x) => x.tld === "il");
  assert.ok(il, ".il should be surfaced for a word ending in -il");
  assert.equal(il.reason, "registry has no root registrations (third-level only)");
  assert.equal(il.fqdn, "trava.il");

  const er = excludedHacks("smiler", meta, false).find((x) => x.tld === "er");
  assert.ok(er, ".er should be surfaced for a word ending in -er");
  assert.equal(er.reason, "not registrable (closed registry)");

  const dev = excludedHacks("phoneappdev", meta, false).find((x) => x.tld === "dev");
  assert.ok(dev, "brand .dev should be surfaced as excluded");
  assert.equal(dev.reason, "brand gtld — only the owner registers");

  assert.ok(!excludedHacks("delicious", meta, false).some((x) => x.tld === "us"),
    ".us is suggestible — never excluded");
});

test("file-extension clash is a ranking penalty, not an exclusion (spec 12.5.1 #6)", () => {
  const meta = new Map([
    ["py", { registrablePublicly: true, restriction: "none", restrictionVerified: true, fileExtSeverity: "high" as const }],
    ["in", { registrablePublicly: true, restriction: "none", restrictionVerified: true, fileExtSeverity: null }],
  ]);
  const ranked = rankCandidates(
    [
      { fqdn: "monty.py", label: "monty", tld: "py", dotCount: 1 } as never,
      { fqdn: "monty.in", label: "monty", tld: "in", dotCount: 1 } as never,
    ],
    meta
  );
  // monty.py reads as a python file: the clash ending ranks below the clean one
  assert.equal(ranked[0].fqdn, "monty.in");
  assert.equal(ranked[1].fqdn, "monty.py");
});

test("say-it-aloud feeds the ranking: runn.ing outranks runni.ng", () => {
  const meta = new Map([
    ["ing", { registrablePublicly: true, restriction: "none", restrictionVerified: true }],
    ["ng", { registrablePublicly: true, restriction: "local_presence", restrictionVerified: true, registrationRoute: "intermediary" }],
  ]);
  const ranked = rankCandidates(
    [
      { fqdn: "runni.ng", label: "runni", tld: "ng", dotCount: 1 } as never,
      { fqdn: "runn.ing", label: "runn", tld: "ing", dotCount: 1 } as never,
    ],
    meta
  );
  assert.equal(ranked[0].fqdn, "runn.ing");
  assert.equal(ranked[1].fqdn, "runni.ng");
});

// reserved-mission endings (spec 12.3): dom and donna can NEVER suggest
// .gov/.mil/.edu/.int, regardless of what any research row claims
test("reserved-mission endings are never suggestible, even if data drifts open", () => {
  const drifted = new Map([
    ["gov", { registrablePublicly: true, restriction: "none", restrictionVerified: true } as never],
    ["edu", { registrablePublicly: true, restriction: "none", restrictionVerified: true } as never],
    ["io", { registrablePublicly: true, restriction: "none", restrictionVerified: true } as never],
  ]);
  const tlds = suggestibleTlds(drifted, false);
  assert.ok(!tlds.includes("gov"), ".gov must never be suggestible");
  assert.ok(!tlds.includes("edu"), ".edu must never be suggestible");
  assert.ok(tlds.includes("io"));
});

test("full seed: reserved-mission endings carry the flag and the exclusion", async () => {
  const { TLD_META_SEED } = await import("../src/core/tld-meta-seed.generated.js");
  for (const tld of ["gov", "mil", "edu", "int"]) {
    const m = TLD_META_SEED.find((r) => r.tld === tld);
    assert.ok(m, `.${tld} in seed`);
    assert.equal(m.registrablePublicly, false, `.${tld} closed`);
    assert.ok((m.flags ?? []).includes("reserved_mission"), `.${tld} flag`);
  }
  const meta = new Map(TLD_META_SEED.map((m) => [m.tld, { registrablePublicly: m.registrablePublicly, restriction: m.restriction, tldType: m.tldType, secondLevelRegistrable: m.secondLevelRegistrable } as never]));
  const sugg = suggestibleTlds(meta, false);
  for (const tld of ["gov", "mil", "edu", "int"]) {
    assert.ok(!sugg.includes(tld), `.${tld} never suggested`);
  }
  const ex = excludedHacks("savegov", meta, false);
  const gov = ex.find((e) => e.tld === "gov");
  assert.ok(gov, "save.gov surfaces in excluded");
  assert.ok(gov.reason.startsWith("reserved-mission"), "reserved reason given");
});

// hack axes (spec 12.2): linguistic (tra.sh completes "trash") vs command
// (brew.sh reads as homebrew + shell script)
test("command axis: brew.sh reads as a command hack, tra.sh stays linguistic", () => {
  const m = { fileExtSeverity: "high" as const };
  assert.equal(hackAxis({ label: "brew", tld: "sh", dotCount: 1 }, m), "command");
  assert.equal(hackAxis({ label: "tra", tld: "sh", dotCount: 1 }, m), "linguistic");
  // a command-looking label on a non-file tld is still linguistic
  assert.equal(hackAxis({ label: "brew", tld: "io", dotCount: 1 }, { fileExtSeverity: null }), "linguistic");
});

test("command hacks waive the file-extension penalty: brew.sh outranks tra.sh", () => {
  const meta = new Map([
    ["sh", { registrablePublicly: true, restriction: "none", restrictionVerified: true, fileExtSeverity: "high" as const }],
  ]);
  const ranked = rankCandidates(
    [
      { fqdn: "tra.sh", label: "tra", tld: "sh", dotCount: 1 } as never,
      { fqdn: "brew.sh", label: "brew", tld: "sh", dotCount: 1 } as never,
    ],
    meta
  );
  assert.equal(ranked[0].fqdn, "brew.sh", "command hack first");
  assert.equal(ranked[1].fqdn, "tra.sh", "linguistic hack keeps the clash penalty");
});

// multi-dot chains (spec 12.2): fi.ni.sh has every segment a real tld
test("chain classification: fi.ni.sh is a chain, de.licio.us is a subdomain hack", () => {
  const universe = new Set(["fi", "ni", "sh", "us", "de"]);
  const chain = classifyChain(
    { fqdn: "fi.ni.sh", label: "ni", tld: "sh", prefix: "fi", dotCount: 2, hackKind: "subdomain" } as never,
    universe
  );
  assert.equal(chain.hackKind, "chain");
  const sub = classifyChain(
    { fqdn: "de.licio.us", label: "licio", tld: "us", prefix: "de", dotCount: 2, hackKind: "subdomain" } as never,
    universe
  );
  assert.equal(sub.hackKind, "subdomain", "licio is not a tld");
});

test("finish generates the fi.ni.sh chain and the chain ownership reason", async () => {
  const meta = new Map([
    ["ni", { registrablePublicly: true, restriction: "none", restrictionVerified: true } as never],
    ["sh", { registrablePublicly: true, restriction: "none", restrictionVerified: true } as never],
  ]);
  const hacks = generateHacks("finish", suggestibleTlds(meta, false)).map((c) =>
    classifyChain(c, new Set([...meta.keys(), "fi"]))
  );
  const chain = hacks.find((h) => h.fqdn === "fi.ni.sh");
  assert.ok(chain, "fi.ni.sh generated");
  assert.equal(chain.hackKind, "chain");
  const fit = hackFit(chain, { severity: null, note: null });
  assert.ok(fit.reasons.some((r) => r.includes("chain: every segment is a real tld")), "chain reason");
  assert.ok(fit.reasons.some((r) => r.includes("you own only the base ni.sh")), "ownership note");
});

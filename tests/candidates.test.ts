import test from "node:test";
import assert from "node:assert/strict";
import {
  excludedHacks,
  generateHacks,
  normalizeKeyword,
  rankCandidates,
  suggestibleTlds,
} from "../src/core/candidates.js";

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
      { fqdn: "monty.py", tld: "py", dotCount: 1 } as never,
      { fqdn: "monty.in", tld: "in", dotCount: 1 } as never,
    ],
    meta
  );
  // monty.py reads as a python file: the clash ending ranks below the clean one
  assert.equal(ranked[0].fqdn, "monty.in");
  assert.equal(ranked[1].fqdn, "monty.py");
});

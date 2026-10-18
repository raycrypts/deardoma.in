import test from "node:test";
import assert from "node:assert/strict";
import { hackFit, sayItAloud } from "../src/core/hack-fit.js";

test("file-extension tld flags a clash: un.zip", () => {
  const fit = hackFit({ fqdn: "un.zip", label: "un", tld: "zip", dotCount: 1 });
  assert.equal(fit.fileExtensionClash, true);
  assert.equal(fit.fileExtensionSeverity, "high");
  assert.equal(fit.fileExtensionNote, ".zip file (zip archive)");
  assert.ok(fit.reasons.some((r) => r.includes("file extension")));
});

test("researched clash set: .py .md .sh .rs .mov flagged with what they read as", () => {
  for (const [tld, note] of [
    ["py", "python source"],
    ["md", "markdown document"],
    ["sh", "shell script"],
    ["rs", "rust source"],
    ["mov", "quicktime movie"],
  ] as const) {
    const fit = hackFit({ fqdn: `x.${tld}`, label: "x", tld, dotCount: 1 });
    assert.equal(fit.fileExtensionClash, true, `.${tld} should clash`);
    assert.equal(fit.fileExtensionSeverity, "high");
    assert.ok(fit.fileExtensionNote?.includes(note), `.${tld} note should mention ${note}`);
  }
});

test("classic tlds are never file clashes despite historical matches", () => {
  // command.com is a real dos executable, but nobody mistakes a .com domain for a file
  for (const tld of ["com", "org", "net", "io", "us"]) {
    const fit = hackFit({ fqdn: `x.${tld}`, label: "x", tld, dotCount: 1 });
    assert.equal(fit.fileExtensionClash, false, `.${tld} must not clash`);
  }
});

test("explicit call-site clash info wins over the seed fallback", () => {
  const fit = hackFit({ fqdn: "a.b", label: "a", tld: "b", dotCount: 1 }, {
    severity: "medium",
    note: ".b file (curated)",
  });
  assert.equal(fit.fileExtensionClash, true);
  assert.equal(fit.fileExtensionSeverity, "medium");
});

test("normal tlds carry no clash", () => {
  const fit = hackFit({ fqdn: "delicio.us", label: "delicio", tld: "us", dotCount: 1 });
  assert.equal(fit.fileExtensionClash, false);
  assert.ok(!fit.reasons.some((r) => r.includes("file extension")));
});

test("subdomain hacks carry the ownership warning (spec 12.5.1 #11)", () => {
  const fit = hackFit({ fqdn: "de.licio.us", label: "licio", tld: "us", dotCount: 2 });
  assert.ok(fit.reasons.some((r) => r.includes("registrable part")));
});

// say-it-aloud (spec 12.5.1): boundary phonology edge cases
test("say-it-aloud: natural boundaries", () => {
  for (const [label, tld] of [["read", "it"], ["rad", "io"], ["home", "studio"], ["runn", "ing"]] as const) {
    const s = sayItAloud(label, tld);
    assert.equal(s.category, "natural", label + "." + tld);
    assert.equal(s.penalty, 0);
  }
});

test("say-it-aloud: real digraph straddles — lig.ht cuts gh, tric.ky cuts ck", () => {
  const gh = sayItAloud("lig", "ht");
  assert.equal(gh.category, "digraph_split");
  assert.equal(gh.penalty, 50);
  assert.ok(gh.note.includes("gh"));
  const ck = sayItAloud("tric", "ky");
  assert.equal(ck.category, "digraph_split");
  assert.ok(ck.note.includes("ck"));
});

test("say-it-aloud: digraph-LEADING tlds read naturally — wi.sh keeps sh whole", () => {
  // edge case the owner called out: .sh as a ccTLD. the sh digraph lives
  // inside the tld, so "wi dot sh" reconstructs "wish" cleanly aloud.
  const s = sayItAloud("wi", "sh");
  assert.equal(s.category, "natural");
  assert.equal(s.penalty, 0);
});

test("say-it-aloud: doubled consonant straddling the dot (piz.za)", () => {
  // runn.ing keeps its double inside the label (natural); piz.za cuts zz
  const za = sayItAloud("piz", "za");
  assert.equal(za.category, "doubled_consonant");
  assert.equal(za.penalty, 25);
});

test("say-it-aloud: blend_required — .ng can't start an english syllable", () => {
  const s = sayItAloud("runni", "ng");
  assert.equal(s.category, "blend_required");
  assert.equal(s.penalty, 150);
  assert.ok(s.note.includes("blend"));
});

test("say-it-aloud: vowel seam (delicio.us) is a mild note, not a fail", () => {
  const s = sayItAloud("delicio", "us");
  assert.equal(s.category, "vowel_seam");
  assert.equal(s.penalty, 25);
});

test("hackFit carries the say-it-aloud verdict and surfaces hard cases in reasons", () => {
  const ok = hackFit({ fqdn: "read.it", label: "read", tld: "it", dotCount: 1 });
  assert.equal(ok.sayItAloud.category, "natural");
  const hard = hackFit({ fqdn: "runni.ng", label: "runni", tld: "ng", dotCount: 1 });
  assert.equal(hard.sayItAloud.category, "blend_required");
  assert.ok(hard.reasons.some((r) => r.includes("blend")));
});

// edge case the owner called out: .sh is BOTH a ccTLD (saint helena, buyable)
// AND a file type (shell script). it stays suggestible AND flagged.
test(".sh coexists: suggestible ccTLD with the file-ext flag, never excluded", () => {
  const fit = hackFit({ fqdn: "wi.sh", label: "wi", tld: "sh", dotCount: 1 });
  assert.equal(fit.fileExtensionClash, true, "shell-script flag present");
  assert.equal(fit.fileExtensionSeverity, "high");
  assert.equal(fit.sayItAloud.category, "natural", "sh lives whole in the tld");
});

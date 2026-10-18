import test from "node:test";
import assert from "node:assert/strict";
import { hackFit } from "../src/core/hack-fit.js";

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
  assert.deepEqual(fit.reasons, []);
});

test("subdomain hacks carry the ownership warning (spec 12.5.1 #11)", () => {
  const fit = hackFit({ fqdn: "de.licio.us", label: "licio", tld: "us", dotCount: 2 });
  assert.ok(fit.reasons.some((r) => r.includes("registrable part")));
});

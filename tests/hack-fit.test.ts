import test from "node:test";
import assert from "node:assert/strict";
import { hackFit } from "../src/core/hack-fit.js";

test("file-extension tld flags a clash: un.zip", () => {
  const fit = hackFit({ fqdn: "un.zip", label: "un", tld: "zip", dotCount: 1 });
  assert.equal(fit.fileExtensionClash, true);
  assert.ok(fit.reasons.some((r) => r.includes("file extension")));
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

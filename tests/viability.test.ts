import test from "node:test";
import assert from "node:assert/strict";
import { viability } from "../src/core/viability.js";

test("lu.ma: platform domain, hands up, no charge", () => {
  const v = viability("lu.ma");
  assert.equal(v.viable, false);
  assert.equal(v.refusal, "platform_domain");
  assert.ok(v.reason?.includes("would break"));
  assert.equal(v.charged, false);
});

test("platform subdomains don't slip past (event.lu.ma)", () => {
  const v = viability("event.lu.ma");
  assert.equal(v.refusal, "platform_domain");
});

test("registry-essential names are reserved by the registry (nic.sh)", () => {
  const v = viability("nic.sh");
  assert.equal(v.refusal, "registry_reserved");
  assert.ok(v.reason?.includes("registry's own infrastructure"));
  assert.equal(v.charged, false);
});

test("third-level-only registries: foo.il can never be owned", () => {
  const v = viability("foo.il");
  assert.equal(v.refusal, "third_level_only");
  assert.ok(v.reason?.includes("never a .il root"));
  // co.il is ALSO an unownable root (the registrable form is example.co.il)
  const alsoRoot = viability("co.il");
  assert.equal(alsoRoot.refusal, "third_level_only");
  const ok = viability("example.co.il");
  assert.equal(ok.viable, true);
});

test("normal targets pass the gate", () => {
  for (const d of ["example.com", "deardoma.in", "trailing.space.io "]) {
    const v = viability(d);
    assert.equal(v.viable, true, d);
  }
});

test("url-ish input is normalized before the check", () => {
  const v = viability("https://lu.ma/eventname");
  assert.equal(v.refusal, "platform_domain");
});

import test from "node:test";
import assert from "node:assert/strict";
import { reservedReason, RESERVED_MISSION } from "../src/core/reserved.js";

test("reserved-mission endings are rejected with the reason", () => {
  for (const tld of ["gov", "mil", "edu", "int", "arpa"]) {
    const r = reservedReason(tld);
    assert.ok(r, `.${tld} must carry a reason`);
    assert.ok(r.startsWith("reserved-mission"), `.${tld} reason wording`);
  }
});

test("normal endings pass", () => {
  for (const tld of ["io", "com", "sh", "ai"]) {
    assert.equal(reservedReason(tld), null);
  }
});

test("donna never pursues what the public can never own", () => {
  assert.equal(RESERVED_MISSION.size, 5);
});

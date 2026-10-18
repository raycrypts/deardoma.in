import test from "node:test";
import assert from "node:assert/strict";
import { TLD_META_SEED } from "../src/core/tld-meta-seed.generated.js";
import type { TldMeta } from "../src/core/tld-meta.js";

const byTld = new Map<string, TldMeta>(TLD_META_SEED.map((m) => [m.tld, m]));
const get = (tld: string): TldMeta => {
  const m = byTld.get(tld);
  assert.ok(m, `tld .${tld} missing from the researched seed`);
  return m;
};

// spec 12.3 seed examples — the cases the owner called out explicitly:
// .er is a real ccTLD but not purchasable; .ca needs canadian presence;
// .us needs a us nexus; .ir is sanctioned and may be platform-blocked.
test(".er is classified closed — not purchasable by the public", () => {
  const er = get("er");
  assert.equal(er.restriction, "closed");
  assert.equal(er.registrablePublicly, false);
  assert.equal(er.restrictionVerified, true);
});

test(".ca requires canadian presence", () => {
  const ca = get("ca");
  assert.equal(ca.restriction, "local_presence");
  assert.match(ca.restrictionNote, /canad/i);
  assert.equal(ca.registrablePublicly, true);
});

test(".us requires a us nexus", () => {
  const us = get("us");
  assert.equal(us.restriction, "local_presence");
  assert.match(us.restrictionNote, /nexus|presence/i);
});

test(".ir carries sanction/platform flags with a citation", () => {
  const ir = get("ir");
  assert.ok(
    (ir.flags ?? []).some((f) => /sanction|block/i.test(f)),
    ".ir flags should mention sanctions or platform blocks"
  );
  assert.ok(ir.sourceUrl, "flagged tlds must carry a source url");
});

test("every ccTLD row in the seed has a citation and access date", () => {
  for (const m of TLD_META_SEED) {
    if (m.tldType !== "cctld") continue;
    assert.ok(
      m.sourceUrl,
      `cctld .${m.tld} missing sourceUrl`
    );
    assert.ok(m.accessed, `cctld .${m.tld} missing access date`);
  }
});

test("closed rows are never marked registrable, and vice versa", () => {
  for (const m of TLD_META_SEED) {
    if (m.restriction === "closed") {
      assert.equal(
        m.registrablePublicly,
        false,
        `.${m.tld} is closed but marked registrable`
      );
    }
  }
});

// registration routes: .ca has no trustee workaround, .eu needs real
// eu/eea presence, .de formalities are handled via the registrar.
test("registration routes: .ca and .eu have no trustee workaround", () => {
  const ca = get("ca");
  assert.equal(ca.registrationRoute, "personal_presence_only");
  const eu = get("eu");
  assert.equal(eu.registrationRoute, "personal_presence_only");
  const de = get("de");
  assert.ok(
    de.registrationRoute === "direct" || de.registrationRoute === "intermediary",
    ".de should be practically registrable by anyone, got " + de.registrationRoute
  );
});

// .fr shows the trustee route with its fee; .io defaults to direct
test("intermediary routes survive the merge with fees and notes", () => {
  const fr = get("fr");
  assert.equal(fr.registrationRoute, "intermediary");
  assert.ok(fr.intermediaryFee, ".fr trustee fee should be recorded");
  assert.ok(fr.intermediaryNote, ".fr trustee note should be recorded");
  const io = get("io");
  assert.ok(
    !io.registrationRoute || io.registrationRoute === "direct",
    ".io should be direct, got " + io.registrationRoute
  );
});

test("every ccTLD with a route carries a citation for it", () => {
  for (const m of TLD_META_SEED) {
    if (m.tldType !== "cctld" || !m.registrationRoute) continue;
    if (m.registrationRoute === "unknown") continue;
    assert.ok(
      m.sourceUrl,
      `.${m.tld} has route ${m.registrationRoute} but no source url`
    );
  }
});

// .il never registers the root — it must never be suggested as a hack
// ending, and the row must say what it does offer (co.il etc.).
test(".il is third-level-only and never suggested as a root hack", () => {
  const il = get("il");
  assert.equal(il.secondLevelRegistrable, false);
  assert.ok(
    (il.flags ?? []).includes("third_level_only"),
    ".il should carry the third_level_only flag"
  );
  assert.ok(
    Array.isArray(il.thirdLevelNamespaces) && il.thirdLevelNamespaces.includes("co.il"),
    ".il should list its third-level namespaces"
  );
  assert.equal(il.registrationRoute, "unavailable");
});

// the owner's corrections: .ie has business-connection exceptions,
// .uk second-level registration carries a registrant presence policy.
test(".ie and .uk carry verified business-exception routes", () => {
  const ie = get("ie");
  assert.ok(
    ie.businessPresenceAccepted === true,
    ".ie should accept qualifying businesses"
  );
  assert.ok(ie.sourceUrl, ".ie route must be cited");
  const uk = get("uk");
  assert.ok(
    uk.registrationRoute && uk.registrationRoute !== "direct",
    ".uk root registration should not be marked plain direct, got " + uk.registrationRoute
  );
  assert.ok(uk.intermediaryNote, ".uk should explain its registrant policy");
});

test("google-generic marking only appears on ccTLDs", () => {
  for (const m of TLD_META_SEED) {
    if (m.googleTreatsAsGeneric) {
      assert.equal(m.tldType, "cctld", `.${m.tld} is not a ccTLD but marked google-generic`);
    }
  }
});

test("no duplicate tlds in the seed", () => {
  const tlds = TLD_META_SEED.map((m) => m.tld);
  assert.equal(new Set(tlds).size, tlds.length);
});

// the finder must know exactly what exists in the global dns root zone:
// every seed ending is a real IANA root tld (except the 5 intentional
// web3 pseudo-namespaces), and every root tld is in the seed.
import { verifyRootZone } from "../scripts/verify-root-zone.mjs";

test("seed == live IANA root zone (data.iana.org), no invented endings", () => {
  const { ok, notInRoot, missingFromSeed } = verifyRootZone();
  assert.ok(ok, `drift: notInRoot=${notInRoot.join(",")} missingFromSeed=${missingFromSeed.join(",")}`);
});

#!/usr/bin/env node
// verifies the seed against the authoritative IANA root zone list
// (research/iana-root-zone-tlds.txt, data.iana.org/TLD/tlds-alpha-by-domain.txt,
// refreshed per research pass). every seed ending must exist in the global
// dns root except the hand-curated web3 pseudo-namespaces (spec 12.7),
// and every root-zone ending absent from the seed is reported.
//
// run: node scripts/verify-root-zone.mjs   (exit 1 on drift)
// also imported by tests/tld-meta-seed.test.ts so the suite fails on drift.
import { readFileSync } from "node:fs";
import { TLD_META_SEED } from "../src/core/tld-meta-seed.generated.js";

const WEB3 = new Set(["eth", "x", "crypto", "nft", "wallet"]); // not in the dns root by design

export function verifyRootZone() {
  const rootTxt = readFileSync(new URL("../research/iana-root-zone-tlds.txt", import.meta.url), "utf8");
  const root = new Set(
    rootTxt.split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.trim().toLowerCase())
  );
  const seed = new Map(TLD_META_SEED.map((m) => [m.tld, m]));
  const notInRoot = [...seed.keys()].filter((t) => !root.has(t) && !WEB3.has(t));
  const missingFromSeed = [...root].filter((t) => !seed.has(t));
  return { rootSize: root.size, seedSize: seed.size, notInRoot, missingFromSeed,
           ok: notInRoot.length === 0 && missingFromSeed.length === 0 };
}

const { rootSize, seedSize, notInRoot, missingFromSeed, ok } = verifyRootZone();
console.log(`root zone: ${rootSize} endings | seed: ${seedSize} (5 web3 pseudo-namespaces)`);
if (notInRoot.length) {
  console.error("seed endings NOT in the root zone:", notInRoot.join(", "));
}
if (missingFromSeed.length) {
  console.error("root-zone endings missing from the seed:", missingFromSeed.join(", "));
}
if (!ok) process.exit(1);
console.log("ok: seed == root zone (+web3 namespaces)");

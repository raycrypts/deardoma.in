import test from "node:test";
import assert from "node:assert/strict";
import {
  generateHacks,
  normalizeKeyword,
  rankCandidates,
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

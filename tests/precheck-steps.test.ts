import test from "node:test";
import assert from "node:assert/strict";
import { classifyWebsite } from "../src/core/website.js";
import { parseCdx, PLATFORM_SUBDOMAIN_THRESHOLD } from "../src/core/wayback.js";
import { dedupeEmails, emailReachability } from "../src/core/email.js";
import {
  inUseScore,
  usageStatus,
  reachabilityScore,
  estimatedSuccessChance,
} from "../src/core/scores.js";

test("website: parked page with parking infra", () => {
  const v = classifyWebsite(
    `<html><title>example.com</title><body>Buy this domain. Related searches: cheap flights</body></html>`
  );
  assert.equal(v.classification, "parked");
});

test("website: for-sale listing beats live content", () => {
  const v = classifyWebsite(
    `<html><body><h1>example.com</h1><p>This domain is for sale. Make an offer.</p>` +
      `<p>${"lorem ipsum dolor sit amet ".repeat(200)}</p></body></html>`
  );
  assert.equal(v.classification, "for_sale");
});

test("website: default page and placeholder classes", () => {
  assert.equal(classifyWebsite(`<html><body>Welcome to nginx!</body></html>`).classification, "default_page");
  assert.equal(classifyWebsite(`<html><body>Under construction — coming soon</body></html>`).classification, "placeholder");
  assert.equal(classifyWebsite(null).classification, "no_site");
});

test("website: real content is live, emails and forms harvested", () => {
  const v = classifyWebsite(
    `<html><title>a real blog</title><body>${"article text ".repeat(300)}` +
      `<a href="mailto:owner@example.com">contact</a>` +
      `<form><input name="email"/><textarea name="message"></textarea></form></body></html>`
  );
  assert.equal(v.classification, "live");
  assert.deepEqual(v.emails, ["owner@example.com"]);
  assert.ok(v.contactForm);
});

test("wayback: cdx parse with subdomain breadth", () => {
  const v = parseCdx([
    ["20100301120000", "example.com/"],
    ["20150612090000", "example.com/about"],
    ["20261001080000", "docs.example.com/guide"],
  ]);
  assert.equal(v.snapshots, 3);
  assert.equal(v.firstCapture, "2010-03-01");
  assert.equal(v.lastCapture, "2026-10-01");
  assert.equal(v.distinctSubdomains, 2);
  assert.ok(v.recentActivity);
  assert.ok(PLATFORM_SUBDOMAIN_THRESHOLD === 50);
});

test("wayback: frozen history = dead site", () => {
  const v = parseCdx([["20120301120000", "example.com/"]]);
  assert.ok(!v.recentActivity);
});

test("email: dedupe + passive reachability, no probe without a verifier", async () => {
  assert.deepEqual(dedupeEmails([["A@Example.com "], ["a@example.com"], ["b@example.com"]]), ["a@example.com", "b@example.com"]);
  const v = await emailReachability("example.com", ["owner@example.com"]);
  assert.equal(v.probe.enabled, false);
  // example.com has mx in reality; assert only on the verdict shape here
  assert.equal(typeof v.reachable, "boolean");
});

test("scores: parked + long-term-parked dns = the buyable profile", () => {
  const s = inUseScore({
    website: "parked",
    wayback: { snapshots: 3, firstCapture: "2010-03-01", lastCapture: "2012-03-01", distinctSubdomains: 1, recentActivity: false },
    mxProvider: null,
    purgatory: "ok",
    dns: { longTermParked: true },
  });
  assert.ok(s <= 5, `expected near-zero use, got ${s}`);
  assert.equal(usageStatus(s), "unused");
});

test("scores: redemption drags usage down; reseller bump up", () => {
  const base = inUseScore({
    website: "default_page",
    wayback: { snapshots: 1, firstCapture: null, lastCapture: null, distinctSubdomains: 1, recentActivity: false },
    mxProvider: null,
    purgatory: "redemption",
  });
  const reseller = inUseScore({
    website: "default_page",
    wayback: { snapshots: 1, firstCapture: null, lastCapture: null, distinctSubdomains: 1, recentActivity: false },
    mxProvider: null,
    purgatory: "ok",
    ownership: { recentlyChangedHands: true },
  });
  assert.ok(reseller > base);
});

test("scores: reachability counts emails, forms, mail infra, registrar", () => {
  const good = reachabilityScore({
    emails: ["owner@example.com"],
    contactForm: true,
    mxProvider: "google_workspace",
    privacy: false,
    registrar: "namecheap",
  });
  const bad = reachabilityScore({ emails: [], contactForm: false, mxProvider: null, privacy: true, registrar: null });
  assert.ok(good > bad);
  assert.equal(estimatedSuccessChance(10, 90) > estimatedSuccessChance(90, 90), true);
});

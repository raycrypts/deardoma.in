import test from "node:test";
import assert from "node:assert/strict";
import { classifyPurgatory, DROPPED } from "../src/core/purgatory.js";
import {
  normalizeWhoisfreaks,
  normalizeWhoisxml,
  ownershipSignals,
} from "../src/core/history/whois-history.js";
import { normalizeDnsHistory, dnsPast } from "../src/core/history/dns-history.js";
import { historySignals } from "../src/core/history/index.js";
import { parseRdap } from "../src/core/history/rdap.js";

// fixtures follow the verified provider shapes (docs scraped 2026-10-18)

test("purgatory: redemption period is the negotiation moment", () => {
  const v = classifyPurgatory(["redemptionPeriod", "clientTransferProhibited"], "2026-08-01T00:00:00Z");
  assert.equal(v.stage, "redemption");
  assert.ok(v.note.includes("redemption fee"));
});

test("purgatory: pendingDelete with pendingRestore is the grey zone", () => {
  const v = classifyPurgatory(["pendingDelete", "pendingRestore"], null);
  assert.equal(v.stage, "pending_restore");
});

test("purgatory: plain pendingDelete says do not contact the owner", () => {
  const v = classifyPurgatory(["pendingDelete"], null);
  assert.equal(v.stage, "pending_delete");
  assert.ok(v.campaignAdvice.includes("drop/auction watch"));
});

test("purgatory: autoRenewPeriod is the grace window", () => {
  const v = classifyPurgatory(["autoRenewPeriod"], "2026-10-01T00:00:00Z");
  assert.equal(v.stage, "auto_renew_grace");
  // verisign rdap ships spaces: "auto renew period"
  const v2 = classifyPurgatory(["auto renew period"], null);
  assert.equal(v2.stage, "auto_renew_grace");
});

test("purgatory: hold statuses are suspensions, not the expiry walk", () => {
  const v = classifyPurgatory(["clientHold"], null);
  assert.equal(v.stage, "suspended");
});

test("purgatory: healthy domain with ubiquitous clientTransferProhibited is ok", () => {
  const v = classifyPurgatory(["clientTransferProhibited"], "2027-05-01T00:00:00Z");
  assert.equal(v.stage, "ok");
  assert.equal(DROPPED.stage, "dropped");
});

const FREAK_HISTORY = {
  status: true,
  whois: "historical",
  total_records: "3",
  whois_domains_historical: [
    {
      num: 1,
      domain_name: "example.com",
      query_time: "2015-01-10 10:00:00",
      create_date: "2005-06-01",
      expiry_date: "2016-06-01",
      domain_registrar: { iana_id: "1068", registrar_name: "namecheap, inc" },
      registrant_contact: { name: "john doe", company: "acme llc" },
    },
    {
      num: 2,
      query_time: "2020-03-04 09:12:00",
      create_date: "2005-06-01",
      expiry_date: "2021-06-01",
      domain_registrar: { iana_id: "292", registrar_name: "markmonitor inc" },
      registrant_contact: { name: "redacted for privacy", company: "privacy service" },
    },
    {
      num: 3,
      query_time: "2025-11-01 08:00:00",
      create_date: "2019-02-02",
      expiry_date: "2026-02-02",
      domain_registrar: { iana_id: "146", registrar_name: "godaddy llc" },
      registrant_contact: { name: "jane smith", company: "reseller holdings llc" },
    },
    {
      num: 4,
      query_time: "2026-06-15 12:00:00",
      create_date: "2019-02-02",
      expiry_date: "2027-02-02",
      domain_registrar: { iana_id: "100", registrar_name: "porkbun llc" },
      registrant_contact: { name: "jane smith", company: "reseller holdings llc" },
    },
  ],
};

test("whoisfreaks timeline: registrant change + re-creation detected", () => {
  const records = normalizeWhoisfreaks(FREAK_HISTORY);
  assert.equal(records.length, 4);
  assert.ok(records[1].privacy, "privacy snapshot flagged");
  const s = ownershipSignals(records);
  // privacy snapshot carries no identity: one visible change (acme -> reseller)
  assert.equal(s.registrantChanges, 1);
  assert.equal(s.lastRegistrantChange, "2025-11-01 08:00:00");
  assert.equal(s.registrarMoves, 3);
  assert.equal(s.reCreations, 1); // create_date jumped 2005 -> 2019
  assert.ok(s.recentlyChangedHands);
  assert.ok(s.serialLapser);
  assert.ok(s.registrarHopper);
});

test("whoisxml timeline: same signals from the alternate provider", () => {
  const records = normalizeWhoisxml({
    response: {
      records: [
        { checkedAt: "2015-01-10", registrarName: "namecheap", registrant_contact: { name: "john doe", organization: "acme llc" } },
        { checkedAt: "2025-11-01", registrarName: "godaddy", registrant_contact: { name: "jane smith", organization: "acme llc" } },
      ],
    },
  });
  const s = ownershipSignals(records);
  assert.equal(s.registrantChanges, 0); // same org throughout
  assert.equal(s.registrarMoves, 1);
  assert.ok(!s.recentlyChangedHands);
});

test("securitytrails: long-term parking infra is the buyable signal", () => {
  const ns = normalizeDnsHistory({
    records: [
      { first_seen: "2019-01-01", last_seen: "2026-10-01", values: [{ nameserver: "ns1.sedoparking.com" }] },
      { first_seen: "2010-01-01", last_seen: "2018-12-01", values: [{ nameserver: "ns1.example-dns.net" }] },
    ],
  });
  const a = normalizeDnsHistory({
    records: [{ first_seen: "2014-05-05", last_seen: "2026-10-01", organization: "parking co", values: [{ ip: "199.59.243.227" }] }],
  });
  const mx: [] = [];
  const past = dnsPast(ns, a, mx);
  assert.ok(past.longTermParked, "6+ year sedoparking residence");
  assert.equal(past.parkingSince, "2019-01-01");
  assert.equal(past.siteDeathDate, "2014-05-05");
});

test("history step is locked for free pre-checks", async () => {
  const r = await historySignals("example.com", { paid: false });
  assert.ok(r.locked);
  assert.ok(r.locked.includes("paid pre-check"));
});

test("history step degrades to skipped without keys", async () => {
  const r = await historySignals("example.com", { paid: true });
  assert.ok(r.skipped.some((s) => s.startsWith("whoisfreaks")));
  assert.ok(r.skipped.some((s) => s.startsWith("securitytrails")));
  assert.equal(r.errors.length, 0);
});

test("rdap parse: registrar, dates, status, privacy", () => {
  const d = parseRdap({
    status: ["client transfer prohibited"],
    events: [
      { eventAction: "registration", eventDate: "2005-06-01T00:00:00Z" },
      { eventAction: "expiration", eventDate: "2027-06-01T00:00:00Z" },
      { eventAction: "last changed", eventDate: "2026-01-02T00:00:00Z" },
    ],
    entities: [
      {
        roles: ["registrar"],
        vcardArray: ["vcard", [["fn", {}, {}, "example registrar, inc"]]],
      },
      {
        roles: ["registrant"],
        vcardArray: ["vcard", [["fn", {}, {}, "redacted for privacy"]]],
      },
    ],
    nameservers: [{ ldhName: "NS1.Example.COM" }],
  });
  assert.equal(d.registrar, "example registrar, inc");
  assert.equal(d.created, "2005-06-01T00:00:00Z");
  assert.equal(d.expires, "2027-06-01T00:00:00Z");
  assert.deepEqual(d.status, ["client transfer prohibited"]);
  assert.deepEqual(d.nameservers, ["ns1.example.com"]);
  assert.ok(d.privacy);
});

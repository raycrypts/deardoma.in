import test from "node:test";
import assert from "node:assert/strict";
import {
  openingFor,
  nextCounter,
  respondToAsk,
  MAX_COUNTERS,
} from "../src/core/negotiation.js";

test("default opening is ~60% of max; explicit opening wins", () => {
  assert.equal(openingFor(30), 18);
  assert.equal(openingFor(30, 25), 25);
});

test("ask at or below max is accepted", () => {
  assert.deepEqual(
    respondToAsk({ ask: 30, maxOffer: 30, lastOffer: 18, countersUsed: 0, finalOfferSent: false }),
    { action: "accept" }
  );
  assert.deepEqual(
    respondToAsk({ ask: 25, maxOffer: 30, lastOffer: 18, countersUsed: 1, finalOfferSent: false }),
    { action: "accept" }
  );
});

test("counters move toward max in decreasing steps, never past it", () => {
  assert.equal(nextCounter(30, 18, 0), 21);        // +25% of the 12 gap
  assert.equal(nextCounter(30, 21, 1), 22.35);    // +15% of the 9 gap
  assert.equal(nextCounter(30, 22.35, 2), null);  // max 2 counters
  assert.equal(MAX_COUNTERS, 2);
});

test("above max: counter while available, final offer at max once, then handoff", () => {
  assert.deepEqual(
    respondToAsk({ ask: 100, maxOffer: 30, lastOffer: 18, countersUsed: 0, finalOfferSent: false }),
    { action: "counter", amount: 21 }
  );
  assert.deepEqual(
    respondToAsk({ ask: 100, maxOffer: 30, lastOffer: 22.35, countersUsed: 2, finalOfferSent: false }),
    { action: "final_offer", amount: 30 } // max is the ceiling and is never exceeded
  );
  assert.deepEqual(
    respondToAsk({ ask: 100, maxOffer: 30, lastOffer: 30, countersUsed: 2, finalOfferSent: true }),
    { action: "handoff_to_buyer" }
  );
});

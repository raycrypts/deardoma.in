import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  assertTransition,
  TERMINAL_STATES,
  TIMEOUTS,
  type CampaignState,
} from "../src/core/state-machine.js";

test("happy path: created -> ... -> completed (spec 4)", () => {
  const path: CampaignState[] = [
    "created", "prechecked", "deployed", "contacting", "awaiting_reply",
    "replied", "negotiating", "agreed", "payment_pending",
    "transfer_pending", "completed",
  ];
  for (let i = 1; i < path.length; i++) {
    assert.ok(canTransition(path[i - 1], path[i]), `${path[i - 1]} -> ${path[i]}`);
  }
});

test("follow-up path also legal: awaiting_reply -> followed_up -> replied", () => {
  assert.ok(canTransition("awaiting_reply", "followed_up"));
  assert.ok(canTransition("followed_up", "replied"));
  assert.ok(canTransition("followed_up", "no_response"));
});

test("illegal jumps rejected", () => {
  assert.equal(canTransition("created", "agreed"), false);
  assert.throws(() => assertTransition("created", "agreed"));
  assert.equal(canTransition("completed", "negotiating"), false);
  assert.equal(canTransition("no_response", "negotiating"), false);
});

test("any state -> opted_out, and opted_out is terminal (spec 2: respect a no)", () => {
  assert.ok(canTransition("negotiating", "opted_out"));
  assert.ok(canTransition("created", "opted_out"));
  assert.equal(canTransition("opted_out", "created"), false);
  assert.ok(TERMINAL_STATES.includes("opted_out"));
});

test("timeouts match the spec defaults", () => {
  assert.equal(TIMEOUTS.followUpAfterDays, 4);
  assert.equal(TIMEOUTS.noResponseAfterDays, 7);
  assert.equal(TIMEOUTS.staleAfterDays, 7);
});

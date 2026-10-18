import test from "node:test";
import assert from "node:assert/strict";
import {
  usableRoutes,
  asksOwnershipFirst,
  withinLimits,
  ROUTE_LIMITS,
  ROUTE_PRIORITY,
} from "../src/core/contact-routes.js";

test("routes sort by priority (spec 6) and drop below 0.4 confidence (spec 7)", () => {
  const routes = [
    { type: "common_address" as const, confidence: 0.8 },
    { type: "whois_email" as const, confidence: 0.95 },
    { type: "github_owner" as const, confidence: 0.3 },
  ];
  const sorted = usableRoutes(routes);
  assert.deepEqual(
    sorted.map((r) => r.type),
    ["whois_email", "common_address"]
  );
});

test("below 0.7 the first message asks about ownership (spec 7)", () => {
  assert.equal(asksOwnershipFirst(0.5), true);
  assert.equal(asksOwnershipFirst(0.8), false);
});

test("per-deployment limits: 3 routes, 2 per route, 6 total (spec 6)", () => {
  assert.equal(ROUTE_LIMITS.maxRoutes, 3);
  assert.equal(ROUTE_LIMITS.maxMessagesPerRoute, 2);
  assert.equal(ROUTE_LIMITS.maxMessagesTotal, 6);
  assert.equal(withinLimits(2, 5), true);
  assert.equal(withinLimits(3, 0), false);
  assert.equal(withinLimits(0, 6), false);
});

test("priority order matches the spec", () => {
  assert.equal(ROUTE_PRIORITY[0], "whois_email");
  assert.equal(ROUTE_PRIORITY.indexOf("catchall") < ROUTE_PRIORITY.indexOf("common_address"), true);
  assert.equal(ROUTE_PRIORITY.indexOf("registrar_form") < ROUTE_PRIORITY.indexOf("site_form"), true);
  assert.equal(ROUTE_PRIORITY[ROUTE_PRIORITY.length - 1], "buyer_handoff");
});

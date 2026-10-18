// Contact routes (spec sections 6 + 7). Priority order, per-deployment
// limits, and confidence gates. Pure functions — no I/O.

export type RouteType =
  | "whois_email" // 1. verified owner email from strong evidence
  | "github_owner" //    (github match / site-listed)
  | "site_email"
  | "catchall" //       2. catch-all domain email (hello@ / contact@)
  | "common_address" // 3. verified common address (spec 5.6 checks)
  | "privacy_forward" //4. privacy forwarding email from registration data
  | "registrar_form" // 5. registrar contact form
  | "site_form" //      6. site contact form
  | "buyer_handoff"; // 7. buyer-sent handoff (optional paid add-on)

export const ROUTE_PRIORITY: RouteType[] = [
  "whois_email",
  "github_owner",
  "site_email",
  "catchall",
  "common_address",
  "privacy_forward",
  "registrar_form",
  "site_form",
  "buyer_handoff",
];

export const ROUTE_LIMITS = {
  maxRoutes: 3,
  maxMessagesPerRoute: 2,
  maxMessagesTotal: 6,
};

// Confidence gates (spec 7): below 0.7 the first message asks
// "are you the owner?" instead of making an offer; below 0.4 don't use it.
export const CONFIDENCE = { useThreshold: 0.4, askOwnershipBelow: 0.7 };

export function usableRoutes<T extends { type: RouteType; confidence: number }>(
  routes: T[]
): T[] {
  return routes
    .filter((r) => r.confidence >= CONFIDENCE.useThreshold)
    .sort(
      (a, b) =>
        ROUTE_PRIORITY.indexOf(a.type) - ROUTE_PRIORITY.indexOf(b.type)
    );
}

export function asksOwnershipFirst(confidence: number): boolean {
  return confidence < CONFIDENCE.askOwnershipBelow;
}

export function withinLimits(
  routesTried: number,
  messagesSent: number
): boolean {
  return (
    routesTried < ROUTE_LIMITS.maxRoutes &&
    messagesSent < ROUTE_LIMITS.maxMessagesTotal
  );
}

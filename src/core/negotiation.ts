// Negotiation policy (spec 8.2). Pure functions — no I/O.
// max_offer is a hard ceiling and is NEVER revealed to the seller.

export const MAX_COUNTERS = 2;
const round2 = (n: number) => Math.round(n * 100) / 100;

// Default opening: ~60% of max (spec 8.2).
export function openingFor(maxOffer: number, openingOffer?: number): number {
  return round2(openingOffer ?? maxOffer * 0.6);
}

// At most 2 counter-offers, each moving toward max in smaller steps:
// 25% of the remaining gap first, then 15%.
export function nextCounter(
  maxOffer: number,
  lastOffer: number,
  countersUsed: number
): number | null {
  if (countersUsed >= MAX_COUNTERS) return null;
  const gap = maxOffer - lastOffer;
  if (gap <= 0) return null;
  const step = countersUsed === 0 ? 0.25 : 0.15;
  return round2(lastOffer + gap * step);
}

export type NegotiationDecision =
  | { action: "accept" }
  | { action: "counter"; amount: number }
  | { action: "final_offer"; amount: number }
  | { action: "handoff_to_buyer" };

// Seller's ask at/below max: accept. Above max: counter until exhausted,
// then offer max once as final; if they still decline, hand off to the buyer.
export function respondToAsk(args: {
  ask: number;
  maxOffer: number;
  lastOffer: number;
  countersUsed: number;
  finalOfferSent: boolean;
}): NegotiationDecision {
  const { ask, maxOffer, lastOffer, countersUsed, finalOfferSent } = args;
  if (ask <= maxOffer) return { action: "accept" };
  if (finalOfferSent) return { action: "handoff_to_buyer" };
  const counter = nextCounter(maxOffer, lastOffer, countersUsed);
  if (counter !== null && counter > lastOffer) {
    return { action: "counter", amount: counter };
  }
  return { action: "final_offer", amount: maxOffer };
}

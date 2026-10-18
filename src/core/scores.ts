// pre-check step 5.7: fold the collected signals into the two product
// scores. deterministic, explainable, no black boxes — every point is
// traceable to a signal so the buyer dashboard can show WHY.
//
// in_use_score (0-100): how much the current owner is actually using the
//   domain. low = buyable (parked/dead names are the whole point).
// reachability_score (0-100): can we find and reach a human who can sell.

import type { WebsiteClass } from "./website.js";
import type { WaybackVerdict } from "./wayback.js";
import type { PurgatoryVerdict } from "./purgatory.js";

export interface UseInputs {
  website: WebsiteClass;
  wayback: WaybackVerdict;
  mxProvider: string | null;
  purgatory: PurgatoryVerdict["stage"];
  ownership?: { recentlyChangedHands: boolean };
  dns?: { longTermParked: boolean };
}

export interface ReachInputs {
  emails: string[];
  contactForm: boolean;
  mxProvider: string | null;
  privacy: boolean;
  registrar: string | null;
}

const WEBSITE_USE: Record<WebsiteClass, number> = {
  parked: 0,
  for_sale: 10,
  no_site: 15,
  placeholder: 20,
  default_page: 20,
  live: 65,
};

export function inUseScore(i: UseInputs): number {
  let s = WEBSITE_USE[i.website] ?? 50;
  // wayback recency: recent captures mean a living site
  if (i.wayback.recentActivity) s += 20;
  // real mailbox infra counts as use even when the site is thin
  if (i.mxProvider && !/forwarding|registrar/i.test(i.mxProvider)) s += 10;
  // long-term parking infra overrides everything upward: 6+ months on
  // parking nameservers is the single best buyable signal
  if (i.dns?.longTermParked) s = Math.min(s, 5);
  // purgatory: the owner has stopped renewing — usage is lapsing
  if (i.purgatory === "redemption" || i.purgatory === "pending_delete" || i.purgatory === "pending_restore") {
    s -= 25;
  } else if (i.purgatory === "auto_renew_grace") {
    s -= 10;
  }
  // recently changed hands = likely reseller actively managing it
  if (i.ownership?.recentlyChangedHands) s += 10;
  return Math.max(0, Math.min(100, s));
}

export function usageStatus(score: number): "unused" | "lightly_used" | "actively_used" {
  if (score < 25) return "unused";
  if (score < 60) return "lightly_used";
  return "actively_used";
}

export function reachabilityScore(i: ReachInputs): number {
  let s = 0;
  s += Math.min(35, i.emails.length * 15); // harvested owner emails
  if (i.contactForm) s += 15;
  if (i.mxProvider && !/registrar/i.test(i.mxProvider)) s += 10; // real mail infra
  else if (i.mxProvider) s += 5; // forwarding at least accepts mail
  if (i.registrar) s += 10; // registrar known: transfer path exists
  if (i.privacy) s -= 10; // privacy shield: contact routes get indirect
  if (i.emails.length === 0 && !i.contactForm && !i.mxProvider) s = Math.max(s, 0);
  return Math.max(0, Math.min(100, s));
}

export function estimatedSuccessChance(inUse: number, reach: number): number {
  // micro-deal odds: buyable (low use) + reachable = likely; either one weak
  // drags it down. expressed as a 0-1 probability for the dashboard.
  const buyability = (100 - inUse) / 100;
  const reachability = reach / 100;
  return Math.round(buyability * 0.6 + reachability * 0.4 * buyability * 100) / 100;
}

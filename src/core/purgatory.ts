// domain purgatory (in-house name for the post-expiry lifecycle walk).
// free signal: classifies only what rdap exposes. deep purgatory detail and
// whois history are paid signals (research/history-providers.md) and live in
// core/history, gated behind the paid pre-check.
//
// sources: icann epp status codes + gtld lifecycle (research/domain-purgatory.md,
// scraped 2026-10-18). ccTLDs do NOT follow the gTLD timeline — per-registry
// checks required; this classifier is authoritative for EPP/gTLD registries and
// best-effort otherwise.

export type PurgatoryStage =
  | "ok"
  | "auto_renew_grace"
  | "redemption"
  | "pending_restore"
  | "pending_delete"
  | "suspended"
  | "dropped";

export interface PurgatoryVerdict {
  stage: PurgatoryStage;
  daysPastExpiry: number | null;
  note: string;
  campaignAdvice: string;
}

const HOLD = new Set(["clienthold", "serverhold", "pendingupdate", "inactive"]);

// rdap status strings may contain spaces ("auto renew period" at verisign)
function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_-]/g, "");
}

export function classifyPurgatory(
  statusCodes: string[],
  expiryDate: string | null
): PurgatoryVerdict {
  const st = new Set(statusCodes.map(norm));
  const daysPastExpiry = expiryDate
    ? Math.floor((Date.now() - Date.parse(expiryDate)) / 86_400_000)
    : null;

  // pendingDelete may be mixed with redemptionPeriod or pendingRestore; the
  // paired status decides which rules apply (icann epp table)
  if (st.has("pendingdelete")) {
    if (st.has("pendingrestore")) {
      return {
        stage: "pending_restore",
        daysPastExpiry,
        note: "restore requested but restoration documentation not yet delivered; reverts to redemption if the 7-day window is missed",
        campaignAdvice: "grey zone: owner (via registrar) may still restore; wait for the window to resolve",
      };
    }
    return {
      stage: "pending_delete",
      daysPastExpiry,
      note: "locked, no restore possible; purged after the ~5-day window",
      campaignAdvice: "do not contact the owner for this cycle; shift the campaign to a drop/auction watch",
    };
  }
  if (st.has("redemptionperiod")) {
    return {
      stage: "redemption",
      daysPastExpiry,
      note: "registrar asked the registry to delete the name; restore possible via the registrar, usually with a redemption fee (icann expired registration recovery policy)",
      campaignAdvice: "owner has let it go but can still restore for a fee — a good negotiation moment, or watch for the drop",
    };
  }
  if (st.has("pendingrestore")) {
    return {
      stage: "pending_restore",
      daysPastExpiry,
      note: "restore in progress; 7-day documentation window",
      campaignAdvice: "wait; this resolves to restored or back to redemption",
    };
  }
  if (st.has("autorenewperiod") || st.has("renewperiod")) {
    // autoRenewPeriod: registrar may still renew at normal price; many
    // registrars auction the name during this window
    return {
      stage: "auto_renew_grace",
      daysPastExpiry,
      note: "auto-renew grace (0-45 days typical): renewable at normal price; registrar may be auctioning it right now",
      campaignAdvice: "expiring: suggest an expiry watch; the cheapest path may be the registrar auction, not the owner",
    };
  }
  for (const h of HOLD) {
    if (st.has(h)) {
      return {
        stage: "suspended",
        daysPastExpiry,
        note: `held (${h}): registry or registrar suspension, not the normal expiry walk`,
        campaignAdvice: "suspended names are in dispute, quarantine or neglect — investigate before contacting",
      };
    }
  }
  // expiry passed but no explicit walk status yet: early grace by dates only
  if (daysPastExpiry != null && daysPastExpiry > 0 && st.size === 0) {
    return {
      stage: "auto_renew_grace",
      daysPastExpiry,
      note: "expiry date passed without explicit epp walk status (date-based inference)",
      campaignAdvice: "expiring: suggest an expiry watch",
    };
  }
  return {
    stage: "ok",
    daysPastExpiry,
    note: "registered, no expiry-walk status present",
    campaignAdvice: "normal owner-contact campaign",
  };
}

// a 404 from rdap means the name is gone from the registry: dropped
export const DROPPED: PurgatoryVerdict = {
  stage: "dropped",
  daysPastExpiry: null,
  note: "no rdap record: purged from the registry, available first-come-first-served (or caught by a drop-catcher)",
  campaignAdvice: "register it or check the drop-catchers' inventories — no owner to contact",
};

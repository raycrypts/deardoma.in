// viability gate: targets donna puts her hands up on BEFORE any paid work,
// and never charges for. three classes:
//
// 1. registry-reserved: names the registry itself holds (nic., dns., whois.,
//    www., registry.) — these are the registry's own infrastructure and are
//    simply not for sale.
// 2. third-level-only registries: the registry never sells the root name
//    (e.g. .il, .th, .za — you can own co.il, never foo.il root). a "buy
//    foo.il" request is impossible, not just unlikely.
// 3. platform domains: the domain IS an established product's infrastructure
//    (lu.ma model: thousands of customer subdomains/paths; a sale would break
//    every lu.ma/eventname url that exists). the owner's incentive to sell is
//    effectively zero and it would destroy their business — a fool's errand,
//    so donna refuses instead of running a doomed campaign.
//
// the same gate runs at pre-check intake, campaign intake, and again inside
// the worker (belt over suspenders). refusal never charges.

export type RefusalClass = "registry_reserved" | "third_level_only" | "platform_domain";

export interface ViabilityVerdict {
  viable: boolean;
  refusal?: RefusalClass;
  reason?: string;
  charged: boolean; // always false on refusal
}

// registry-essential labels: infrastructure names every registry holds back
const REGISTRY_LABELS = new Set(["nic", "dns", "whois", "www", "registry"]);

// registries that only sell third-level names (research: cctld-second-level
// dataset, domainhacks branch). extend from that dataset, never from memory.
const THIRD_LEVEL_ONLY = new Set(["il", "th", "za"]);

// curated platform domains: short-link/event platforms whose entire product
// is urls under this domain. verified brands, extend with care.
const PLATFORM_DOMAINS = new Set([
  "lu.ma",
  "bit.ly",
  "t.co",
  "tinyurl.com",
  "cutt.ly",
  "is.gd",
  "rb.gy",
  "shorturl.at",
  "rebrand.ly",
  "short.io",
  "ow.ly",
  "lnkd.in",
  "youtu.be",
]);

export function viability(fqdn: string): ViabilityVerdict {
  const d = fqdn.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const parts = d.split(".");
  const tld = parts.slice(-1)[0] ?? "";
  const label = parts.length > 1 ? parts.slice(-2)[0] : "";

  // platform domains: check the registrable base, so event.lu.ma or
  // short.io-style subdomains don't slip past
  const registrableBase = parts.slice(-2).join(".");
  if (PLATFORM_DOMAINS.has(registrableBase) || PLATFORM_DOMAINS.has(d)) {
    return {
      viable: false,
      refusal: "platform_domain",
      reason: `this domain is an established platform's product infrastructure (every ${registrableBase}/... url would break on a sale); its owner will not sell it — putting my hands up, no charge`,
      charged: false,
    };
  }

  // registry-reserved infrastructure names
  if (parts.length >= 2 && REGISTRY_LABELS.has(label)) {
    return {
      viable: false,
      refusal: "registry_reserved",
      reason: `this name is the registry's own infrastructure (${label}.${tld}) and is reserved by the registry — putting my hands up, no charge`,
      charged: false,
    };
  }

  // third-level-only registries: the root name cannot be owned at all
  if (parts.length === 2 && THIRD_LEVEL_ONLY.has(tld)) {
    return {
      viable: false,
      refusal: "third_level_only",
      reason: `the .${tld} registry only sells third-level names (you can own co.${tld}, never a .${tld} root) — putting my hands up, no charge`,
      charged: false,
    };
  }

  return { viable: true, charged: false };
}

// Tld metadata (spec 12.3/12.4). the seed is generated from researched
// datasets (scripts/gen-tld-seed.mjs from research/*.json) so every
// availability/restriction call carries its citation and access date.
// prices are ballpark first-year usd where observed — verify before launch.

export interface TldMeta {
  tld: string;
  tldType:
    | "cctld"
    | "gtld_legacy"
    | "gtld_new"
    | "sponsored"
    | "brand"
    | "infrastructure"
    | "web3";
  operatorCountry?: string | null;
  googleTreatsAsGeneric?: boolean | null; // ccTLDs google treats as generic (spec 12.6)
  registrablePublicly: boolean;
  restriction:
    | "none"
    | "local_presence"
    | "residency"
    | "verification"
    | "closed"
    | "unknown"; // availability unverified — treat as restricted until checked
  restrictionNote: string;
  riskNote?: string | null;
  typicalPrice?: number | null;
  renewalPrice?: number | null;
  rdapSupported?: boolean | null;
  namespace?: string | null; // web3 only: ens | unstoppable
  // root availability: some registries never register label.tld at all
  // (e.g. .il only offers co.il, org.il...) — hacks under them are impossible
  secondLevelRegistrable?: boolean | null; // null = unchecked
  thirdLevelNamespaces?: string[] | null;
  // practical registration route: who can actually buy this ending
  registrationRoute?:
    | "direct"
    | "intermediary" // trustee / local presence / registered agent service
    | "business_presence" // a legal entity in the country qualifies
    | "personal_presence_only" // real resident/citizen/nexus; no trustee workaround
    | "unavailable"
    | "unknown";
  intermediaryNote?: string | null;
  intermediaryFee?: number | null; // usd/yr ballpark where observed
  businessPresenceAccepted?: boolean | null;
  // research provenance (spec 12.3: citations kept exactly as gathered)
  flags?: string[]; // sanctioned | browser_or_platform_blocks | free_registry_history | discontinued | sovereignty_risk | hsts_preloaded | web3
  sourceUrl?: string | null;
  accessed?: string | null;
  verified?: boolean;
  restrictionVerified?: boolean; // false => availability unverified, treat as restricted
}

export { TLD_META_SEED } from "./tld-meta-seed.generated.js";

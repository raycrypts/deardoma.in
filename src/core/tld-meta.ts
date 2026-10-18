// Hand-maintained tld metadata (spec 12.3/12.4). Seed rows — verify each
// price and rule before launch; prices are ballpark first-year usd.
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
  operatorCountry?: string;
  googleTreatsAsGeneric?: boolean; // cctlds google treats as generic (spec 12.6)
  registrablePublicly: boolean;
  restriction: "none" | "local_presence" | "residency" | "verification" | "closed";
  restrictionNote: string;
  riskNote?: string;
  typicalPrice?: number;
  renewalPrice?: number;
  rdapSupported?: boolean;
  namespace?: string; // web3 only: ens | unstoppable
}

export const TLD_META_SEED: TldMeta[] = [
  // legacy gtlds — baseline
  { tld: "com", tldType: "gtld_legacy", registrablePublicly: true, restriction: "none", restrictionNote: "baseline", typicalPrice: 10, renewalPrice: 15, rdapSupported: true },
  { tld: "net", tldType: "gtld_legacy", registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 12, renewalPrice: 15, rdapSupported: true },
  { tld: "org", tldType: "gtld_legacy", registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 10, renewalPrice: 15, rdapSupported: true },
  // new gtlds
  { tld: "dev", tldType: "gtld_new", registrablePublicly: true, restriction: "none", restrictionNote: "https-only (hsts preloaded)", typicalPrice: 12, renewalPrice: 15, rdapSupported: true },
  { tld: "app", tldType: "gtld_new", registrablePublicly: true, restriction: "none", restrictionNote: "https-only (hsts preloaded)", typicalPrice: 14, renewalPrice: 18, rdapSupported: true },
  { tld: "xyz", tldType: "gtld_new", registrablePublicly: true, restriction: "none", restrictionNote: "open", riskNote: "wide abuse-band spread — see radar", typicalPrice: 2, renewalPrice: 13, rdapSupported: true },
  { tld: "link", tldType: "gtld_new", registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 10, renewalPrice: 15, rdapSupported: true },
  { tld: "page", tldType: "gtld_new", registrablePublicly: true, restriction: "none", restrictionNote: "https-only (hsts preloaded)", typicalPrice: 10, renewalPrice: 14, rdapSupported: true },
  // cctlds — the hack workhorses
  { tld: "io", tldType: "cctld", operatorCountry: "british indian ocean territory", googleTreatsAsGeneric: true, registrablePublicly: true, restriction: "none", restrictionNote: "open", riskNote: "possible future change after the chagos sovereignty transfer (spec 12.3)", typicalPrice: 35, renewalPrice: 60, rdapSupported: true },
  { tld: "us", tldType: "cctld", operatorCountry: "united states", registrablePublicly: true, restriction: "local_presence", restrictionNote: "requires a us nexus", typicalPrice: 8, renewalPrice: 10, rdapSupported: true },
  { tld: "ca", tldType: "cctld", operatorCountry: "canada", registrablePublicly: true, restriction: "local_presence", restrictionNote: "canadian presence requirements", typicalPrice: 12, renewalPrice: 16, rdapSupported: true },
  { tld: "eu", tldType: "cctld", operatorCountry: "european union", registrablePublicly: true, restriction: "residency", restrictionNote: "eu/eea residency or citizenship", typicalPrice: 8, renewalPrice: 10, rdapSupported: true },
  { tld: "ie", tldType: "cctld", operatorCountry: "ireland", registrablePublicly: true, restriction: "local_presence", restrictionNote: "document-checked connection to ireland", typicalPrice: 10, renewalPrice: 14, rdapSupported: true },
  { tld: "de", tldType: "cctld", operatorCountry: "germany", registrablePublicly: true, restriction: "verification", restrictionNote: "holder verification under nis2", typicalPrice: 8, renewalPrice: 10, rdapSupported: true },
  { tld: "au", tldType: "cctld", operatorCountry: "australia", registrablePublicly: true, restriction: "local_presence", restrictionNote: "australian presence required", typicalPrice: 15, renewalPrice: 20, rdapSupported: true },
  { tld: "ly", tldType: "cctld", operatorCountry: "libya", registrablePublicly: true, restriction: "none", restrictionNote: "open", riskNote: "history of registry and political issues (spec 12.3)", typicalPrice: 30, renewalPrice: 60 },
  { tld: "in", tldType: "cctld", operatorCountry: "india", registrablePublicly: true, restriction: "none", restrictionNote: "open; check renewal pricing", typicalPrice: 8, renewalPrice: 15, rdapSupported: true },
  { tld: "er", tldType: "cctld", operatorCountry: "eritrea", registrablePublicly: false, restriction: "closed", restrictionNote: "not open to public registration" },
  { tld: "me", tldType: "cctld", operatorCountry: "montenegro", googleTreatsAsGeneric: true, registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 15, renewalPrice: 20, rdapSupported: true },
  { tld: "tv", tldType: "cctld", operatorCountry: "tuvalu", googleTreatsAsGeneric: true, registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 30, renewalPrice: 35, rdapSupported: true },
  { tld: "co", tldType: "cctld", operatorCountry: "colombia", googleTreatsAsGeneric: true, registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 10, renewalPrice: 30, rdapSupported: true },
  { tld: "is", tldType: "cctld", operatorCountry: "iceland", registrablePublicly: true, restriction: "local_presence", restrictionNote: "iceland presence required (exceptions listed by the registry)", typicalPrice: 40, renewalPrice: 45 },
  { tld: "it", tldType: "cctld", operatorCountry: "italy", registrablePublicly: true, restriction: "local_presence", restrictionNote: "eu presence required", typicalPrice: 8, renewalPrice: 10 },
  { tld: "at", tldType: "cctld", operatorCountry: "austria", registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 10, renewalPrice: 14 },
  { tld: "so", tldType: "cctld", operatorCountry: "somalia", registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 8, renewalPrice: 10 },
  { tld: "to", tldType: "cctld", operatorCountry: "tonga", registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 20, renewalPrice: 35 },
  { tld: "gg", tldType: "cctld", operatorCountry: "guernsey", registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 40, renewalPrice: 40 },
  { tld: "sh", tldType: "cctld", operatorCountry: "saint helena", registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 40, renewalPrice: 55 },
  { tld: "cc", tldType: "cctld", operatorCountry: "cocos (keeling) islands", googleTreatsAsGeneric: true, registrablePublicly: true, restriction: "none", restrictionNote: "open", typicalPrice: 10, renewalPrice: 15 },
  // sponsored / brand / infrastructure — closed
  { tld: "gov", tldType: "sponsored", registrablePublicly: false, restriction: "closed", restrictionNote: "eligible institutions only" },
  { tld: "edu", tldType: "sponsored", registrablePublicly: false, restriction: "closed", restrictionNote: "eligible institutions only" },
  { tld: "mil", tldType: "sponsored", registrablePublicly: false, restriction: "closed", restrictionNote: "eligible institutions only" },
  { tld: "google", tldType: "brand", registrablePublicly: false, restriction: "closed", restrictionNote: "owned by a single company" },
  { tld: "arpa", tldType: "infrastructure", registrablePublicly: false, restriction: "closed", restrictionNote: "never shown" },
  // web3 namespaces (spec 12.7) — hidden unless the toggle is on
  { tld: "eth", tldType: "web3", registrablePublicly: true, restriction: "none", restrictionNote: "ens: yearly rent", namespace: "ens" },
  { tld: "x", tldType: "web3", registrablePublicly: true, restriction: "none", restrictionNote: "unstoppable: one-time mint, no renewals", namespace: "unstoppable" },
  { tld: "crypto", tldType: "web3", registrablePublicly: true, restriction: "none", restrictionNote: "unstoppable: one-time mint, no renewals", namespace: "unstoppable" },
  { tld: "nft", tldType: "web3", registrablePublicly: true, restriction: "none", restrictionNote: "unstoppable: one-time mint, no renewals", namespace: "unstoppable" },
  { tld: "wallet", tldType: "web3", registrablePublicly: true, restriction: "none", restrictionNote: "unstoppable: one-time mint, no renewals", namespace: "unstoppable" },
];

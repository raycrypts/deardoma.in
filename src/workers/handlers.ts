import { pool } from "../db.js";

type Payload = Record<string, unknown>;

// tld_sync (spec 12.1): weekly iana root-zone + public suffix list refresh.
async function tldSync() {
  // TODO: fetch https://data.iana.org/TLD-list/tlds-alpha-by-domain.txt and the
  // PSL; upsert tld_meta. types come from iana; brand tlds and web3 namespaces
  // are tagged by hand (spec 12.4). restriction/policy research: querit + tavily;
  // pricing observations: firecrawl (registrar pages), each with an observed-on date.
}

// radar_sync (spec 12.5): read-only sync of the existing thetldradar dataset
// (github.com/tinkrland/themailtell, `thetldradar` branch). keep citations and
// dates exactly as published. licensing/credit is an open question (spec 20).
async function radarSync() {
  // TODO: pull the thetldradar dataset into tld_radar (axis per row, citation,
  // verified_on preserved as-is). price observations go stale in weeks; abuse
  // bands in months — re-check on each row's own cadence.
}

// availability (spec 12.2): rdap first, whois fallback.
async function availability(payload: Payload) {
  // TODO: rdap lookup (bootstrap via rdap.org), whois fallback for endings
  // without rdap. cache in availability_cache: 1h for available, 24h for taken.
  // rate-limit by ip and by session.
}

// web3_availability (spec 12.7): ens + unstoppable, toggle-gated only.
async function web3Availability(payload: Payload) {
  // TODO: ens registrar contract / subgraph (yearly rent) and the unstoppable
  // domains api (one-time mint). only run when the web3 toggle is on, so the
  // free finder stays cheap. taken names link to their marketplace listing.
}

export const handlers: Record<
  string,
  (payload: Payload) => Promise<void>
> = {
  tld_sync: tldSync,
  radar_sync: radarSync,
  availability,
  web3_availability: web3Availability,
};

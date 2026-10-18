// whois history providers, normalized to one record shape.
// whoisfreaks: the complete ownership timeline (best coverage, 1986+).
// whoisxml api: history + monitors (ownership-change detection alerts).
// shapes verified against provider docs 2026-10-18:
//   whoisfreaks: GET api.whoisfreaks.com/v2.0/whois/history?domainName=..&apiKey=..
//   whoisxml:   GET www.whoisxmlapi.com/whoisserver/WhoisHistoryService?apiKey=..&domainName=..

export interface HistoryRecord {
  date: string | null; // when this whois snapshot was taken
  registrar: string | null;
  registrantName: string | null;
  registrantOrg: string | null;
  privacy: boolean;
  created: string | null;
  expires: string | null;
}

export interface OwnershipSignals {
  records: number;
  registrantChanges: number;
  lastRegistrantChange: string | null;
  registrarMoves: number;
  reCreations: number; // create_date jumps forward = dropped and re-registered
  recentlyChangedHands: boolean;
  serialLapser: boolean;
  registrarHopper: boolean;
}

const PRIVACY_RE = /redact|privacy|withheld|whoisguard|data protected/i;

function identity(r: HistoryRecord): string {
  // privacy-masked snapshots carry no identity; only compare when we can see one
  if (r.privacy || (!r.registrantOrg && !r.registrantName)) return "__opaque__";
  return (r.registrantOrg ?? r.registrantName ?? "").toLowerCase().trim();
}

export function ownershipSignals(records: HistoryRecord[]): OwnershipSignals {
  // providers return newest-first or oldest-first; sort by snapshot date
  const rs = [...records].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? "")
  );
  let registrantChanges = 0;
  let lastRegistrantChange: string | null = null;
  let prev: string | null = null;
  for (const r of rs) {
    const id = identity(r);
    if (id === "__opaque__") continue; // masked snapshot: no identity evidence
    if (prev !== null && id !== prev) {
      registrantChanges++;
      lastRegistrantChange = r.date;
    }
    prev = id;
  }
  let registrarMoves = 0;
  let prevRegistrar: string | null = null;
  for (const r of rs) {
    const reg = (r.registrar ?? "").toLowerCase().trim() || null;
    if (reg && prevRegistrar && reg !== prevRegistrar) registrarMoves++;
    if (reg) prevRegistrar = reg;
  }
  // re-creation: create_date jumps forward between consecutive snapshots
  let reCreations = 0;
  let prevCreated: string | null = null;
  for (const r of rs) {
    if (r.created && prevCreated && r.created > prevCreated) reCreations++;
    if (r.created) prevCreated = r.created;
  }
  const last = rs[rs.length - 1];
  const recentlyChangedHands =
    registrantChanges > 0 &&
    !!lastRegistrantChange &&
    Date.now() - Date.parse(lastRegistrantChange) < 365 * 86_400_000;
  return {
    records: rs.length,
    registrantChanges,
    lastRegistrantChange,
    registrarMoves,
    reCreations,
    recentlyChangedHands,
    serialLapser: reCreations > 0 || registrarMoves >= 3,
    registrarHopper: registrarMoves >= 3,
    ...(last ? {} : {}),
  };
}

// ---- whoisfreaks (v2.0) ----

interface FreakRec {
  query_time?: string;
  create_date?: string;
  expiry_date?: string;
  domain_registrar?: { registrar_name?: string };
  registrant_contact?: { name?: string; company?: string };
}

export function normalizeWhoisfreaks(j: Record<string, unknown>): HistoryRecord[] {
  const recs = (j.whois_domains_historical ?? []) as FreakRec[];
  return recs.map((r) => {
    const name = r.registrant_contact?.name ?? null;
    const org = r.registrant_contact?.company ?? null;
    return {
      date: r.query_time ?? null,
      registrar: r.domain_registrar?.registrar_name ?? null,
      registrantName: name,
      registrantOrg: org,
      privacy: PRIVACY_RE.test(`${name ?? ""} ${org ?? ""}`),
      created: r.create_date ?? null,
      expires: r.expiry_date ?? null,
    };
  });
}

// ---- whoisxml api ----

interface XmlRec {
  checkedAt?: string;
  createdDate?: string;
  expiresDate?: string;
  registrarName?: string;
  registrant_contact?: { name?: string; organization?: string };
}

export function normalizeWhoisxml(j: Record<string, unknown>): HistoryRecord[] {
  const resp = (j.response ?? {}) as { records?: XmlRec[] };
  const recs = resp.records ?? [];
  return recs.map((r) => {
    const name = r.registrant_contact?.name ?? null;
    const org = r.registrant_contact?.organization ?? null;
    return {
      date: r.checkedAt ?? null,
      registrar: r.registrarName ?? null,
      registrantName: name,
      registrantOrg: org,
      privacy: PRIVACY_RE.test(`${name ?? ""} ${org ?? ""}`),
      created: r.createdDate ?? null,
      expires: r.expiresDate ?? null,
    };
  });
}

// ---- clients (network) ----

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return (await res.json()) as Record<string, unknown>;
}

export async function whoisfreaksHistory(
  fqdn: string,
  apiKey: string
): Promise<HistoryRecord[]> {
  const j = await getJson(
    `https://api.whoisfreaks.com/v2.0/whois/history?domainName=${encodeURIComponent(fqdn)}&apiKey=${apiKey}`
  );
  return normalizeWhoisfreaks(j);
}

export async function whoisxmlHistory(
  fqdn: string,
  apiKey: string
): Promise<HistoryRecord[]> {
  const j = await getJson(
    `https://www.whoisxmlapi.com/whoisserver/WhoisHistoryService?apiKey=${apiKey}&domainName=${encodeURIComponent(fqdn)}&outputFormat=json`
  );
  return normalizeWhoisxml(j);
}

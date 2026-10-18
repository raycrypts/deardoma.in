// securitytrails: past dns + parking-infra dating (research/history-providers.md).
// GET api.securitytrails.com/v1/history/{host}/dns/{type} (a, aaaa, mx, ns, soa,
// txt), apikey header. shape verified via docs.securitytrails.com llms.txt
// (scraped 2026-10-18).

export interface DnsHistoryRecord {
  firstSeen: string | null;
  lastSeen: string | null;
  organization: string | null;
  values: string[]; // ips (a/aaaa), nameservers (ns), targets (mx)
}

// known parking / monetization infrastructure. long-term residence here is
// the single best "buyable" signal in the pre-check (research doc).
const PARKING_RE =
  /sedoparking|parkingcrew|bodis|cashparking|above\.com|parklogic|parkpage|hugedomains|dan\.com|afternic/i;

export function normalizeDnsHistory(j: Record<string, unknown>): DnsHistoryRecord[] {
  const recs = (j.records ?? []) as Array<Record<string, unknown>>;
  return recs.map((r) => {
    const values = (r.values ?? []) as Array<Record<string, unknown>>;
    return {
      firstSeen: (r.first_seen as string) ?? null,
      lastSeen: (r.last_seen as string) ?? null,
      organization: (r.organization as string) ?? null,
      values: values
        .map((v) => (v.ip ?? v.nameserver ?? v.hostname ?? v.value ?? "") as string)
        .filter(Boolean),
    };
  });
}

export interface DnsPast {
  siteDeathDate: string | null; // when records last actually changed
  longTermParked: boolean;
  parkingSince: string | null;
  records: { a: number; ns: number; mx: number };
}

export function dnsPast(ns: DnsHistoryRecord[], a: DnsHistoryRecord[], mx: DnsHistoryRecord[]): DnsPast {
  // site-death dating: the most recent first_seen among a/mx records — after
  // that date, the infrastructure stopped moving (owner stopped caring)
  const dated = [...a, ...mx].filter((r) => r.firstSeen);
  const siteDeathDate =
    dated.length > 0
      ? dated.map((r) => r.firstSeen as string).sort().at(-1) ?? null
      : null;
  const parking = ns.filter((r) => r.values.some((v) => PARKING_RE.test(v)));
  const longTermParked =
    parking.length > 0 && parking.some((r) => {
      if (!r.firstSeen) return false;
      const span = Date.now() - Date.parse(r.firstSeen);
      return span > 180 * 86_400_000; // parked infra for 6+ months
    });
  const parkingSince =
    parking.map((r) => r.firstSeen).filter(Boolean).sort().at(0) ?? null;
  return {
    siteDeathDate,
    longTermParked,
    parkingSince,
    records: { a: a.length, ns: ns.length, mx: mx.length },
  };
}

export async function dnsHistory(
  host: string,
  type: "a" | "aaaa" | "mx" | "ns" | "soa" | "txt",
  apiKey: string
): Promise<DnsHistoryRecord[]> {
  const res = await fetch(
    `https://api.securitytrails.com/v1/history/${encodeURIComponent(host)}/dns/${type}`,
    { headers: { apikey: apiKey }, signal: AbortSignal.timeout(15_000) }
  );
  if (!res.ok) throw new Error(`securitytrails ${res.status} for ${host}`);
  return normalizeDnsHistory(await res.json());
}

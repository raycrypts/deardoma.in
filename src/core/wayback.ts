// pre-check step 5.4: wayback machine evidence (free, no key).
// CDX API: snapshot count, first/last capture dates, and subdomain breadth.
// the breadth matters twice:
// - thin/frozen history + nothing recent = the site died (usage signal)
// - MANY distinct archived subdomains = the domain is product
//   infrastructure (structural platform detection beyond the curated list)

export interface WaybackVerdict {
  snapshots: number;
  firstCapture: string | null;
  lastCapture: string | null;
  distinctSubdomains: number;
  recentActivity: boolean; // any capture in the last 12 months
}

export function parseCdx(rows: string[][]): WaybackVerdict {
  if (rows.length < 1) {
    return { snapshots: 0, firstCapture: null, lastCapture: null, distinctSubdomains: 0, recentActivity: false };
  }
  const stamps = rows.map((r) => r[0]).filter(Boolean).sort();
  const first = stamps[0] ?? null;
  const last = stamps[stamps.length - 1] ?? null;
  const subs = new Set(
    rows
      .map((r) => (r[1] ?? "").replace(/^https?:\/\//, "").split("/")[0].toLowerCase())
      .filter((h) => h.includes("."))
  );
  const yearAgo = Date.now() - 365 * 86_400_000;
  const recent = stamps.some((t) => {
    const iso = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) && ms > yearAgo;
  });
  return {
    snapshots: stamps.length,
    firstCapture: first ? `${first.slice(0, 4)}-${first.slice(4, 6)}-${first.slice(6, 8)}` : null,
    lastCapture: last ? `${last.slice(0, 4)}-${last.slice(4, 6)}-${last.slice(6, 8)}` : null,
    distinctSubdomains: subs.size,
    recentActivity: recent,
  };
}

// structural platform threshold: a domain with this many distinct archived
// subdomains is infrastructure other people depend on (lu.ma model) — donna
// puts her hands up rather than breaking the internet
export const PLATFORM_SUBDOMAIN_THRESHOLD = 50;

export async function fetchWayback(fqdn: string): Promise<WaybackVerdict> {
  const res = await fetch(
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(fqdn)}&matchType=domain&output=json&fl=timestamp,original&collapse=urlkey&limit=5000`,
    { signal: AbortSignal.timeout(20_000), headers: { "user-agent": "donna-precheck/1.0" } }
  );
  if (!res.ok) throw new Error(`cdx ${res.status}`);
  const j = (await res.json()) as string[][];
  // first row is the header [timestamp, original]
  return parseCdx(j.slice(1));
}

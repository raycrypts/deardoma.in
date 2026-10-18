// rdap: the free registration-data signal (spec 5.1). rdap.org bootstraps to
// the right registry server; no key needed. this is the primary machine
// signal for the purgatory walk (the rdap `status` array, per
// research/domain-purgatory.md).

export interface RdapData {
  registrar: string | null;
  created: string | null;
  expires: string | null;
  lastChanged: string | null;
  status: string[];
  nameservers: string[];
  privacy: boolean;
}

interface RdapEntity {
  roles?: string[];
  vcardArray?: unknown;
  handle?: string;
}

function vcardFn(e: RdapEntity): string | null {
  const v = e.vcardArray as [string, Array<[string, unknown, unknown, unknown]>] | undefined;
  if (!Array.isArray(v) || !Array.isArray(v[1])) return null;
  for (const item of v[1]) {
    if (item[0] === "fn" && typeof item[3] === "string") return item[3];
  }
  return null;
}

export function parseRdap(j: Record<string, unknown>): RdapData {
  const events = (j.events ?? []) as Array<{ eventAction?: string; eventDate?: string }>;
  const ev = (action: string) =>
    events.find((e) => (e.eventAction ?? "").toLowerCase() === action)?.eventDate ?? null;
  const entities = (j.entities ?? []) as RdapEntity[];
  const registrar =
    entities.filter((e) => (e.roles ?? []).includes("registrar")).map(vcardFn).find(Boolean) ??
    null;
  const registrant = entities.filter((e) => (e.roles ?? []).includes("registrant")).map(vcardFn);
  const privacy = registrant.some((n) => !!n && /redact|privacy|withheld/i.test(n));
  const ns = (j.nameservers ?? []) as Array<{ ldhName?: string }>;
  return {
    registrar,
    created: ev("registration"),
    expires: ev("expiration"),
    lastChanged: ev("last changed") ?? ev("last update of rdap database"),
    status: ((j.status ?? []) as string[]).map((s) => s.toLowerCase()),
    nameservers: ns.map((n) => (n.ldhName ?? "").toLowerCase()).filter(Boolean),
    privacy,
  };
}

// network call; null when the registry says 404 (dropped / never registered)
export async function fetchRdap(fqdn: string): Promise<RdapData | null> {
  const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(fqdn)}`, {
    headers: { accept: "application/rdap+json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`rdap ${res.status} for ${fqdn}`);
  return parseRdap(await res.json());
}

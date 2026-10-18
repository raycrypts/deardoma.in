// pre-check step 5.6: can the owner actually be reached?
// passive evidence runs here: emails and forms harvested from the site
// (step 5.3), mx hosts, and a pluggable active-verifier hook.
//
// active mailbox probing is deliberately NOT implemented inline: the spec
// (spec 8) requires a dedicated smtp checking service or verification api
// with honest helo identity, a tiny fixed local-part list, one attempt per
// mailbox, never from sending infrastructure. wire one by passing a
// verifier; without it the step reports passive evidence only.

import { promises as dns } from "node:dns";

export const PROBE_LOCAL_PARTS = ["info", "hello", "contact", "admin"];

export type MailboxStatus = "ok" | "catch_all" | "absent" | "unverifiable";

export interface EmailVerdict {
  harvested: string[];
  mxHosts: string[];
  probe: { enabled: boolean; results: Record<string, MailboxStatus> };
  reachable: boolean;
}

export function dedupeEmails(lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of lists.flat()) {
    const k = e.toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out.slice(0, 10);
}

export async function mxHostsFor(fqdn: string): Promise<string[]> {
  try {
    const mx = await dns.resolveMx(fqdn);
    return mx.map((r) => r.exchange).filter(Boolean);
  } catch {
    return [];
  }
}

// integration point for a dedicated verification service; returns per-address
// statuses. when absent, step 5.6 reports passive evidence only.
export type MailboxVerifier = (
  fqdn: string,
  addresses: string[]
) => Promise<Record<string, MailboxStatus>>;

export async function emailReachability(
  fqdn: string,
  harvested: string[],
  verify?: MailboxVerifier
): Promise<EmailVerdict> {
  const mxHosts = await mxHostsFor(fqdn);
  let probe: EmailVerdict["probe"] = { enabled: false, results: {} };
  if (verify && harvested.length > 0) {
    probe = { enabled: true, results: await verify(fqdn, harvested.slice(0, 4)) };
  }
  const reachable =
    mxHosts.length > 0 &&
    (harvested.length > 0 ||
      Object.values(probe.results).some((s) => s === "ok" || s === "catch_all"));
  return { harvested, mxHosts, probe, reachable };
}

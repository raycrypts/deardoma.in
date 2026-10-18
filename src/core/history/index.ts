// the paid pre-check history step (research/history-providers.md integration
// sketch). free signals (rdap status, wayback) run always; these providers
// meter per lookup, so they run only inside the paid pre-check on a specific
// domain. provider preference per the decision table: whoisfreaks for the
// ownership timeline, securitytrails for past dns/parking dating, whoisxml as
// the alternate timeline + future monitor. each client degrades to
// `skipped: no key` so the step boots without credentials.

import { config } from "../../config.js";
import {
  ownershipSignals,
  whoisfreaksHistory,
  whoisxmlHistory,
  type HistoryRecord,
} from "./whois-history.js";
import { dnsHistory, dnsPast } from "./dns-history.js";

export interface HistoryStepResult {
  locked?: string;
  ownership?: {
    provider: string;
    records: number;
    registrantChanges: number;
    lastRegistrantChange: string | null;
    registrarMoves: number;
    signals: {
      recently_changed_hands: boolean;
      serial_lapser: boolean;
      registrar_hopper: boolean;
    };
  };
  dns?: {
    siteDeathDate: string | null;
    longTermParked: boolean;
    parkingSince: string | null;
  };
  skipped: string[];
  errors: string[];
}

export async function historySignals(
  fqdn: string,
  opts: { paid: boolean }
): Promise<HistoryStepResult> {
  const out: HistoryStepResult = { skipped: [], errors: [] };
  if (!opts.paid) {
    out.locked =
      "paid signal: whois history and deep purgatory run only inside donna's paid pre-check";
    return out;
  }

  // ownership timeline: whoisfreaks first (1986 coverage), whoisxml alternate
  let records: HistoryRecord[] = [];
  if (config.history.whoisfreaks) {
    try {
      records = await whoisfreaksHistory(fqdn, process.env.WHOISFREAKS_API_KEY!);
      const s = ownershipSignals(records);
      out.ownership = {
        provider: "whoisfreaks",
        records: s.records,
        registrantChanges: s.registrantChanges,
        lastRegistrantChange: s.lastRegistrantChange,
        registrarMoves: s.registrarMoves,
        signals: {
          recently_changed_hands: s.recentlyChangedHands,
          serial_lapser: s.serialLapser,
          registrar_hopper: s.registrarHopper,
        },
      };
    } catch (e) {
      out.errors.push(`whoisfreaks: ${(e as Error).message}`);
    }
  } else {
    out.skipped.push("whoisfreaks: no key");
  }
  if (!out.ownership && config.history.whoisxml) {
    try {
      records = await whoisxmlHistory(fqdn, process.env.WHOISXML_API_KEY!);
      const s = ownershipSignals(records);
      out.ownership = {
        provider: "whoisxml",
        records: s.records,
        registrantChanges: s.registrantChanges,
        lastRegistrantChange: s.lastRegistrantChange,
        registrarMoves: s.registrarMoves,
        signals: {
          recently_changed_hands: s.recentlyChangedHands,
          serial_lapser: s.serialLapser,
          registrar_hopper: s.registrarHopper,
        },
      };
    } catch (e) {
      out.errors.push(`whoisxml: ${(e as Error).message}`);
    }
  } else if (!out.ownership && !config.history.whoisfreaks) {
    out.skipped.push("whoisxml: no key");
  }

  // past dns: securitytrails (site-death dating + parking infra)
  if (config.history.securitytrails) {
    try {
      const key = process.env.SECURITYTRAILS_API_KEY!;
      const [ns, a, mx] = await Promise.all([
        dnsHistory(fqdn, "ns", key),
        dnsHistory(fqdn, "a", key),
        dnsHistory(fqdn, "mx", key),
      ]);
      const past = dnsPast(ns, a, mx);
      out.dns = {
        siteDeathDate: past.siteDeathDate,
        longTermParked: past.longTermParked,
        parkingSince: past.parkingSince,
      };
    } catch (e) {
      out.errors.push(`securitytrails: ${(e as Error).message}`);
    }
  } else {
    out.skipped.push("securitytrails: no key");
  }
  return out;
}

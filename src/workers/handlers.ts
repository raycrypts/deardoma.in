import { promises as dns } from "node:dns";
import { pool } from "../db.js";
import { classifyReplyPlaceholder } from "../core/intents.js";
import { classifyPurgatory, DROPPED } from "../core/purgatory.js";
import { fetchRdap } from "../core/history/rdap.js";
import { historySignals } from "../core/history/index.js";

type Payload = Record<string, unknown>;

async function recordEvent(
  kind: string,
  detail: Payload,
  ids: { campaignId?: number; domainId?: number }
) {
  await pool.query(
    `insert into events (campaign_id, domain_id, kind, detail) values ($1, $2, $3, $4)`,
    [ids.campaignId ?? null, ids.domainId ?? null, kind, detail]
  );
}

// MX provider classification (spec 5.2): forwarding services hint at a
// catch-all hobby setup; real mailbox providers hint the domain is in use.
const MX_PROVIDERS: Array<[RegExp, string]> = [
  [/google|googlemail/, "google_workspace"],
  [/outlook|protection\.outlook/, "microsoft_365"],
  [/zoho/, "zoho"],
  [/fastmail|messagingengine/, "fastmail"],
  [/protonmail|proton\.me/, "proton"],
  [/improvmx/, "improvmx"],
  [/forwardemail/, "forwardemail"],
  [/cloudflare/, "cloudflare_email_routing"],
  [/namecheap|porkbun|privateemail/, "registrar_forwarding"],
];

function classifyMx(exchanges: string[]): string | null {
  for (const [re, name] of MX_PROVIDERS) {
    if (exchanges.some((e) => re.test(e))) return name;
  }
  return null;
}

// Pre-check pipeline (spec 5). The dns step is real; the rest are
// scaffolded with their research-stack integration marked (see SCOPE.md).
async function precheck(payload: Payload) {
  const precheckId = payload.precheckId as number;
  const domainId = payload.domainId as number;
  const { rows } = await pool.query(`select fqdn from domains where id = $1`, [
    domainId,
  ]);
  const fqdn: string = rows[0].fqdn;
  const result: Record<string, unknown> = {};

  // 5.2 dns (real): mx + ns records, provider classification
  try {
    const mx = await dns.resolveMx(fqdn);
    const ns = await dns.resolveNs(fqdn);
    const mxProvider = classifyMx(mx.map((r) => r.exchange));
    result.dns = {
      mx: mx.map((r) => r.exchange),
      ns,
      mxProvider,
    };
    await pool.query(
      `update domains set mx_provider = $2, last_prechecked_at = now() where id = $1`,
      [domainId, mxProvider]
    );
  } catch {
    result.dns = { error: "no dns records or lookup failed" };
  }

  // 5.1 registration data (real): rdap via rdap.org bootstrap + purgatory
  //     stage classification (free signal, research/domain-purgatory.md)
  try {
    const rdap = await fetchRdap(fqdn);
    if (rdap === null) {
      result.registration_data = { dropped: true };
      result.purgatory = DROPPED;
    } else {
      const purgatory = classifyPurgatory(rdap.status, rdap.expires);
      result.registration_data = rdap;
      result.purgatory = purgatory;
      await pool.query(
        `update domains set registrar = $2, created_at = $3, expires_at = $4,
           status_codes = $5, privacy = $6 where id = $1`,
        [domainId, rdap.registrar, rdap.created, rdap.expires, rdap.status, rdap.privacy]
      );
    }
  } catch (e) {
    result.registration_data = { error: (e as Error).message };
  }

  // 5.1b history (paid signal, research/history-providers.md): whois history
  //     (whoisfreaks/whoisxml) + past dns (securitytrails), only when this
  //     pre-check is paid. locked notice otherwise.
  try {
    result.history = await historySignals(fqdn, { paid: payload.paid === true });
  } catch (e) {
    result.history = { locked: `unavailable: ${(e as Error).message}`, skipped: [], errors: [] };
  }
  // TODO 5.3 website: firecrawl fetch + classification (parked / for sale /
  //      default page / placeholder / live) + activity signals.
  // TODO 5.4 wayback: snapshot count, first/last dates.
  // TODO 5.5 github + public mentions: github api (repos, code, pages cname files),
  //      tavily web search, querit deep research for candidate owners + confidence.
  // TODO 5.6 email checks: dedicated smtp checker or verification api (catch-all
  //      test, common local parts; never abuse/postmaster; never from sending servers).
  result.pending = [
    "website",
    "wayback",
    "public_mentions",
    "email_checks",
  ];

  // TODO 5.7: in_use_score / reachability_score / estimated success once the
  //      pipeline steps land. cached 24h per domain.
  await pool.query(
    `update prechecks set status = 'done', result = $2 where id = $1`,
    [precheckId, result]
  );
  await recordEvent("precheck_done", { fqdn, result }, { domainId });
}

// Outreach (spec 6 + 8.1). Sending infrastructure (dedicated outreach
// domains, spf/dkim/dmarc, warmup, per-domain daily caps, inbound webhook)
// is NOT wired yet — this records the boundary and the rules that apply.
async function outreachSender(payload: Payload) {
  const campaignId = payload.campaignId as number;
  await recordEvent(
    "outreach_deferred",
    {
      todo: "sending infrastructure not wired: dedicated outreach domains + smtp provider. rules on landing: max 3 routes, 2 messages per route, 6 total, plain-text first message, ai disclosure, opt-out honored immediately (spec 2, 6, 8.1)",
    },
    { campaignId }
  );
}

// Reply classification (spec 8.3): placeholder keyword heuristic; the LLM
// classifier_negotiator with structured json outputs is pending.
async function replyClassifier(payload: Payload) {
  const body = (payload.body as string) ?? "";
  const intent = classifyReplyPlaceholder(body);
  await recordEvent(
    "reply_classified",
    {
      intent,
      placeholder: true,
      todo: "llm classifier with structured json outputs (spec 8.3)",
    },
    {}
  );
}

// Transfer completion detection (spec 10.5, real): rdap vs the stored
// registrar/created row. a registrar change within 60 days means the 60-day
// epp transfer block applied and has just cleared (or is still running).
async function transferMonitor(payload: Payload) {
  const campaignId = payload.campaignId as number;
  const { rows } = await pool.query(
    `select d.id, d.fqdn, d.registrar, d.created_at, d.status_codes
     from campaigns c join domains d on d.id = c.domain_id where c.id = $1`,
    [campaignId]
  );
  if (!rows[0]) {
    await recordEvent("transfer_check_failed", { error: "campaign or domain not found" }, { campaignId });
    return;
  }
  const d = rows[0];
  try {
    const rdap = await fetchRdap(d.fqdn);
    if (rdap === null) {
      await recordEvent("transfer_check", { fqdn: d.fqdn, outcome: "dropped" }, { campaignId, domainId: d.id });
      return;
    }
    const registrarChanged =
      !!d.registrar && !!rdap.registrar && d.registrar.toLowerCase() !== rdap.registrar.toLowerCase();
    const createdChanged =
      !!d.created_at && !!rdap.created &&
      new Date(d.created_at).toISOString().slice(0, 10) !== rdap.created.slice(0, 10);
    const daysSinceChange = rdap.lastChanged
      ? Math.floor((Date.now() - Date.parse(rdap.lastChanged)) / 86_400_000)
      : null;
    await pool.query(
      `update domains set registrar = $2, created_at = $3, expires_at = $4, status_codes = $5 where id = $1`,
      [d.id, rdap.registrar, rdap.created, rdap.expires, rdap.status]
    );
    await recordEvent(
      "transfer_check",
      {
        fqdn: d.fqdn,
        outcome: registrarChanged || createdChanged ? "transfer_detected" : "unchanged",
        registrarChanged,
        createdChanged,
        transferBlock:
          daysSinceChange !== null && daysSinceChange < 60
            ? `changed ${daysSinceChange} days ago; the 60-day epp transfer block may still apply`
            : null,
      },
      { campaignId, domainId: d.id }
    );
  } catch (e) {
    await recordEvent("transfer_check_failed", { fqdn: d.fqdn, error: (e as Error).message }, { campaignId, domainId: d.id });
  }
}

// Expiry watch (spec 11, real): rdap status + purgatory stage. when the name
// walks into redemption/pending_delete the campaign shifts: contacting the
// owner is pointless for the current cycle (research/domain-purgatory.md).
async function expiryWatch(payload: Payload) {
  const domainId = payload.domainId as number;
  const { rows } = await pool.query(`select fqdn from domains where id = $1`, [domainId]);
  const fqdn: string = rows[0].fqdn;
  try {
    const rdap = await fetchRdap(fqdn);
    if (rdap === null) {
      await recordEvent("expiry_watch", { fqdn, ...DROPPED }, { domainId });
      return;
    }
    const purgatory = classifyPurgatory(rdap.status, rdap.expires);
    await pool.query(
      `update domains set status_codes = $2, expires_at = $3 where id = $1`,
      [domainId, rdap.status, rdap.expires]
    );
    const alerting = ["redemption", "pending_delete", "pending_restore", "auto_renew_grace"].includes(purgatory.stage);
    await recordEvent(
      alerting ? "purgatory_alert" : "expiry_watch",
      { fqdn, ...purgatory },
      { domainId }
    );
  } catch (e) {
    await recordEvent("expiry_watch_failed", { fqdn, error: (e as Error).message }, { domainId });
  }
}

export const handlers: Record<string, (payload: Payload) => Promise<void>> = {
  precheck,
  outreach_sender: outreachSender,
  reply_classifier: replyClassifier,
  transfer_monitor: transferMonitor,
  expiry_watch: expiryWatch,
};

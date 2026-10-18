import { promises as dns } from "node:dns";
import { pool } from "../db.js";
import { config } from "../config.js";
import { classifyReplyPlaceholder } from "../core/intents.js";
import { classifyPurgatory, DROPPED } from "../core/purgatory.js";
import { fetchRdap } from "../core/history/rdap.js";
import { historySignals } from "../core/history/index.js";
import { viability } from "../core/viability.js";
import { classifyWebsite, fetchWebsite } from "../core/website.js";
import { fetchWayback, PLATFORM_SUBDOMAIN_THRESHOLD } from "../core/wayback.js";
import { githubMentions, tavilyMentions } from "../core/mentions.js";
import { emailReachability } from "../core/email.js";
import {
  inUseScore,
  usageStatus,
  reachabilityScore,
  estimatedSuccessChance,
} from "../core/scores.js";

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

  // viability belt: domains can enter via paths that predate a list update;
  // refuse inside the worker too, before any metered lookup, and never charge
  const v = viability(fqdn);
  if (!v.viable) {
    result.hands_up = { refusal: v.refusal, reason: v.reason, charged: false };
    await pool.query(
      `update prechecks set status = 'done', result = $2 where id = $1`,
      [precheckId, result]
    );
    await recordEvent("precheck_refused", { fqdn, refusal: v.refusal, charged: false }, { domainId });
    return;
  }

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
  // 5.3 website (real): fetch + classify (parked / for_sale / default_page /
  //     placeholder / live), harvest emails + contact forms
  let web: ReturnType<typeof classifyWebsite> = {
    classification: "no_site", emails: [], contactForm: false, textLength: 0, title: null,
  };
  try {
    const html = await fetchWebsite(
      fqdn,
      config.research.firecrawl ? process.env.FIRECRAWL_API_KEY : undefined
    );
    web = classifyWebsite(html);
    result.website = web;
  } catch (e) {
    result.website = { error: (e as Error).message };
  }

  // 5.4 wayback (real, free): snapshot history + subdomain breadth. the
  //     breadth doubles as the structural platform detector: a domain with
  //     mass archived subdomains is product infrastructure other people
  //     depend on (lu.ma model) — hands up, no charge.
  try {
    const wb = await fetchWayback(fqdn);
    result.wayback = wb;
    if (wb.distinctSubdomains >= PLATFORM_SUBDOMAIN_THRESHOLD) {
      result.hands_up = {
        refusal: "platform_domain",
        reason: `structural evidence: ${wb.distinctSubdomains} distinct archived subdomains — this domain is product infrastructure other people depend on; putting my hands up, no charge`,
        charged: false,
      };
      await pool.query(
        `update prechecks set status = 'done', result = $2 where id = $1`,
        [precheckId, result]
      );
      await recordEvent("precheck_refused", { fqdn, refusal: "platform_domain", structural: true, charged: false }, { domainId });
      return;
    }
  } catch (e) {
    result.wayback = { error: (e as Error).message };
  }

  // 5.5 public mentions (real): github repos + tavily web (key-gated)
  try {
    const mentions = { githubRepos: 0, githubSample: [] as string[], webMentions: 0, webSample: [] as string[], skipped: [] as string[] };
    try {
      const gh = await githubMentions(fqdn);
      mentions.githubRepos = gh.total;
      mentions.githubSample = gh.sample;
    } catch (e) {
      mentions.skipped.push(`github: ${(e as Error).message}`);
    }
    if (config.research.tavily) {
      try {
        const wv = await tavilyMentions(fqdn, process.env.TAVILY_API_KEY!);
        mentions.webMentions = wv.total;
        mentions.webSample = wv.sample;
      } catch (e) {
        mentions.skipped.push(`tavily: ${(e as Error).message}`);
      }
    } else {
      mentions.skipped.push("tavily: no key");
    }
    result.public_mentions = mentions;
  } catch (e) {
    result.public_mentions = { error: (e as Error).message };
  }

  // 5.6 email checks (real, passive): harvested emails + mx hosts; active
  //     mailbox probing waits for a dedicated verification service
  const email = await emailReachability(fqdn, web.emails ?? []);
  result.email_checks = email;

  // 5.7 scores (real): fold every signal into the two product scores
  const purgatoryStage = (result.purgatory as { stage?: string } | undefined)?.stage ?? "ok";
  const dnsHistory = (result.history as { dns?: { longTermParked?: boolean } } | undefined)?.dns;
  const ownership = (result.history as {
    ownership?: { signals?: { recently_changed_hands?: boolean } };
  } | undefined)?.ownership;
  const useScore = inUseScore({
    website: web.classification,
    wayback: (result.wayback ?? { recentActivity: false, distinctSubdomains: 0 }) as never,
    mxProvider: (result.dns as { mxProvider?: string } | undefined)?.mxProvider ?? null,
    purgatory: purgatoryStage as never,
    ownership: ownership
      ? { recentlyChangedHands: !!ownership.signals?.recently_changed_hands }
      : undefined,
    dns: dnsHistory as never,
  });
  const reach = reachabilityScore({
    emails: email.harvested,
    contactForm: web.contactForm,
    mxProvider: (result.dns as { mxProvider?: string } | undefined)?.mxProvider ?? null,
    privacy: (result.registration_data as { privacy?: boolean } | undefined)?.privacy ?? false,
    registrar: (result.registration_data as { registrar?: string } | undefined)?.registrar ?? null,
  });
  const usage = usageStatus(useScore);
  result.scores = {
    in_use_score: useScore,
    reachability_score: reach,
    usage_status: usage,
    estimated_success_chance: estimatedSuccessChance(useScore, reach),
  };
  await pool.query(
    `update domains set in_use_score = $2, reachability_score = $3, last_prechecked_at = now() where id = $1`,
    [domainId, useScore, reach]
  );
  await pool.query(
    `update prechecks set usage_status = $2, contact_routes_found = $3 where id = $1`,
    [precheckId, usage, email.harvested.length + (web.contactForm ? 1 : 0)]
  );


  // results are cached by the precheck row itself; re-prechecks within 24h
  // short-circuit at the api layer (spec 5.7 caching).
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

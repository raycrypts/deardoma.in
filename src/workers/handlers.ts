import { promises as dns } from "node:dns";
import { pool } from "../db.js";
import { classifyReplyPlaceholder } from "../core/intents.js";

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

  // TODO 5.1 registration data: rdap first (rdap.org bootstrap), whois fallback —
  //      registrar, dates, status codes, privacy, privacy-forwarding contacts.
  // TODO 5.3 website: firecrawl fetch + classification (parked / for sale /
  //      default page / placeholder / live) + activity signals.
  // TODO 5.4 wayback: snapshot count, first/last dates.
  // TODO 5.5 github + public mentions: github api (repos, code, pages cname files),
  //      tavily web search, querit deep research for candidate owners + confidence.
  // TODO 5.6 email checks: dedicated smtp checker or verification api (catch-all
  //      test, common local parts; never abuse/postmaster; never from sending servers).
  result.pending = [
    "registration_data",
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

// Transfer completion detection (spec 10.5): rdap polling for a change of
// registrar or registrant.
async function transferMonitor(payload: Payload) {
  await recordEvent(
    "transfer_check_deferred",
    { todo: "rdap polling for registrar/registrant change (spec 10.5); detect 60-day transfer blocks" },
    { campaignId: payload.campaignId as number }
  );
}

// Expiry watch (spec 11): daily rdap status checks as expiry approaches.
async function expiryWatch(payload: Payload) {
  await recordEvent(
    "expiry_watch_deferred",
    { todo: "daily rdap status check near expiry; alert on pendingdelete (spec 11)" },
    { domainId: payload.domainId as number }
  );
}

export const handlers: Record<string, (payload: Payload) => Promise<void>> = {
  precheck,
  outreach_sender: outreachSender,
  reply_classifier: replyClassifier,
  transfer_monitor: transferMonitor,
  expiry_watch: expiryWatch,
};

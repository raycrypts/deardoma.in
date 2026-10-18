import Fastify from "fastify";
import { config } from "../config.js";
import { migrate, pool } from "../db.js";
import {
  generateHacks,
  rankCandidates,
} from "../core/candidates.js";
import { hackFit } from "../core/hack-fit.js";
import { TLD_META_SEED, type TldMeta } from "../core/tld-meta.js";

function rowToMeta(r: any): TldMeta {
  return {
    tld: r.tld,
    tldType: r.tld_type,
    operatorCountry: r.operator_country,
    googleTreatsAsGeneric: r.google_treats_as_generic,
    registrablePublicly: r.registrable_publicly,
    restriction: r.restriction,
    restrictionNote: r.restriction_note,
    riskNote: r.risk_note,
    typicalPrice: r.typical_price,
    renewalPrice: r.renewal_price,
    rdapSupported: r.rdap_supported,
    namespace: r.namespace,
  };
}

async function seedIfEmpty() {
  const { rows } = await pool.query(`select count(*)::int as n from tld_meta`);
  if (rows[0].n > 0) return;
  for (const m of TLD_META_SEED) {
    await pool.query(
      `insert into tld_meta
         (tld, tld_type, operator_country, google_treats_as_generic,
          registrable_publicly, restriction, restriction_note, risk_note,
          typical_price, renewal_price, rdap_supported, namespace)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (tld) do nothing`,
      [
        m.tld, m.tldType, m.operatorCountry ?? null,
        m.googleTreatsAsGeneric ?? null, m.registrablePublicly, m.restriction,
        m.restrictionNote, m.riskNote ?? null, m.typicalPrice ?? null,
        m.renewalPrice ?? null, m.rdapSupported ?? null, m.namespace ?? null,
      ]
    );
  }
}

async function loadTldMeta(): Promise<Map<string, TldMeta>> {
  const { rows } = await pool.query(`select * from tld_meta`);
  const map = new Map<string, TldMeta>();
  for (const r of rows) map.set(r.tld, rowToMeta(r));
  if (map.size === 0) for (const m of TLD_META_SEED) map.set(m.tld, m);
  return map;
}

async function main() {
  await migrate();
  await seedIfEmpty();
  const app = Fastify({ logger: true });

  app.get("/", async () => ({
    service: "domainhacks-api",
    scope: "backend only — see SCOPE.md",
    endpoints: [
      "GET /health",
      "GET /api/hacks?keyword=&web3=0|1",
      "GET /api/tlds",
    ],
  }));

  app.get("/health", async () => ({ ok: true, service: "domainhacks-api" }));

  app.get("/api/tlds", async () =>
    (await pool.query(`select * from tld_meta order by tld`)).rows
  );

  app.get("/api/hacks", async (req) => {
    const q = req.query as { keyword?: string; web3?: string };
    const keyword = q.keyword ?? "";
    const web3 = q.web3 === "1" || q.web3 === "true";
    const meta = await loadTldMeta();
    const tlds = [...meta.values()]
      .filter((m) => web3 || m.tldType !== "web3")
      .map((m) => m.tld);
    const candidates = generateHacks(keyword, tlds);
    const ranked = rankCandidates(candidates, meta);
    const results = ranked.map((c) => {
      const m = meta.get(c.tld)!;
      return {
        ...c,
        tldType: m.tldType,
        registrablePublicly: m.registrablePublicly,
        restriction: m.restriction,
        restrictionNote: m.restrictionNote,
        riskNote: m.riskNote ?? null,
        typicalPrice: m.typicalPrice ?? null,
        // TODO (spec 12.2): rdap first / whois fallback with 1h-avail / 24h-taken cache
        availability: "unknown" as const,
        searchNote:
          m.tldType === "cctld"
            ? m.googleTreatsAsGeneric
              ? "search: generic"
              : `search: geotargeted${m.operatorCountry ? ` to ${m.operatorCountry}` : ""}`
            : null,
        hackFit: hackFit(c),
        ...(m.tldType === "web3"
          ? {
              web3: true,
              namespace: m.namespace,
              web3Note:
                "web3 name: doesn't open in a normal browser without a wallet, extension or gateway, and can't be used for normal email.",
            }
          : {}),
      };
    });
    return { keyword, web3, count: results.length, results };
  });

  await app.listen({ port: config.port, host: "0.0.0.0" });
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

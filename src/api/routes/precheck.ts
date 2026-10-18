import type { FastifyInstance } from "fastify";
import { pool } from "../../db.js";
import { reservedReason } from "../../core/reserved.js";
import { viability } from "../../core/viability.js";

const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export async function precheckRoutes(app: FastifyInstance) {
  app.post("/api/prechecks", async (req, reply) => {
    const { domain } = (req.body ?? {}) as { domain?: string };
    if (!domain || !DOMAIN_RE.test(domain)) {
      return reply.code(400).send({ error: "invalid domain" });
    }
    const fqdn = domain.toLowerCase().trim();
    const tld = fqdn.split(".").pop() ?? "";
    const reserved = reservedReason(tld);
    if (reserved) {
      return reply.code(400).send({ error: reserved, refused: "reserved_mission", charged: false });
    }
    const v = viability(fqdn);
    if (!v.viable) {
      return reply.code(400).send({ error: v.reason, refused: v.refusal, charged: false });
    }
    const domainRes = await pool.query(
      `insert into domains (fqdn, tld) values ($1, $2)
       on conflict (fqdn) do update set tld = excluded.tld
       returning id`,
      [fqdn, tld]
    );
    const domainId = domainRes.rows[0].id;
    const pre = await pool.query(
      `insert into prechecks (domain_id) values ($1) returning id, status, created_at`,
      [domainId]
    );
    await pool.query(
      `insert into jobs (type, payload) values ('precheck', $1)`,
      [{ precheckId: pre.rows[0].id, domainId }]
    );
    await pool.query(
      `insert into events (domain_id, kind, detail) values ($1, 'precheck_queued', $2)`,
      [domainId, { fqdn }]
    );
    reply.code(201);
    return {
      precheckId: pre.rows[0].id,
      domainId,
      status: pre.rows[0].status,
    };
  });

  app.get("/api/prechecks/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const { rows } = await pool.query(
      `select p.id, p.status, p.usage_status, p.result, p.created_at,
              d.fqdn, d.in_use_score, d.reachability_score, d.mx_provider,
              d.last_prechecked_at
       from prechecks p join domains d on d.id = p.domain_id
       where p.id = $1`,
      [id]
    );
    if (!rows[0]) return reply.code(404).send({ error: "not found" });
    return rows[0];
  });
}

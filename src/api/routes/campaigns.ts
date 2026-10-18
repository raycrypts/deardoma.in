import type { FastifyInstance } from "fastify";
import { pool } from "../../db.js";
import { openingFor } from "../../core/negotiation.js";
import { reservedReason } from "../../core/reserved.js";
import { viability } from "../../core/viability.js";

interface CreateCampaignBody {
  domainId?: number;
  fqdn?: string;
  openingOffer?: number;
  maxOffer?: number;
}

export async function campaignRoutes(app: FastifyInstance) {
  app.post("/api/campaigns", async (req, reply) => {
    const body = (req.body ?? {}) as CreateCampaignBody;
    const maxOffer = Number(body.maxOffer);
    if (!Number.isFinite(maxOffer) || maxOffer <= 0) {
      return reply
        .code(400)
        .send({ error: "maxOffer is required (positive number, usd)" });
    }
    const opening =
      body.openingOffer != null
        ? Number(body.openingOffer)
        : openingFor(maxOffer);
    if (!(opening <= maxOffer)) {
      return reply.code(400).send({ error: "openingOffer must be <= maxOffer" });
    }

    let domainId = body.domainId;
    if (!domainId && body.fqdn) {
      const fqdn = body.fqdn.toLowerCase().trim();
      const tld = fqdn.split(".").pop() ?? "";
      const reserved = reservedReason(tld);
      if (reserved) {
        return reply.code(400).send({ error: reserved, refused: "reserved_mission", charged: false });
      }
      const v = viability(fqdn);
      if (!v.viable) {
        return reply.code(400).send({ error: v.reason, refused: v.refusal, charged: false });
      }
      const r = await pool.query(
        `insert into domains (fqdn, tld) values ($1, $2)
         on conflict (fqdn) do update set tld = excluded.tld returning id`,
        [fqdn, tld]
      );
      domainId = r.rows[0].id;
    }
    if (!domainId) {
      return reply.code(400).send({ error: "domainId or fqdn is required" });
    }

    // Payments are out of scope for this build (deferred fee saas, spec 14):
    // campaigns are created in 'deployed', representing an already-paid
    // deploy at the external payment boundary.
    const { rows } = await pool.query(
      `insert into campaigns (domain_id, opening_offer, max_offer, state)
       values ($1, $2, $3, 'deployed') returning *`,
      [domainId, opening, maxOffer]
    );
    const campaign = rows[0];
    await pool.query(
      `insert into jobs (type, payload) values ('outreach_sender', $1)`,
      [{ campaignId: campaign.id }]
    );
    await pool.query(
      `insert into events (campaign_id, domain_id, kind, detail)
       values ($1, $2, 'campaign_created', $3)`,
      [
        campaign.id,
        domainId,
        { state: "deployed", note: "deploy payment handled by the deferred payment layer" },
      ]
    );
    reply.code(201);
    return campaign;
  });

  app.get("/api/campaigns/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const campaign = (
      await pool.query(`select * from campaigns where id = $1`, [id])
    ).rows[0];
    if (!campaign) return reply.code(404).send({ error: "not found" });
    const events = (
      await pool.query(
        `select * from events where campaign_id = $1 order by id`,
        [id]
      )
    ).rows;
    const messages = (
      await pool.query(
        `select * from messages where campaign_id = $1 order by id`,
        [id]
      )
    ).rows;
    return { campaign, events, messages };
  });
}

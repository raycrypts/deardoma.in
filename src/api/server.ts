import Fastify from "fastify";
import { config } from "../config.js";
import { migrate } from "../db.js";
import { precheckRoutes } from "./routes/precheck.js";
import { campaignRoutes } from "./routes/campaigns.js";

async function main() {
  await migrate();
  const app = Fastify({ logger: true });

  app.get("/", async () => ({
    service: "donna-api",
    scope: "backend only — see SCOPE.md",
    endpoints: [
      "GET /health",
      "POST /api/prechecks {domain}",
      "GET /api/prechecks/:id",
      "POST /api/campaigns {domainId|fqdn, maxOffer}",
      "GET /api/campaigns/:id",
    ],
  }));

  app.get("/health", async () => ({ ok: true, service: "donna-api" }));

  await precheckRoutes(app);
  await campaignRoutes(app);

  await app.listen({ port: config.port, host: "0.0.0.0" });
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

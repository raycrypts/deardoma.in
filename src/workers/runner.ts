import { appendFileSync } from "node:fs";
import { pool } from "../db.js";
import { handlers } from "./handlers.js";

// Postgres-backed job queue worker (spec 15: "a postgres-based queue").
const HEARTBEAT_FILE =
  process.env.HEARTBEAT_FILE ?? "/tmp/donna-worker-heartbeat";
const POLL_MS = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function claimJob() {
  const { rows } = await pool.query(
    `update jobs set status = 'running', attempts = attempts + 1, updated_at = now()
     where id = (
       select id from jobs where status = 'queued' and run_at <= now()
       order by run_at, id limit 1 for update skip locked
     ) returning *`
  );
  return rows[0] ?? null;
}

async function main() {
  console.log(`donna worker up; polling every ${POLL_MS}ms`);
  for (;;) {
    try {
      appendFileSync(HEARTBEAT_FILE, `${Date.now()}\n`);
    } catch {}
    const job = await claimJob();
    if (!job) {
      await sleep(POLL_MS);
      continue;
    }
    const handler = handlers[job.type];
    try {
      if (!handler) throw new Error(`no handler for job type '${job.type}'`);
      await handler(job.payload ?? {});
      await pool.query(
        `update jobs set status = 'done', updated_at = now() where id = $1`,
        [job.id]
      );
      console.log(`job ${job.id} (${job.type}) done`);
    } catch (e) {
      await pool.query(
        `update jobs set status = 'failed', last_error = $2, updated_at = now() where id = $1`,
        [job.id, String(e)]
      );
      console.error(`job ${job.id} (${job.type}) failed:`, e);
    }
  }
}
main();

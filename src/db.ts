import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { config } from "./config.js";

export const pool = new Pool({ connectionString: config.databaseUrl });

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "db",
  "migrations"
);

// Tiny migration runner: applies unapplied src/db/migrations/NNN_*.sql in
// order, records names in schema_migrations. Safe to re-run at every boot.
export async function migrate(): Promise<string[]> {
  await pool.query(
    `create table if not exists schema_migrations (
       name text primary key, applied_at timestamptz not null default now())`
  );
  const applied = new Set(
    (await pool.query(`select name from schema_migrations`)).rows.map(
      (r: any) => r.name
    )
  );
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(readFileSync(join(migrationsDir, file), "utf8"));
      await client.query(`insert into schema_migrations (name) values ($1)`, [
        file,
      ]);
      await client.query("commit");
      ran.push(file);
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }
  return ran;
}

import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
  const dir = join(process.cwd(), "db", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    console.log("Applying", file);
    await client.query(readFileSync(join(dir, file), "utf8")); // each file manages its own BEGIN/COMMIT
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
  }
  await client.end();
  console.log("Migrations up to date.");
}
main().catch((e) => { console.error(e.message); process.exit(1); });

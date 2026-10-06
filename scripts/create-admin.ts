import "dotenv/config";
import bcrypt from "bcryptjs";
import { Client } from "pg";

async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PHONE || !ADMIN_PASSWORD) throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD in .env");
  if (ADMIN_PASSWORD.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role) VALUES ($1, lower($2), $3, $4, 'ADMIN')`,
    [ADMIN_NAME, ADMIN_EMAIL.trim(), ADMIN_PHONE, await bcrypt.hash(ADMIN_PASSWORD, 12)],
  );
  await client.end();
  console.log("Admin created:", ADMIN_EMAIL, "- now remove ADMIN_PASSWORD from .env");
}
main().catch((e) => { console.error(e.message); process.exit(1); });

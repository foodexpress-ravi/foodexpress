import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { apiHandler, clientIp, HttpError, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { registerSchema } from "@/lib/validation";

export const POST = apiHandler(async (req) => {
  if (!rateLimit(`register:${clientIp(req)}`, 10, 15 * 60_000)) throw new HttpError(429, "Too many attempts. Please try again later.");
  const d = registerSchema.parse(await readJson(req));
  const hash = await hashPassword(d.password);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, role`,
      [d.fullName, d.email, d.phone, hash, d.role],
    );
    // Delivery partners start PENDING; admin approval comes in Phase 10. Restaurant/store profiles are created in Phases 7-8.
    if (d.role === "DELIVERY_PARTNER") await client.query(`INSERT INTO delivery_partners (user_id) VALUES ($1)`, [rows[0].id]);
    await client.query("COMMIT");
    await createSession(rows[0].id, rows[0].role);
    return NextResponse.json({ user: { id: rows[0].id, role: rows[0].role } }, { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK");
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "An account with this email or phone already exists.");
    throw e;
  } finally {
    client.release();
  }
});

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { createSession, DUMMY_HASH, verifyPassword } from "@/lib/auth";
import { apiHandler, clientIp, HttpError, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { loginSchema } from "@/lib/validation";

export const POST = apiHandler(async (req) => {
  const d = loginSchema.parse(await readJson(req));
  if (!rateLimit(`login:${clientIp(req)}:${d.email}`, 5, 15 * 60_000)) throw new HttpError(429, "Too many attempts. Please try again later.");

  const { rows } = await pool.query(`SELECT id, role, status, password_hash FROM users WHERE lower(email) = $1`, [d.email]);
  const user = rows[0];
  const ok = await verifyPassword(d.password, user?.password_hash ?? DUMMY_HASH); // same cost either way
  if (!user || !ok) throw new HttpError(401, "Incorrect email or password.");
  if (user.status !== "ACTIVE") throw new HttpError(403, "This account is suspended. Please contact support.");

  await createSession(user.id, user.role);
  return NextResponse.json({ user: { id: user.id, role: user.role } });
});

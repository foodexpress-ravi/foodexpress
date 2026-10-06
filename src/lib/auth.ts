import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { pool } from "./db";
import { HttpError } from "./http";
import type { Role } from "./roles";

export const COOKIE_NAME = "fe_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Used so login takes the same time whether or not the email exists.
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (min 32 chars)");
  return new TextEncoder().encode(s);
}

export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, hash: string) => bcrypt.compare(p, hash);

export async function createSession(userId: string, role: Role) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

export type SessionUser = { id: string; role: Role; fullName: string; email: string; phone: string };

/** Verifies the cookie AND re-reads the user from the DB, so suspended users / role changes take effect immediately. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const { rows } = await pool.query(
      `SELECT id, role, full_name, email, phone FROM users WHERE id = $1 AND status = 'ACTIVE'`,
      [payload.sub],
    );
    if (!rows[0]) return null;
    const u = rows[0];
    return { id: u.id, role: u.role, fullName: u.full_name, email: u.email, phone: u.phone };
  } catch {
    return null;
  }
}

/** Call at the top of every protected API route / server action. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please log in to continue.");
  if (!roles.includes(user.role)) throw new HttpError(403, "You do not have access to this.");
  return user;
}

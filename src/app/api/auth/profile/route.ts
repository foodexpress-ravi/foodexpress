import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ fullName: z.string().trim().min(2).max(100), phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number.") });

export const PATCH = apiHandler(async (req) => {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please log in to continue.");
  const d = schema.parse(await readJson(req));
  try {
    const { rows } = await pool.query(`UPDATE users SET full_name = $2, phone = $3 WHERE id = $1 RETURNING id, full_name, email, phone, role`, [user.id, d.fullName, d.phone]);
    return NextResponse.json({ user: rows[0] });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "This phone number is already in use.");
    throw e;
  }
});

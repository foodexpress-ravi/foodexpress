import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { apiHandler, HttpError } from "@/lib/http";

export const POST = apiHandler(async (_req, ctx?: { params: Promise<{ id: string }> }) => {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please log in to continue.");
  const { id } = await ctx!.params;
  await pool.query(`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`, [id, user.id]);
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

export const PATCH = apiHandler(async (req, ctx?: { params: Promise<{ id: string }> }) => {
  const admin = await requireRole("ADMIN");
  const { id } = await ctx!.params;
  if (id === admin.id) throw new HttpError(400, "You cannot change your own account status.");
  const { status } = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).parse(await readJson(req));
  const { rows } = await pool.query(`UPDATE users SET status = $2 WHERE id = $1 RETURNING id, status`, [id, status]);
  if (!rows[0]) throw new HttpError(404, "User not found.");
  return NextResponse.json({ user: rows[0] });
});

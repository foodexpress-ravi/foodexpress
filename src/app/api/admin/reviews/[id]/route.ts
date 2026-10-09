import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { HttpError, readJson, apiHandlerWithParams } from "@/lib/http";
import { z } from "zod";

export const PATCH = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const { status } = z.object({ status: z.enum(["VISIBLE", "HIDDEN"]) }).parse(await readJson(req));
  const { rows } = await pool.query(`UPDATE reviews SET status = $2 WHERE id = $1 RETURNING id`, [id, status]);
  if (!rows[0]) throw new HttpError(404, "Review not found.");
  return NextResponse.json({ ok: true });
});

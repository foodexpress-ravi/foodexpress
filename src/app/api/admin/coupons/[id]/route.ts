import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { HttpError, readJson, apiHandlerWithParams } from "@/lib/http";
import { z } from "zod";

export const PATCH = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const { isActive } = z.object({ isActive: z.boolean() }).parse(await readJson(req));
  const { rows } = await pool.query(`UPDATE coupons SET is_active = $2 WHERE id = $1 RETURNING *`, [id, isActive]);
  if (!rows[0]) throw new HttpError(404, "Coupon not found.");
  return NextResponse.json({ coupon: rows[0] });
});

export const DELETE = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  await requireRole("ADMIN");
  const { id } = await ctx.params;
  const { rowCount } = await pool.query(`DELETE FROM coupons WHERE id = $1`, [id]);
  if (!rowCount) throw new HttpError(404, "Coupon not found.");
  return NextResponse.json({ ok: true });
});

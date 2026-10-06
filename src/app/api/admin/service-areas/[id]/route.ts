import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ isActive: z.boolean().optional(), deliveryFee: z.number().min(0).nullable().optional(), minOrder: z.number().min(0).nullable().optional() });

export const PATCH = apiHandler(async (req, ctx?: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx!.params;
  const d = schema.parse(await readJson(req));
  const { rows } = await pool.query(
    `UPDATE service_areas SET is_active=COALESCE($2,is_active), delivery_fee=COALESCE($3,delivery_fee), min_order=COALESCE($4,min_order) WHERE id=$1 RETURNING *`,
    [id, d.isActive, d.deliveryFee, d.minOrder],
  );
  if (!rows[0]) throw new HttpError(404, "Service area not found.");
  return NextResponse.json({ area: rows[0] });
});

export const DELETE = apiHandler(async (_req, ctx?: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx!.params;
  const { rowCount } = await pool.query(`DELETE FROM service_areas WHERE id = $1`, [id]);
  if (!rowCount) throw new HttpError(404, "Service area not found.");
  return NextResponse.json({ ok: true });
});

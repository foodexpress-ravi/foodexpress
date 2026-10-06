import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({ name: z.string().trim().min(1).max(80).optional(), imageUrl: z.string().url().optional().or(z.literal("")), sortOrder: z.number().int().optional(), isActive: z.boolean().optional() });

export const PATCH = apiHandler(async (req, ctx?: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx!.params;
  const d = schema.parse(await readJson(req));
  const { rows } = await pool.query(
    `UPDATE categories SET name=COALESCE($2,name), image_url=COALESCE($3,image_url), sort_order=COALESCE($4,sort_order), is_active=COALESCE($5,is_active) WHERE id=$1 RETURNING *`,
    [id, d.name, d.imageUrl, d.sortOrder, d.isActive],
  );
  if (!rows[0]) throw new HttpError(404, "Category not found.");
  return NextResponse.json({ category: rows[0] });
});

export const DELETE = apiHandler(async (_req, ctx?: { params: Promise<{ id: string }> }) => {
  await requireRole("ADMIN");
  const { id } = await ctx!.params;
  const { rowCount } = await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
  if (!rowCount) throw new HttpError(404, "Category not found.");
  return NextResponse.json({ ok: true });
});

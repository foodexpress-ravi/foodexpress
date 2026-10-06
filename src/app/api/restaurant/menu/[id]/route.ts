import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  price: z.number().min(0).optional(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

// Every statement joins through restaurants.owner_id, so an owner can only ever touch their own menu items.
export const PATCH = apiHandler(async (req, ctx?: { params: Promise<{ id: string }> }) => {
  const user = await requireRole("RESTAURANT_OWNER");
  const { id } = await ctx!.params;
  const d = schema.parse(await readJson(req));
  const { rows } = await pool.query(
    `UPDATE food_items f SET
       category_id = COALESCE($3, f.category_id), name = COALESCE($4, f.name), description = COALESCE($5, f.description),
       image_url = COALESCE($6, f.image_url), price = COALESCE($7, f.price), is_veg = COALESCE($8, f.is_veg),
       is_available = COALESCE($9, f.is_available)
     FROM restaurants r WHERE f.id = $1 AND f.restaurant_id = r.id AND r.owner_id = $2 RETURNING f.*`,
    [id, user.id, d.categoryId, d.name, d.description, d.imageUrl, d.price, d.isVeg, d.isAvailable],
  );
  if (!rows[0]) throw new HttpError(404, "Menu item not found.");
  return NextResponse.json({ item: rows[0] });
});

export const DELETE = apiHandler(async (_req, ctx?: { params: Promise<{ id: string }> }) => {
  const user = await requireRole("RESTAURANT_OWNER");
  const { id } = await ctx!.params;
  const { rowCount } = await pool.query(
    `DELETE FROM food_items f USING restaurants r WHERE f.id = $1 AND f.restaurant_id = r.id AND r.owner_id = $2`,
    [id, user.id],
  );
  if (!rowCount) throw new HttpError(404, "Menu item not found.");
  return NextResponse.json({ ok: true });
});

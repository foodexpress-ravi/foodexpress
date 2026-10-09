import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { HttpError, readJson, apiHandlerWithParams } from "@/lib/http";
import { z } from "zod";

const schema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(30).optional(),
  mrp: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  stockQty: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
});

export const PATCH = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await requireRole("GROCERY_OWNER");
  const { id } = await ctx.params;
  const d = schema.parse(await readJson(req));
  const { rows } = await pool.query(
    `UPDATE grocery_products p SET
       category_id=COALESCE($3,p.category_id), name=COALESCE($4,p.name), description=COALESCE($5,p.description),
       image_url=COALESCE($6,p.image_url), unit=COALESCE($7,p.unit), mrp=COALESCE($8,p.mrp),
       selling_price=COALESCE($9,p.selling_price), stock_qty=COALESCE($10,p.stock_qty), is_available=COALESCE($11,p.is_available)
     FROM grocery_stores s WHERE p.id = $1 AND p.grocery_store_id = s.id AND s.owner_id = $2
       AND COALESCE($9, p.selling_price) <= COALESCE($8, p.mrp)
     RETURNING p.*`,
    [id, user.id, d.categoryId, d.name, d.description, d.imageUrl, d.unit, d.mrp, d.sellingPrice, d.stockQty, d.isAvailable],
  );
  if (!rows[0]) throw new HttpError(404, "Product not found, or selling price exceeds MRP.");
  return NextResponse.json({ product: rows[0] });
});

export const DELETE = apiHandlerWithParams<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await requireRole("GROCERY_OWNER");
  const { id } = await ctx.params;
  const { rowCount } = await pool.query(
    `DELETE FROM grocery_products p USING grocery_stores s WHERE p.id = $1 AND p.grocery_store_id = s.id AND s.owner_id = $2`,
    [id, user.id],
  );
  if (!rowCount) throw new HttpError(404, "Product not found.");
  return NextResponse.json({ ok: true });
});

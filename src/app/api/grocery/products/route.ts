import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { apiHandler, HttpError, readJson } from "@/lib/http";
import { z } from "zod";

const schema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(30),
  mrp: z.number().min(0),
  sellingPrice: z.number().min(0),
  stockQty: z.number().int().min(0),
  isAvailable: z.boolean().optional(),
}).refine((d) => d.sellingPrice <= d.mrp, { message: "Selling price cannot exceed MRP.", path: ["sellingPrice"] });

async function myStoreId(userId: string) {
  const { rows } = await pool.query(`SELECT id FROM grocery_stores WHERE owner_id = $1`, [userId]);
  if (!rows[0]) throw new HttpError(404, "Please create your store profile first.");
  return rows[0].id;
}

export const GET = apiHandler(async () => {
  const user = await requireRole("GROCERY_OWNER");
  const storeId = await myStoreId(user.id);
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS category_name FROM grocery_products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.grocery_store_id = $1 ORDER BY p.created_at DESC`,
    [storeId],
  );
  return NextResponse.json({ products: rows });
});

export const POST = apiHandler(async (req) => {
  const user = await requireRole("GROCERY_OWNER");
  const storeId = await myStoreId(user.id);
  const d = schema.parse(await readJson(req));
  const { rows } = await pool.query(
    `INSERT INTO grocery_products (grocery_store_id, category_id, name, description, image_url, unit, mrp, selling_price, stock_qty, is_available)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,true)) RETURNING *`,
    [storeId, d.categoryId || null, d.name, d.description || null, d.imageUrl || null, d.unit, d.mrp, d.sellingPrice, d.stockQty, d.isAvailable],
  );
  return NextResponse.json({ product: rows[0] }, { status: 201 });
});

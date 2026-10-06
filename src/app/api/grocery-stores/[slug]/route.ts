import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/http";

export const GET = apiHandler(async (_req, ctx?: { params: Promise<{ slug: string }> }) => {
  const { slug } = (await ctx!.params);
  const { rows: storeRows } = await pool.query(
    `SELECT id, name, slug, description, image_url, cover_url, address, rating_avg, rating_count,
            delivery_time_min, delivery_fee, min_order, is_open
     FROM grocery_stores WHERE slug = $1 AND approval_status = 'APPROVED' AND is_active = true`,
    [slug],
  );
  const store = storeRows[0];
  if (!store) throw new HttpError(404, "Store not found.");

  const { rows: products } = await pool.query(
    `SELECT p.id, p.name, p.description, p.image_url, p.unit, p.mrp, p.selling_price, p.stock_qty, p.is_available,
            c.id AS category_id, c.name AS category_name, c.sort_order
     FROM grocery_products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.grocery_store_id = $1
     ORDER BY c.sort_order NULLS LAST, p.name`,
    [store.id],
  );

  const catalog = new Map<string, { id: string | null; name: string; products: unknown[] }>();
  for (const pr of products) {
    const key = pr.category_id ?? "uncategorized";
    if (!catalog.has(key)) catalog.set(key, { id: pr.category_id, name: pr.category_name ?? "Other", products: [] });
    catalog.get(key)!.products.push({
      id: pr.id, name: pr.name, description: pr.description, imageUrl: pr.image_url, unit: pr.unit,
      mrp: pr.mrp, sellingPrice: pr.selling_price, inStock: pr.stock_qty > 0, isAvailable: pr.is_available && pr.stock_qty > 0,
    });
  }
  return NextResponse.json({ store, catalog: Array.from(catalog.values()) });
});

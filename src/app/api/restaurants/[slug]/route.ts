import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { HttpError, apiHandlerWithParams } from "@/lib/http";

export const GET = apiHandlerWithParams<{ params: Promise<{ slug: string }> }>(async (_req, ctx) => {
  const { slug } = (await ctx.params);
  const { rows: restRows } = await pool.query(
    `SELECT id, name, slug, description, image_url, cover_url, address, rating_avg, rating_count,
            delivery_time_min, delivery_fee, min_order, is_veg_only, is_open
     FROM restaurants WHERE slug = $1 AND approval_status = 'APPROVED' AND is_active = true`,
    [slug],
  );
  const restaurant = restRows[0];
  if (!restaurant) throw new HttpError(404, "Restaurant not found.");

  const { rows: items } = await pool.query(
    `SELECT f.id, f.name, f.description, f.image_url, f.price, f.is_veg, f.is_available,
            c.id AS category_id, c.name AS category_name, c.sort_order
     FROM food_items f LEFT JOIN categories c ON c.id = f.category_id
     WHERE f.restaurant_id = $1
     ORDER BY c.sort_order NULLS LAST, f.name`,
    [restaurant.id],
  );

  const menu = new Map<string, { id: string | null; name: string; items: unknown[] }>();
  for (const it of items) {
    const key = it.category_id ?? "uncategorized";
    if (!menu.has(key)) menu.set(key, { id: it.category_id, name: it.category_name ?? "Other", items: [] });
    menu.get(key)!.items.push({ id: it.id, name: it.name, description: it.description, imageUrl: it.image_url, price: it.price, isVeg: it.is_veg, isAvailable: it.is_available });
  }
  return NextResponse.json({ restaurant, menu: Array.from(menu.values()) });
});

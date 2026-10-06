import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { apiHandler, HttpError } from "@/lib/http";

export const GET = apiHandler(async (req) => {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) throw new HttpError(400, "Please enter at least 2 characters to search.");
  const like = `%${q}%`;

  const [restaurants, stores, foodItems, groceryProducts] = await Promise.all([
    pool.query(`SELECT id, name, slug, image_url FROM restaurants WHERE approval_status='APPROVED' AND is_active AND name ILIKE $1 LIMIT 10`, [like]),
    pool.query(`SELECT id, name, slug, image_url FROM grocery_stores WHERE approval_status='APPROVED' AND is_active AND name ILIKE $1 LIMIT 10`, [like]),
    pool.query(
      `SELECT f.id, f.name, f.price, f.image_url, r.slug AS restaurant_slug, r.name AS restaurant_name
       FROM food_items f JOIN restaurants r ON r.id = f.restaurant_id
       WHERE f.is_available AND r.approval_status='APPROVED' AND r.is_active AND f.name ILIKE $1 LIMIT 15`, [like]),
    pool.query(
      `SELECT p.id, p.name, p.selling_price, p.image_url, s.slug AS store_slug, s.name AS store_name
       FROM grocery_products p JOIN grocery_stores s ON s.id = p.grocery_store_id
       WHERE p.is_available AND p.stock_qty > 0 AND s.approval_status='APPROVED' AND s.is_active AND p.name ILIKE $1 LIMIT 15`, [like]),
  ]);

  return NextResponse.json({
    restaurants: restaurants.rows, stores: stores.rows,
    foodItems: foodItems.rows, groceryProducts: groceryProducts.rows,
  });
});

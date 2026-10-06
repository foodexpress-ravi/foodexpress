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
  price: z.number().min(0),
  isVeg: z.boolean(),
  isAvailable: z.boolean().optional(),
});

async function myRestaurantId(userId: string) {
  const { rows } = await pool.query(`SELECT id FROM restaurants WHERE owner_id = $1`, [userId]);
  if (!rows[0]) throw new HttpError(404, "Please create your restaurant profile first.");
  return rows[0].id;
}

export const GET = apiHandler(async () => {
  const user = await requireRole("RESTAURANT_OWNER");
  const restaurantId = await myRestaurantId(user.id);
  const { rows } = await pool.query(
    `SELECT f.*, c.name AS category_name FROM food_items f LEFT JOIN categories c ON c.id = f.category_id
     WHERE f.restaurant_id = $1 ORDER BY f.created_at DESC`,
    [restaurantId],
  );
  return NextResponse.json({ items: rows });
});

export const POST = apiHandler(async (req) => {
  const user = await requireRole("RESTAURANT_OWNER");
  const restaurantId = await myRestaurantId(user.id);
  const d = schema.parse(await readJson(req));
  const { rows } = await pool.query(
    `INSERT INTO food_items (restaurant_id, category_id, name, description, image_url, price, is_veg, is_available)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,true)) RETURNING *`,
    [restaurantId, d.categoryId || null, d.name, d.description || null, d.imageUrl || null, d.price, d.isVeg, d.isAvailable],
  );
  return NextResponse.json({ item: rows[0] }, { status: 201 });
});
